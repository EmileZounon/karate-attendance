import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc, collection, onSnapshot, setDoc, getDocs, addDoc,
  query, orderBy, limit, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// Main document stores students + metadata
const MAIN_DOC = doc(db, 'attendance-data', 'main');
// Subcollection: one document per month (e.g., "2026-01")
const MONTHS_COL = collection(db, 'attendance-data', 'main', 'months');
// Subcollection: automatic backups
const BACKUPS_COL = collection(db, 'attendance-data', 'main', 'backups');

// Group attendance by month key (e.g., "2026-01")
function groupByMonth(attendance) {
  const months = {};
  for (const [date, records] of Object.entries(attendance)) {
    const monthKey = date.substring(0, 7); // "2026-01"
    if (!months[monthKey]) months[monthKey] = {};
    months[monthKey][date] = records;
  }
  return months;
}

// Flatten monthly docs back into a single attendance object
function flattenMonths(monthDocs) {
  const attendance = {};
  for (const monthData of Object.values(monthDocs)) {
    for (const [date, records] of Object.entries(monthData)) {
      if (date === '_monthKey') continue; // skip metadata field
      attendance[date] = records;
    }
  }
  return attendance;
}

export function useFirestore(defaultValue) {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('karate-attendance-data');
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastBackupRef = useRef(null);

  // Subscribe to main doc (students + metadata) and monthly subcollection
  useEffect(() => {
    let mainData = null;
    let monthsData = {};
    let mainLoaded = false;
    let monthsLoaded = false;

    const mergeAndSet = () => {
      if (!mainLoaded || !monthsLoaded) return;
      const attendance = flattenMonths(monthsData);
      const merged = {
        students: mainData.students || defaultValue.students,
        attendance,
        savedAt: mainData.savedAt || new Date().toISOString(),
      };
      setData(merged);
      localStorage.setItem('karate-attendance-data', JSON.stringify(merged));
      setLoading(false);
    };

    // Listen to main document (students list)
    const unsubMain = onSnapshot(
      MAIN_DOC,
      (snapshot) => {
        if (snapshot.exists()) {
          mainData = snapshot.data();
        } else {
          // First time: initialize main doc with students
          mainData = {
            students: defaultValue.students,
            savedAt: new Date().toISOString(),
          };
          setDoc(MAIN_DOC, mainData);
          // Also write default attendance as monthly subcollections
          const grouped = groupByMonth(defaultValue.attendance);
          for (const [monthKey, monthAtt] of Object.entries(grouped)) {
            setDoc(doc(MONTHS_COL, monthKey), { ...monthAtt, _monthKey: monthKey });
          }
        }
        mainLoaded = true;
        mergeAndSet();
      },
      (err) => {
        console.error('Firestore main doc error:', err);
        setError(err);
        setLoading(false);
      }
    );

    // Listen to monthly subcollection
    const unsubMonths = onSnapshot(
      MONTHS_COL,
      (snapshot) => {
        monthsData = {};
        snapshot.forEach((doc) => {
          const docData = doc.data();
          monthsData[doc.id] = docData;
        });
        monthsLoaded = true;
        mergeAndSet();
      },
      (err) => {
        console.error('Firestore months error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubMain();
      unsubMonths();
    };
  }, []);

  // Create an automatic backup (max once per 5 minutes)
  const createBackup = useCallback(async (currentData) => {
    const now = Date.now();
    if (lastBackupRef.current && now - lastBackupRef.current < 5 * 60 * 1000) return;
    lastBackupRef.current = now;

    try {
      await addDoc(BACKUPS_COL, {
        students: currentData.students,
        attendance: currentData.attendance,
        savedAt: currentData.savedAt,
        backupAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error('Backup error:', err);
    }
  }, []);

  // Write updates: students go to main doc, attendance goes to monthly subcollections
  const updateData = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      // Auto-backup before writing
      createBackup(prev);

      // Write students + metadata to main doc
      setDoc(MAIN_DOC, {
        students: next.students,
        savedAt: next.savedAt,
      }).catch((err) => {
        console.error('Firestore main write error:', err);
        setError(err);
      });

      // Find which months changed and write only those
      const prevGrouped = groupByMonth(prev.attendance || {});
      const nextGrouped = groupByMonth(next.attendance || {});

      const allMonthKeys = new Set([
        ...Object.keys(prevGrouped),
        ...Object.keys(nextGrouped),
      ]);

      for (const monthKey of allMonthKeys) {
        const prevMonth = JSON.stringify(prevGrouped[monthKey] || {});
        const nextMonth = JSON.stringify(nextGrouped[monthKey] || {});
        if (prevMonth !== nextMonth) {
          const monthData = nextGrouped[monthKey] || {};
          setDoc(doc(MONTHS_COL, monthKey), { ...monthData, _monthKey: monthKey }).catch((err) => {
            console.error(`Firestore month ${monthKey} write error:`, err);
            setError(err);
          });
        }
      }

      // Cache locally
      localStorage.setItem('karate-attendance-data', JSON.stringify(next));
      return next;
    });
  }, [createBackup]);

  return [data, updateData, loading, error];
}

// Utility: get recent backups (for restore UI)
export async function getBackups(maxCount = 20) {
  const q = query(BACKUPS_COL, orderBy('timestamp', 'desc'), limit(maxCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
