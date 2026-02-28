import { useMemo, useState } from 'react';
import { generateDates, getMonthLabel } from '../utils/dateUtils';
import {
  calculateStudentStats,
  calculateMonthlySummary,
  calculateStudentMonthly,
  getPctClass,
} from '../utils/statistics';
import { downloadPDF } from '../utils/pdfExport';

const MEDALS = ['🥇', '🥈', '🥉'];
const INSTRUCTORS = ['Vazrik', 'Cassiano'];

export default function AnalyticsTab({ students, attendance }) {
  const dates = useMemo(() => generateDates(), []);
  const studentStats = useMemo(() => calculateStudentStats(students, dates, attendance), [students, dates, attendance]);
  const monthlySummary = useMemo(() => calculateMonthlySummary(dates, attendance), [dates, attendance]);
  const studentMonthly = useMemo(() => calculateStudentMonthly(students, dates, attendance), [students, dates, attendance]);
  const months = monthlySummary.map(m => m.monthKey);
  const [selectedMonth, setSelectedMonth] = useState(() => months[months.length - 1] || '');

  // Top 3 students per month (instructors excluded)
  const monthlyLeaderboard = useMemo(() =>
    monthlySummary.map(({ monthKey, month }) => {
      const ranked = studentMonthly
        .filter(s => !INSTRUCTORS.includes(s.name))
        .map(s => ({
          name: s.name,
          attended: s.months[monthKey]?.attended || 0,
          total: s.months[monthKey]?.total || 0,
          percentage: s.months[monthKey]?.total > 0
            ? parseFloat((s.months[monthKey].attended / s.months[monthKey].total * 100).toFixed(1))
            : 0,
        }))
        .sort((a, b) => b.attended - a.attended || a.name.localeCompare(b.name))
        .slice(0, 3);
      return { monthKey, month, ranked };
    }),
    [monthlySummary, studentMonthly]
  );

  const selectedMonthlySummary = monthlySummary.find(m => m.monthKey === selectedMonth);
  const selectedStudentMonthly = studentMonthly
    .map(s => ({
      name: s.name,
      attended: s.months[selectedMonth]?.attended || 0,
      total: s.months[selectedMonth]?.total || 0,
      percentage: s.months[selectedMonth]?.total > 0
        ? parseFloat((s.months[selectedMonth].attended / s.months[selectedMonth].total * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.attended - a.attended || a.name.localeCompare(b.name));

  return (
    <div>
      {/* Action bar */}
      <div className="flex flex-wrap gap-2 justify-end mb-4 no-print">
        <button
          onClick={() => downloadPDF('analytics-content', 'Karate_Attendance_Report', 'portrait')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Download Full Report (PDF)
        </button>
        <div className="flex gap-2 items-center">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {monthlySummary.map(m => (
              <option key={m.monthKey} value={m.monthKey}>{m.month}</option>
            ))}
          </select>
          <button
            onClick={() => downloadPDF('analytics-month-content', `Karate_Report_${selectedMonth}`, 'portrait')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Download Month Report (PDF)
          </button>
        </div>
      </div>

      {/* Hidden month-specific content rendered off-screen for PDF capture */}
      <div
        id="analytics-month-content"
        className="fixed bg-white p-6 w-[800px]"
        style={{ left: '-9999px', top: 0 }}
        aria-hidden="true"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Karate Black Belt Program — {getMonthLabel(selectedMonth)}
        </h1>

        {selectedMonthlySummary && (
          <section className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Monthly Summary</h2>
            <table className="min-w-full text-sm border rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Month</th>
                  <th className="px-4 py-2 text-center">Total Attendance</th>
                  <th className="px-4 py-2 text-center">Classes Held</th>
                  <th className="px-4 py-2 text-center">Avg per Class</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-4 py-2 font-medium">{selectedMonthlySummary.month}</td>
                  <td className="px-4 py-2 text-center">{selectedMonthlySummary.totalAttendance}</td>
                  <td className="px-4 py-2 text-center">{selectedMonthlySummary.classesHeld}</td>
                  <td className="px-4 py-2 text-center">{selectedMonthlySummary.avgPerClass}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Student Attendance</h2>
          <table className="min-w-full text-sm border rounded-lg">
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
              {selectedStudentMonthly.map((s, i) => (
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
        </section>
      </div>

      <div id="analytics-content" className="space-y-8">
        {/* Leaderboard */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Leaderboard</h2>
          <div className="overflow-x-auto border rounded-lg shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left min-w-[60px]">Rank</th>
                  <th className="px-4 py-2 text-left min-w-[120px]">Student</th>
                  <th className="px-4 py-2 text-center min-w-[130px]">Classes Attended</th>
                  <th className="px-4 py-2 text-center min-w-[120px]">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.filter(s => !INSTRUCTORS.includes(s.name)).map((s, i) => (
                  <tr key={s.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 font-bold text-lg">
                      {i < 3 ? MEDALS[i] : i + 1}
                    </td>
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="px-4 py-2 text-center">{s.attended}</td>
                    <td className={`px-4 py-2 text-center ${getPctClass(s.percentage)}`}>
                      {s.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Monthly Leaderboards */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Leaderboards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {monthlyLeaderboard.map(({ monthKey, month, ranked }) => (
              <div key={monthKey} className="border rounded-lg shadow-sm overflow-hidden">
                <div className="bg-blue-600 text-white px-4 py-2 font-semibold">{month}</div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Rank</th>
                      <th className="px-4 py-2 text-left">Student</th>
                      <th className="px-4 py-2 text-center">Attended</th>
                      <th className="px-4 py-2 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((s, i) => (
                      <tr key={s.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-bold text-lg">{MEDALS[i]}</td>
                        <td className="px-4 py-2 font-medium">{s.name}</td>
                        <td className="px-4 py-2 text-center">{s.attended}</td>
                        <td className={`px-4 py-2 text-center ${getPctClass(s.percentage)}`}>
                          {s.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

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
