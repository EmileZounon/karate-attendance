// Extra practice dates (not on regular Thu/Sun schedule)
const EXTRA_DATES = [
  '2026-04-04', // Sat — extra practice
  '2026-05-08', // Fri — Jerry Sensei visit practice
  '2026-05-09', // Sat — Jerry Sensei visit practice
];

// Tuesday classes were added to the schedule starting this date (summer 2026).
const TUESDAY_START = '2026-05-26';

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

// Generate regular class dates for Jan–Dec 2026: Thursdays + Sundays all year,
// plus Tuesdays from 2026-05-26 onward (summer), plus one-off extra practices.
export const generateDates = () => {
  const dates = [];
  for (let month = 0; month <= 11; month++) {
    for (let day = 1; day <= 31; day++) {
      const d = new Date(2026, month, day);
      if (d.getMonth() !== month) break;
      const dateStr = `2026-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // Thursday = 4, Sunday = 0, Tuesday = 2 (from TUESDAY_START), or an extra date
      const isThu = d.getDay() === 4;
      const isSun = d.getDay() === 0;
      const isTue = d.getDay() === 2 && dateStr >= TUESDAY_START;
      if (isThu || isSun || isTue || EXTRA_DATES.includes(dateStr)) {
        // Skip Jan 1 (New Year's Day - no class)
        if (month === 0 && day === 1) continue;
        dates.push(dateStr);
      }
    }
  }
  return dates;
};

// Format date for display. en: "Thu 3/9" (day/month). ja: "9/3（木）" (month/day,
// the order Japanese readers expect). Unknown lang falls back to English.
export const formatDate = (dateStr, lang = 'en') => {
  const d = new Date(dateStr + 'T12:00:00');
  if (lang === 'ja') return `${d.getMonth() + 1}/${d.getDate()}（${DAYS_JA[d.getDay()]}）`;
  return `${DAYS_EN[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};

// Month name from date string. en: "September". ja: "9月".
export const getMonth = (dateStr, lang = 'en') => {
  const monthIndex = parseInt(dateStr.split('-')[1]) - 1;
  if (lang === 'ja') return `${monthIndex + 1}月`;
  return MONTHS_EN[monthIndex];
};

// Get month key (e.g., "2026-01") from date string
export const getMonthKey = (dateStr) => dateStr.substring(0, 7);

// Get unique months from dates array
export const getUniqueMonths = (dates) => {
  const monthKeys = [...new Set(dates.map(getMonthKey))];
  return monthKeys.sort();
};

// Month label from month key. en: "2026-09" -> "September 2026". ja: "2026年9月".
export const getMonthLabel = (monthKey, lang = 'en') => {
  const [year, month] = monthKey.split('-');
  if (lang === 'ja') return `${year}年${parseInt(month)}月`;
  return `${MONTHS_EN[parseInt(month) - 1]} ${year}`;
};
