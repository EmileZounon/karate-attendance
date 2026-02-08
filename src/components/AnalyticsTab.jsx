import { useMemo } from 'react';
import { generateDates, getMonthLabel } from '../utils/dateUtils';
import {
  calculateStudentStats,
  calculateMonthlySummary,
  calculateStudentMonthly,
  getPctClass,
} from '../utils/statistics';
import { downloadPDF } from '../utils/pdfExport';

export default function AnalyticsTab({ students, attendance }) {
  const dates = useMemo(() => generateDates(), []);
  const studentStats = useMemo(() => calculateStudentStats(students, dates, attendance), [students, dates, attendance]);
  const monthlySummary = useMemo(() => calculateMonthlySummary(dates, attendance), [dates, attendance]);
  const studentMonthly = useMemo(() => calculateStudentMonthly(students, dates, attendance), [students, dates, attendance]);

  const months = monthlySummary.map(m => m.monthKey);

  return (
    <div>
      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={() => downloadPDF('analytics-content', 'Karate_Attendance_Report', 'portrait')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Download Full Report (PDF)
        </button>
      </div>

      <div id="analytics-content" className="space-y-8">
        {/* Student Statistics */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Student Statistics</h2>
          <div className="overflow-x-auto border rounded-lg shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Rank</th>
                  <th className="px-4 py-2 text-left">Student</th>
                  <th className="px-4 py-2 text-center">Classes Attended</th>
                  <th className="px-4 py-2 text-center">Classes Held</th>
                  <th className="px-4 py-2 text-center">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.map((s, i) => (
                  <tr key={s.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="px-4 py-2 text-center">{s.attended}</td>
                    <td className="px-4 py-2 text-center">{s.total}</td>
                    <td className={`px-4 py-2 text-center ${getPctClass(s.percentage)}`}>
                      {s.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Monthly Summary */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Monthly Summary</h2>
          <div className="overflow-x-auto border rounded-lg shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Month</th>
                  <th className="px-4 py-2 text-center">Total Attendance</th>
                  <th className="px-4 py-2 text-center">Classes Held</th>
                  <th className="px-4 py-2 text-center">Avg per Class</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map((m, i) => (
                  <tr key={m.monthKey} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 font-medium">{m.month}</td>
                    <td className="px-4 py-2 text-center">{m.totalAttendance}</td>
                    <td className="px-4 py-2 text-center">{m.classesHeld}</td>
                    <td className="px-4 py-2 text-center">{m.avgPerClass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Student Attendance by Month */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Student Attendance by Month</h2>
          <div className="overflow-x-auto border rounded-lg shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Student</th>
                  {months.map(m => (
                    <th key={m} className="px-4 py-2 text-center">{getMonthLabel(m)}</th>
                  ))}
                  <th className="px-4 py-2 text-center font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {studentMonthly
                  .sort((a, b) => {
                    const totalA = Object.values(a.months).reduce((sum, m) => sum + m.attended, 0);
                    const totalB = Object.values(b.months).reduce((sum, m) => sum + m.attended, 0);
                    return totalB - totalA;
                  })
                  .map((s, i) => {
                    const total = Object.values(s.months).reduce((sum, m) => sum + m.attended, 0);
                    return (
                      <tr key={s.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium">{s.name}</td>
                        {months.map(m => (
                          <td key={m} className="px-4 py-2 text-center">
                            {s.months[m] ? `${s.months[m].attended}/${s.months[m].total}` : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-center font-bold">{total}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
