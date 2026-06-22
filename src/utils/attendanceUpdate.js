// Pure builder for recording a full class day from a list of present students.
// Returns a NEW attendance object: only the given date is rebuilt, every other
// date is carried over untouched. Present students get 1, everyone else 0.
//
// `presentNames` are expected to be exact roster spellings (the caller resolves
// case-insensitive matches before calling this).

export function buildAttendanceUpdate(date, attendance, presentNames, allStudents) {
  const present = new Set(presentNames);
  const day = {};
  for (const student of allStudents) {
    day[student] = present.has(student) ? 1 : 0;
  }
  return { ...attendance, [date]: day };
}
