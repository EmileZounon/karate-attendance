import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, collection, onSnapshot, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DOC_REF = doc(db, 'attendance-data', 'main');
const BACKUPS_COL = collection(db, 'attendance-data', 'main', 'backups');
const BACKUP_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes between backups

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

  // Track pending writes to prevent onSnapshot from overwriting local state
  const pendingWrites = useRef(0);
  // Throttle backups to once per 5 minutes
  const lastBackupTime = useRef(0);

  // Create an automatic backup before writing (throttled)
  const createBackup = useCallback(async (currentData) => {
    const now = Date.now();
    if (now - lastBackupTime.current < BACKUP_THROTTLE_MS) return;
    lastBackupTime.current = now;
    try {
      await addDoc(BACKUPS_COL, {
        ...currentData,
        backupAt: new Date().toISOString(),
        timestamp: now,
      });
    } catch (err) {
      console.error('Backup error:', err);
    }
  }, []);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      DOC_REF,
      (snapshot) => {
        if (snapshot.exists()) {
          // Skip if we have pending local writes — our state is already ahead
          if (pendingWrites.current > 0) {
            setLoading(false);
            return;
          }
          const firestoreData = snapshot.data();
          setData(firestoreData);
          // Cache locally for offline/fast startup
          localStorage.setItem('karate-attendance-data', JSON.stringify(firestoreData));
        } else {
          // Document doesn't exist — only write defaults if we have no real data
          // (prevents wiping real data if Firestore has a transient issue)
          const hasLocalData = localStorage.getItem('karate-attendance-data');
          if (!hasLocalData) {
            setDoc(DOC_REF, defaultValue);
          } else {
            // Re-upload localStorage data to restore the document
            try {
              const localData = JSON.parse(hasLocalData);
              setDoc(DOC_REF, localData);
              setData(localData);
            } catch {
              setDoc(DOC_REF, defaultValue);
            }
          }
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

      // Auto-backup the current state before writing
      createBackup(prev);

      // Track this write so onSnapshot doesn't overwrite us
      pendingWrites.current++;
      setDoc(DOC_REF, next)
        .then(() => {
          pendingWrites.current--;
        })
        .catch((err) => {
          pendingWrites.current--;
          console.error('Firestore write error:', err);
          setError(err);
        });

      // Also cache locally
      localStorage.setItem('karate-attendance-data', JSON.stringify(next));
      return next;
    });
  }, [createBackup]);

  return [data, updateData, loading, error];
}
