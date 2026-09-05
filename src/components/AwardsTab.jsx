import { useMemo, useState } from 'react';
import { generateDates, getMonthLabel, getMonthKey } from '../utils/dateUtils';
import {
  getClassesHeld,
  getMonthlyPodium,
  calculateStudentStats,
} from '../utils/statistics';
import { useLang } from '../i18n';

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
  const { t, lang } = useLang();
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
          <h2 className="text-2xl font-serif font-bold text-gi">{t('awards.title')}</h2>
          <span className="font-serif text-gold/80 text-xl" aria-hidden="true">賞</span>
        </div>
        <p className="text-gidim mt-1">{t('awards.subtitle')}</p>
        <span className="dojo-brush mt-2" />
      </header>

      {months.length === 0 ? (
        <div className="dojo-card p-6 text-center text-gidim">
          {t('awards.empty')}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Month selector */}
          <div>
            <label htmlFor="award-month" className="sr-only">
              {t('awards.month')}
            </label>
            <select
              id="award-month"
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-sumi3 border border-line2 text-gi rounded-lg px-3 py-2"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {getMonthLabel(m, lang)}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly podium */}
          <section className="dojo-card p-4">
            <h3 className="font-serif text-gi mb-2">
              {t('awards.monthly', { month: getMonthLabel(activeMonth, lang) })}
            </h3>
            {monthlyPodium.length === 0 ? (
              <p className="text-gifaint text-sm py-2">
                {t('awards.noMonth')}
              </p>
            ) : (
              monthlyPodium.map((r, i) => (
                <AwardRow
                  key={r.name}
                  medal={MEDALS[i]}
                  name={r.name}
                  detail={t('awards.classes', { n: r.attended })}
                  last={i === monthlyPodium.length - 1}
                  gold={i === 0}
                />
              ))
            )}
          </section>

          {/* All-time podium */}
          <section className="dojo-card p-4">
            <h3 className="font-serif text-gi mb-2">{t('awards.allTime')}</h3>
            {allTimePodium.length === 0 ? (
              <p className="text-gifaint text-sm py-2">{t('awards.noStudents')}</p>
            ) : (
              allTimePodium.map((r, i) => (
                <AwardRow
                  key={r.name}
                  medal={MEDALS[i]}
                  name={r.name}
                  detail={t('awards.classesPct', { n: r.attended, pct: r.percentage })}
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
