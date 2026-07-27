// Pure builder for recording a class day from a list of present students.
// Returns a NEW attendance object: only the given date changes, every other
// date is carried over untouched.
//
// Default (merge) — a paste can only ever ADD attendance. Pasted names get 1,
// anyone already marked for that date keeps their mark, and only students with
// no mark yet get 0. This is what lets a late arrival be pasted on their own
// without un-marking the students already recorded present.
//
// { replace: true } — rebuild the day from scratch: pasted names get 1 and
// every other roster student gets 0. The escape hatch for a wrong list.
//
// On a day with no marks yet both modes agree: present get 1, everyone else 0.
//
// `presentNames` are expected to be exact roster spellings (the caller resolves
// case-insensitive matches before calling this).

export function buildAttendanceUpdate(date, attendance, presentNames, allStudents, { replace = false } = {}) {
  const present = new Set(presentNames);
  const day = replace ? {} : { ...(attendance[date] || {}) };
  for (const student of allStudents) {
    if (present.has(student)) day[student] = 1;
    else if (!(student in day)) day[student] = 0;
  }
  return { ...attendance, [date]: day };
}
