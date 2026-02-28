import { useMemo } from 'react';
import { generateDates, formatDate } from '../utils/dateUtils';
import { countPresent } from '../utils/statistics';

export default function AttendanceTab({ students, attendance, updateAttendance }) {
  const dates = useMemo(() => generateDates(), []);

  const toggleAttendance = (date, student) => {
    const newAtt = { ...attendance };
    if (!newAtt[date]) newAtt[date] = {};
    else newAtt[date] = { ...newAtt[date] };

    const current = newAtt[date][student];
    newAtt[date][student] = current === 1 ? 0 : 1;  // Toggle: 1 (Present) <-> 0 (Absent)
    updateAttendance(newAtt);
  };

  const getCellClass = (value) => {
    if (value === 1) return 'cell-present';
    if (value === 0) return 'cell-absent';
    return 'cell-empty';
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">
        Click cells to toggle: 0 (Absent) &harr; 1 (Present)
      </p>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-3 py-2 text-left sticky left-0 bg-blue-600 z-10">Date</th>
              <th className="px-3 py-2 text-center font-bold">Total</th>
              {students.map(s => (
                <th key={s} className="px-3 py-2 text-center whitespace-nowrap">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date, i) => {
              const dayData = attendance[date] || {};
              const total = countPresent(date, attendance);
              const hasData = Object.keys(dayData).length > 0;

              return (
                <tr
                  key={date}
                  className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-inherit z-10">
                    {formatDate(date)}
                  </td>
                  <td className="px-3 py-2 text-center font-bold">
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
