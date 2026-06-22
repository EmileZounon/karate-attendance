import { useMemo } from 'react';
import { generateDates } from '../utils/dateUtils';
import { calculateStudentStats } from '../utils/statistics';
import { GRADING_DATE, grading2026 } from '../data/grading2026';

// Highest celebration first: the new black belts, then the new sandan-level
// instructors. Each rank carries its kanji and a short plain-English label.
const RANKS = [
  { key: 'shodan',      kanji: '初段', title: 'Shodan',                  label: 'New 1st-degree black belts', accent: 'gold' },
  { key: 'nidan',       kanji: '弐段', title: 'Nidan',                   label: 'New 2nd-degree black belts', accent: 'gold' },
  { key: 'instructors', kanji: '師範', title: 'JKA instructors & judges', label: 'Newly licensed by the JKA',  accent: 'indigo' },
];

export default function GradingTab({ students = [], attendance = {} }) {
  const dates = useMemo(() => generateDates(), []);

  // Attendance % per student, to show graduates earned it on the mat.
  const pctByName = useMemo(() => {
    const map = {};
    calculateStudentStats(students, dates, attendance).forEach(s => { map[s.name] = s.percentage; });
    return map;
  }, [students, dates, attendance]);

  return (
    <div className="max-w-md mx-auto">
      <header className="mb-6">
        <div className="font-serif text-xs tracking-[0.16em] uppercase text-gidim">昇段 · Grading</div>
        <h2 className="font-serif text-2xl text-gi mt-1">Grading 2026</h2>
        <p className="text-sm text-gidim mt-0.5">JKA · {GRADING_DATE}</p>
        <span className="dojo-brush mt-3" />
      </header>

      {RANKS.map(rank => {
        const names = grading2026[rank.key] || [];
        if (!names.length) return null;
        const isGold = rank.accent === 'gold';
        return (
          <section key={rank.key} className="mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`font-serif text-lg ${isGold ? 'text-gold' : 'text-indigosoft'}`}>{rank.kanji}</span>
              <h3 className="font-serif text-lg text-gi">{rank.title}</h3>
              <span className="text-xs text-gifaint ml-auto text-right">{rank.label}</span>
            </div>
            <div className="dojo-card divide-y divide-line">
              {names.map(name => {
                const pct = pctByName[name];
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <div key={name} className="flex items-center gap-3 p-3">
                    <div className={`w-9 h-9 rounded-lg grid place-items-center font-bold text-sm flex-shrink-0 ${isGold ? 'bg-gold text-sumi' : 'bg-indigoink text-white'}`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gi font-medium truncate">{name}</div>
                      {pct != null && (
                        <div className="text-xs text-gifaint">{pct}% attendance this year</div>
                      )}
                    </div>
                    <span className="text-lg flex-shrink-0" aria-hidden="true">🥋</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="text-center mt-8">
        <span className="dojo-brush mx-auto mb-3" />
        <p className="text-sm text-gifaint">押忍 · congratulations to every grade</p>
      </div>
    </div>
  );
}
