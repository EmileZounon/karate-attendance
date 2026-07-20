import { useMemo } from 'react';
import { generateDates, formatDate } from '../utils/dateUtils';
import {
  getProgramSnapshot,
  calculateStreaks,
  calculateStudentStats,
} from '../utils/statistics';

// "Today" home/landing screen — Dojo (Direction 01 · 道場) visual style.
export default function TodayTab({ students = [], attendance = {}, onTakeAttendance }) {
  const dates = useMemo(() => generateDates(), []);

  const snapshot = useMemo(
    () => getProgramSnapshot(dates, attendance),
    [dates, attendance]
  );
  const streaks = useMemo(
    () => calculateStreaks(students, dates, attendance),
    [students, dates, attendance]
  );
  const stats = useMemo(
    () => calculateStudentStats(students, dates, attendance),
    [students, dates, attendance]
  );

  // Local YYYY-MM-DD for "today"
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }, []);

  // Next class = first scheduled date >= today, else fall back to last class held.
  const nextClass = useMemo(() => {
    const upcoming = dates.find((d) => d >= todayStr);
    return upcoming || snapshot.lastClass;
  }, [dates, todayStr, snapshot.lastClass]);

  const lastClass = snapshot.lastClass;
  const hasData = !!lastClass;

  // Top streaker (sorted desc by currentStreak), only celebrate streaks >= 2.
  const topStreaker = streaks[0];
  const showStreak = topStreaker && topStreaker.currentStreak >= 2;

  // Regulars = students attending >= 60% of classes.
  const regulars = useMemo(
    () => stats.filter((s) => s.percentage >= 60),
    [stats]
  );
  const firstThree = regulars.slice(0, 3);
  const moreRegulars = Math.max(0, regulars.length - 3);

  // Eyebrow weekday/date from nextClass.
  const eyebrowDate = nextClass ? formatDate(nextClass) : '—';

  return (
    <div className="max-w-md mx-auto px-1">
      {/* 1 · Eyebrow */}
      <div className="font-serif text-sm text-gidim flex items-baseline gap-2 mb-1 tracking-wide">
        <span className="text-hinomaru text-base">今日</span>
        <span>
          {eyebrowDate} · Class {snapshot.classesHeld}
        </span>
      </div>

      {/* 2 · Title */}
      <h1 className="font-serif text-gi text-5xl leading-none mb-1">Today</h1>
      <span className="dojo-brush mb-5" />

      {/* 3 · Primary CTA */}
      <button
        type="button"
        onClick={onTakeAttendance}
        className="dojo-cta w-full py-4 text-base mt-4 mb-4"
      >
        {nextClass
          ? `Take attendance · ${formatDate(nextClass)}`
          : 'Take attendance'}
      </button>

      {/* 4 · Last class recap */}
      {hasData ? (
        <div className="dojo-card p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-serif text-gi text-base">
                Last class · {formatDate(lastClass)}
              </div>
              <div className="text-gidim text-sm mt-0.5">
                {snapshot.lastPresent} present
                {showStreak && (
                  <>
                    {' · '}
                    {topStreaker.name}, {topStreaker.currentStreak} consecutive classes
                  </>
                )}
              </div>
            </div>
            <div className="font-serif text-gold text-4xl leading-none flex-shrink-0">
              {snapshot.lastPresent}
            </div>
          </div>
        </div>
      ) : (
        <div className="dojo-card p-4 mb-3">
          <div className="font-serif text-gi text-base">No classes recorded yet</div>
          <div className="text-gidim text-sm mt-0.5">
            Take your first attendance to start the record.
          </div>
        </div>
      )}

      {/* 5 · Expected today */}
      <div className="dojo-card p-4">
        <div className="text-gidim text-sm mb-2">Expected today</div>
        {hasData && firstThree.length > 0 ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-hinomaru text-white grid place-items-center font-bold flex-shrink-0">
              {(firstThree[0].name[0] || '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gi truncate">
                {firstThree.map((s) => s.name).join(' · ')}
              </div>
              {moreRegulars > 0 && (
                <div className="text-gidim text-sm mt-0.5">and {moreRegulars} more regular attendees</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gidim text-sm">
            No regular attendees yet. Record a few classes to populate this list.
          </div>
        )}
      </div>
    </div>
  );
}
