// Generate all Thursday and Sunday dates for Jan-Jun 2026
export const generateDates = () => {
  const dates = [];
  for (let month = 0; month <= 5; month++) {
    for (let day = 1; day <= 31; day++) {
      const d = new Date(2026, month, day);
      if (d.getMonth() !== month) break;
      // Thursday = 4, Sunday = 0
      if (d.getDay() === 4 || d.getDay() === 0) {
        const dateStr = `2026-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push(dateStr);
      }
    }
  }
  return dates;
};

// Format date for display: "Thu 1/4" or "Sun 1/11"
export const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[d.getDay()];
  return `${day} ${d.getDate()}/${d.getMonth() + 1}`;
};

// Get month name from date string
export const getMonth = (dateStr) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIndex = parseInt(dateStr.split('-')[1]) - 1;
  return months[monthIndex];
};

// Get month key (e.g., "2026-01") from date string
export const getMonthKey = (dateStr) => dateStr.substring(0, 7);

// Get unique months from dates array
export const getUniqueMonths = (dates) => {
  const monthKeys = [...new Set(dates.map(getMonthKey))];
  return monthKeys.sort();
};

// Get month label from month key (e.g., "2026-01" -> "January 2026")
export const getMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
};
