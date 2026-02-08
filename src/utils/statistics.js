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
