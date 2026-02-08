// Student list ordered by attendance rank (from January 2026 report)
export const defaultStudents = [
  "Paul", "Varak", "Bruce", "Julia", "Dmitri", "Emile",
  "Ib", "Amandine", "Cassiano", "Vazrik", "Barkev",
  "Peiqi", "Munawwar", "Angel", "Ewa", "Ricardo"
];

// Exact attendance data from the January 2026 screenshot
// Dates: Thu & Sun classes in January 2026
// Thu 1/1 had no class (New Year's Day)
export const defaultAttendance = {
  // Sun 4/1 - Total: 7
  "2026-01-04": {
    "Paul": 1, "Varak": 1, "Cassiano": 1, "Vazrik": 1,
    "Barkev": 1, "Peiqi": 1, "Angel": 1
  },
  // Thu 8/1 - Total: 7 (Paul marked absent)
  "2026-01-08": {
    "Paul": 0, "Varak": 1, "Ib": 1, "Amandine": 1,
    "Cassiano": 1, "Vazrik": 1, "Peiqi": 1, "Munawwar": 1
  },
  // Sun 11/1 - Total: 10
  "2026-01-11": {
    "Paul": 1, "Varak": 1, "Dmitri": 1, "Emile": 1,
    "Ib": 1, "Amandine": 1, "Cassiano": 1, "Vazrik": 1,
    "Barkev": 1, "Peiqi": 1
  },
  // Thu 15/1 - Total: 10
  "2026-01-15": {
    "Paul": 1, "Varak": 1, "Bruce": 1, "Julia": 1,
    "Dmitri": 1, "Emile": 1, "Ib": 1, "Amandine": 1,
    "Cassiano": 1, "Vazrik": 1
  },
  // Sun 18/1 - Total: 13 (Ricardo marked absent)
  "2026-01-18": {
    "Paul": 1, "Varak": 1, "Bruce": 1, "Julia": 1,
    "Dmitri": 1, "Emile": 1, "Ib": 1, "Amandine": 1,
    "Cassiano": 1, "Vazrik": 1, "Barkev": 1, "Peiqi": 1,
    "Angel": 1, "Ricardo": 0
  },
  // Thu 22/1 - Total: 9
  "2026-01-22": {
    "Varak": 1, "Bruce": 1, "Dmitri": 1, "Emile": 1,
    "Ib": 1, "Amandine": 1, "Cassiano": 1, "Vazrik": 1,
    "Peiqi": 1
  },
  // Sun 25/1 - Total: 11
  "2026-01-25": {
    "Varak": 1, "Bruce": 1, "Emile": 1, "Ib": 1,
    "Amandine": 1, "Cassiano": 1, "Vazrik": 1, "Peiqi": 1,
    "Angel": 1, "Ewa": 1, "Ricardo": 1
  },
  // Thu 29/1 - Total: 8
  "2026-01-29": {
    "Varak": 1, "Bruce": 1, "Emile": 1, "Amandine": 1,
    "Cassiano": 1, "Vazrik": 1, "Peiqi": 1, "Angel": 1
  }
};
