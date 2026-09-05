import { useMemo, useState } from 'react';
import { generateDates, formatDate, getMonthKey, getMonthLabel } from '../utils/dateUtils';
import { countPresent } from '../utils/statistics';
import PasteAttendance from './PasteAttendance';
import { useLang } from '../i18n';

export default function AttendanceTab({ students, attendance, updateAttendance, updateBoth }) {
  const { t, lang } = useLang();
  const dates = useMemo(() => generateDates(), []);
  const [activeMonth, setActiveMonth] = useState('');

  const monthOptions = useMemo(() => {
    const seen = new Set();
    return dates.reduce((acc, date) => {
      const mk = getMonthKey(date);
      if (!seen.has(mk)) {
        seen.add(mk);
        acc.push({ monthKey: mk, label: getMonthLabel(mk, lang) });
      }
      return acc;
    }, []);
  }, [dates, lang]);

  const visibleDates = useMemo(() =>
    activeMonth ? dates.filter(d => getMonthKey(d) === activeMonth) : dates,
    [dates, activeMonth]
  );

  const toggleAttendance = (date, student) => {
    const newAtt = { ...attendance };
    if (!newAtt[date]) newAtt[date] = {};
    else newAtt[date] = { ...newAtt[date] };
    const current = newAtt[date][student];
    newAtt[date][student] = current === 1 ? 0 : 1;
    updateAttendance(newAtt);
  };

  const getCellClass = (value) => {
    if (value === 1) return 'cell-present';
    if (value === 0) return 'cell-absent';
    return 'cell-empty';
  };

  return (
    <div>
      <PasteAttendance
        students={students}
        attendance={attendance}
        updateBoth={updateBoth}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 no-print">
        <p className="text-sm text-gidim">
          {t('att.clickHint')}
        </p>
        <div className="flex gap-2 items-center">
          <select
            value={activeMonth}
            onChange={e => setActiveMonth(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-sumi3 border border-line2 text-gi focus:border-hinomaru focus:outline-none"
          >
            <option value="">{t('att.allMonths')}</option>
            {monthOptions.map(m => (
              <option key={m.monthKey} value={m.monthKey}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-auto max-h-[75vh] border border-line rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-sumi3 text-gidim">
              <th className="px-3 py-2 text-left font-serif sticky left-0 top-0 bg-sumi3 z-30">{t('att.date')}</th>
              <th className="px-3 py-2 text-center font-bold font-serif sticky top-0 bg-sumi3 z-20 whitespace-nowrap">{t('att.total')}</th>
              {students.map(s => (
                <th key={s} className="px-3 py-2 text-center whitespace-nowrap sticky top-0 bg-sumi3 z-20">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleDates.map((date, i) => {
              const dayData = attendance[date] || {};
              const total = countPresent(date, attendance);
              const hasData = Object.keys(dayData).length > 0;
              return (
                <tr
                  key={date}
                  className={`border-b border-line ${i % 2 === 0 ? 'bg-sumi2' : 'bg-sumi'}`}
                >
                  <td className="px-3 py-2 font-medium text-gi whitespace-nowrap sticky left-0 bg-inherit z-10">
                    {formatDate(date, lang)}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-gi">
                    {hasData ? total : ''}
                  </td>
                  {students.map(student => {
                    const val = dayData[student];
                    return (
                      <td
                        key={student}
                        className={`px-3 py-2 text-center select-none ${getCellClass(val)}`}
                        onClick={() => toggleAttendance(date, student)}
                      >
                        {val === 1 ? '1' : val === 0 ? '0' : ''}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
