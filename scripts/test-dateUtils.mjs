// Standalone test for date labels in both languages.
// Run: node scripts/test-dateUtils.mjs
import { formatDate, getMonth, getMonthLabel, generateDates } from '../src/utils/dateUtils.js';

let passed = 0;
let failed = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}\n       expected ${e}\n       got      ${a}`); }
}

console.log('English (default, used by the Excel export):');
eq(formatDate('2026-09-03'), 'Thu 3/9', 'formatDate default');
eq(formatDate('2026-09-03', 'en'), 'Thu 3/9', 'formatDate en');
eq(getMonth('2026-09-03'), 'September', 'getMonth default');
eq(getMonthLabel('2026-09'), 'September 2026', 'getMonthLabel default');

console.log('Japanese:');
eq(formatDate('2026-09-03', 'ja'), '9/3（木）', 'Thursday');
eq(formatDate('2026-09-06', 'ja'), '9/6（日）', 'Sunday');
eq(formatDate('2026-09-01', 'ja'), '9/1（火）', 'Tuesday');
eq(formatDate('2026-12-31', 'ja'), '12/31（木）', 'two-digit month and day');
eq(getMonth('2026-09-03', 'ja'), '9月', 'getMonth ja');
eq(getMonthLabel('2026-09', 'ja'), '2026年9月', 'getMonthLabel ja');
eq(getMonthLabel('2026-12', 'ja'), '2026年12月', 'getMonthLabel ja December');

console.log('Unknown language falls back to English:');
eq(formatDate('2026-09-03', 'fr'), 'Thu 3/9', 'formatDate fr');
eq(getMonthLabel('2026-09', 'fr'), 'September 2026', 'getMonthLabel fr');

console.log('Calendar untouched:');
{
  const d = generateDates();
  eq([d[0], d[d.length - 1], d.length], ['2026-01-04', '2026-12-31', 139], 'Jan 4 to Dec 31, 139 class days');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
