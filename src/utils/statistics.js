import { getMonthKey, getMonthLabel } from './dateUtils';

// Get dates that actually have attendance data recorded
export const getClassesHeld = (dates, attendance) => {
  return dates.filter(date => {
    const dayData = attendance[date] || {};
    return Object.values(dayData).some(v => v === 1);
  });
};

// Calculate per-student statistics ranked by attendance
export const calculateStudentStats = (students, dates, attendance) => {
  const classesHeld = getClassesHeld(dates, attendance);
  const totalClasses = classesHeld.length;

  const stats = students.map(student => {
    let attended = 0;
    classesHeld.forEach(date => {
      if (attendance[date]?.[student] === 1) attended++;
    });
    return {
      name: student,
      attended,
      total: totalClasses,
      percentage: totalClasses > 0
        ? parseFloat((attended / totalClasses * 100).toFixed(1))
        : 0
    };
  });

  return stats.sort((a, b) => b.attended - a.attended || a.name.localeCompare(b.name));
};

// Calculate monthly summary: total attendance, classes held, avg per class
export const calculateMonthlySummary = (dates, attendance) => {
  const classesHeld = getClassesHeld(dates, attendance);
  const monthMap = {};

  classesHeld.forEach(date => {
    const monthKey = getMonthKey(date);
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { classes: 0, totalAttendance: 0 };
    }
    monthMap[monthKey].classes++;
    const dayData = attendance[date] || {};
    monthMap[monthKey].totalAttendance += Object.values(dayData).filter(v => v === 1).length;
  });

  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, data]) => ({
      month: getMonthLabel(monthKey),
      monthKey,
      classesHeld: data.classes,
      totalAttendance: data.totalAttendance,
      avgPerClass: data.classes > 0
        ? parseFloat((data.totalAttendance / data.classes).toFixed(1))
        : 0
    }));
};

// Calculate per-student per-month attendance breakdown
export const calculateStudentMonthly = (students, dates, attendance) => {
  const classesHeld = getClassesHeld(dates, attendance);
  const months = [...new Set(classesHeld.map(getMonthKey))].sort();

  return students.map(student => {
    const monthData = {};
    months.forEach(monthKey => {
      const monthDates = classesHeld.filter(d => getMonthKey(d) === monthKey);
      const attended = monthDates.filter(d => attendance[d]?.[student] === 1).length;
      monthData[monthKey] = { attended, total: monthDates.length };
    });
    return { name: student, months: monthData };
  });
};

// Calculate current and longest attendance streaks per student
export const calculateStreaks = (students, dates, attendance) => {
  const classesHeld = getClassesHeld(dates, attendance).sort();

  return students.map(student => {
    // Longest streak: single forward pass
    let longestStreak = 0;
    let tempStreak = 0;
    for (const date of classesHeld) {
      if (attendance[date]?.[student] === 1) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Current streak: count consecutive presences from the most recent class backwards
    let currentStreak = 0;
    for (let i = classesHeld.length - 1; i >= 0; i--) {
      if (attendance[classesHeld[i]]?.[student] === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    return { name: student, currentStreak, longestStreak };
  }).sort((a, b) => b.currentStreak - a.currentStreak || b.longestStreak - a.longestStreak);
};

// Count present students for a given date
export const countPresent = (date, attendance) => {
  const dayData = attendance[date] || {};
  return Object.values(dayData).filter(v => v === 1).length;
};

// Get percentage CSS class
export const getPctClass = (pct) => {
  if (pct >= 75) return 'pct-high';
  if (pct >= 50) return 'pct-mid';
  return 'pct-low';
};

// ── Black belt camp eligibility (Dojo experience) ──────────────────
// Rule: share of all recorded classes attended.
//   Ready >= 85%, Close 70–84%, Not yet < 70%.
export const ELIGIBILITY = { ready: 85, close: 70 };

export const eligibilityStatus = (pct) => {
  if (pct >= ELIGIBILITY.ready) return 'Ready';
  if (pct >= ELIGIBILITY.close) return 'Close';
  return 'Not yet';
};

// Per-student eligibility, ranked by attendance %.
// Returns [{ name, attended, total, percentage, status }]
export const calculateEligibility = (students, dates, attendance) => {
  return calculateStudentStats(students, dates, attendance)
    .map(s => ({ ...s, status: eligibilityStatus(s.percentage) }))
    .sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name));
};

// Top 3 attenders for a given month key (e.g. "2026-06").
// Returns [{ name, attended, total }] (medal order).
export const getMonthlyPodium = (students, dates, attendance, monthKey) => {
  const held = getClassesHeld(dates, attendance).filter(d => getMonthKey(d) === monthKey);
  return students
    .map(s => ({
      name: s,
      attended: held.filter(d => attendance[d]?.[s] === 1).length,
      total: held.length,
    }))
    .filter(r => r.attended > 0)
    .sort((a, b) => b.attended - a.attended || a.name.localeCompare(b.name))
    .slice(0, 3);
};

// Program snapshot for the Today landing.
// Returns { classesHeld, lastClass, lastPresent }
export const getProgramSnapshot = (dates, attendance) => {
  const held = getClassesHeld(dates, attendance).slice().sort();
  const lastClass = held[held.length - 1] || null;
  return {
    classesHeld: held.length,
    lastClass,
    lastPresent: lastClass ? countPresent(lastClass, attendance) : 0,
  };
};
