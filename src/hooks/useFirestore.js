import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DOC_REF = doc(db, 'attendance-data', 'main');

export function useFirestore(defaultValue) {
  const [data, setData] = useState(() => {
    // Start with localStorage cache for instant display
    try {
      const saved = localStorage.getItem('karate-attendance-data');
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      DOC_REF,
      (snapshot) => {
        if (snapshot.exists()) {
          const firestoreData = snapshot.data();
          setData(firestoreData);
          // Cache locally for offline/fast startup
          localStorage.setItem('karate-attendance-data', JSON.stringify(firestoreData));
        } else {
          // First time: initialize Firestore with defaults
          setDoc(DOC_REF, defaultValue);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error:', err);
        setError(err);
        setLoading(false);
        // Already using localStorage cache from initial state
      }
    );
    return unsubscribe;
  }, []);

  // Write to Firestore (and localStorage as fallback)
  const updateData = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Write to Firestore — onSnapshot will sync to all clients
      setDoc(DOC_REF, next).catch((err) => {
        console.error('Firestore write error:', err);
        setError(err);
      });
      // Also cache locally
      localStorage.setItem('karate-attendance-data', JSON.stringify(next));
      return next;
    });
  }, []);

  return [data, updateData, loading, error];
}
