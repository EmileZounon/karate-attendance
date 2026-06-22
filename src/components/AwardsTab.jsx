import { useMemo, useState } from 'react';
import { generateDates, getMonthLabel, getMonthKey } from '../utils/dateUtils';
import {
  getClassesHeld,
  getMonthlyPodium,
  calculateStudentStats,
} from '../utils/statistics';

const MEDALS = ['🥇', '🥈', '🥉'];

// One award row: medal + name + right-aligned detail.
function AwardRow({ medal, name, detail, last, gold }) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${last ? '' : 'border-b border-line'}`}
    >
      <span className="text-lg leading-none">{medal}</span>
      <span className={`flex-1 ${gold ? 'text-gold font-semibold' : 'text-gi'}`}>
        {name}
      </span>
      <span className="text-gidim text-sm whitespace-nowrap">{detail}</span>
    </div>
  );
}

export default function AwardsTab({ students, attendance }) {
  const dates = useMemo(() => generateDates(), []);

  // Available months = unique month keys over classes actually held, sorted.
  const months = useMemo(() => {
    const held = getClassesHeld(dates, attendance);
    return [...new Set(held.map(getMonthKey))].sort();
  }, [dates, attendance]);

  // Default the selected month to the latest available.
  const latestMonth = months.length ? months[months.length - 1] : '';
  const [selectedMonth, setSelectedMonth] = useState(latestMonth);

  // Keep selection valid if data changes and the picked month disappears.
  const activeMonth = months.includes(selectedMonth) ? selectedMonth : latestMonth;

  const monthlyPodium = useMemo(
    () =>
      activeMonth
        ? getMonthlyPodium(students, dates, attendance, activeMonth)
        : [],
    [students, dates, attendance, activeMonth]
  );

  const allTimePodium = useMemo(
    () => calculateStudentStats(students, dates, attendance).slice(0, 3),
    [students, dates, attendance]
  );

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-serif font-bold text-gi">Awards</h2>
          <span className="font-serif text-gold/80 text-xl" aria-hidden="true">賞</span>
        </div>
        <p className="text-gidim mt-1">Who showed up the most</p>
        <span className="dojo-brush mt-2" />
      </header>

      {months.length === 0 ? (
        <div className="dojo-card p-6 text-center text-gidim">
          No classes recorded yet. Awards appear once attendance is in.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Month selector */}
          <div>
            <label htmlFor="award-month" className="sr-only">
              Month
            </label>
            <select
              id="award-month"
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-sumi3 border border-line2 text-gi rounded-lg px-3 py-2"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {getMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly podium */}
          <section className="dojo-card p-4">
            <h3 className="font-serif text-gi mb-2">
              Monthly award · {getMonthLabel(activeMonth)}
            </h3>
            {monthlyPodium.length === 0 ? (
              <p className="text-gifaint text-sm py-2">
                No one logged a class this month yet.
              </p>
            ) : (
              monthlyPodium.map((r, i) => (
                <AwardRow
                  key={r.name}
                  medal={MEDALS[i]}
                  name={r.name}
                  detail={`${r.attended} classes`}
                  last={i === monthlyPodium.length - 1}
                  gold={i === 0}
                />
              ))
            )}
          </section>

          {/* All-time podium */}
          <section className="dojo-card p-4">
            <h3 className="font-serif text-gi mb-2">All-time</h3>
            {allTimePodium.length === 0 ? (
              <p className="text-gifaint text-sm py-2">No students yet.</p>
            ) : (
              allTimePodium.map((r, i) => (
                <AwardRow
                  key={r.name}
                  medal={MEDALS[i]}
                  name={r.name}
                  detail={`${r.attended} classes · ${r.percentage}%`}
                  last={i === allTimePodium.length - 1}
                  gold={i === 0}
                />
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
}
