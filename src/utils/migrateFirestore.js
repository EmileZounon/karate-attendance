import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const MAIN_DOC = doc(db, 'attendance-data', 'main');
const MONTHS_COL = collection(db, 'attendance-data', 'main', 'months');

/**
 * One-time migration: moves attendance data from the single main document
 * into monthly subcollections. Safe to run multiple times — it checks
 * whether monthly docs already exist before migrating.
 */
export async function migrateToSubcollections() {
  try {
    // Check if monthly subcollection already has data
    const monthsSnapshot = await getDocs(MONTHS_COL);
    if (!monthsSnapshot.empty) {
      // Already migrated
      return false;
    }

    // Read the old single-document format
    const mainSnapshot = await getDoc(MAIN_DOC);
    if (!mainSnapshot.exists()) return false;

    const data = mainSnapshot.data();
    if (!data.attendance || Object.keys(data.attendance).length === 0) return false;

    // Group attendance by month
    const months = {};
    for (const [date, records] of Object.entries(data.attendance)) {
      const monthKey = date.substring(0, 7);
      if (!months[monthKey]) months[monthKey] = {};
      months[monthKey][date] = records;
    }

    // Write each month as a subcollection document
    const writes = Object.entries(months).map(([monthKey, monthAtt]) =>
      setDoc(doc(MONTHS_COL, monthKey), { ...monthAtt, _monthKey: monthKey })
    );
    await Promise.all(writes);

    // Update main doc to only keep students + metadata (remove attendance)
    await setDoc(MAIN_DOC, {
      students: data.students,
      savedAt: data.savedAt || new Date().toISOString(),
    });

    console.log(`Migrated ${Object.keys(months).length} months to subcollections`);
    return true;
  } catch (err) {
    console.error('Migration error:', err);
    return false;
  }
}
