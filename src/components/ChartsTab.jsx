import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, Cell
} from 'recharts';
import { generateDates, formatDate, getMonthLabel, getMonthKey } from '../utils/dateUtils';
import {
  calculateStudentStats,
  calculateMonthlySummary,
  calculateStudentMonthly,
  getClassesHeld,
  countPresent,
} from '../utils/statistics';
import { downloadPDF } from '../utils/pdfExport';

const COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#9333ea',
  '#0891b2', '#c2410c', '#4f46e5', '#059669', '#e11d48',
  '#7c3aed', '#0d9488', '#b91c1c', '#a16207', '#6d28d9',
  '#15803d',
];

export default function ChartsTab({ students, attendance }) {
  const dates = useMemo(() => generateDates(), []);
  const studentStats = useMemo(() => calculateStudentStats(students, dates, attendance), [students, dates, attendance]);
  const monthlySummary = useMemo(() => calculateMonthlySummary(dates, attendance), [dates, attendance]);
  const studentMonthly = useMemo(() => calculateStudentMonthly(students, dates, attendance), [students, dates, attendance]);
  const classesHeld = useMemo(() => getClassesHeld(dates, attendance), [dates, attendance]);

  // Data for "Students per class" line chart
  const classAttendanceData = useMemo(() =>
    classesHeld.map(date => ({
      date: formatDate(date),
      students: countPresent(date, attendance),
    })),
    [classesHeld, attendance]
  );

  // Data for stacked bar chart (student by month)
  const months = monthlySummary.map(m => m.monthKey);
  const stackedData = useMemo(() => {
    return months.map(monthKey => {
      const row = { month: getMonthLabel(monthKey).split(' ')[0] }; // "January" -> "January"
      students.forEach(student => {
        const sm = studentMonthly.find(s => s.name === student);
        row[student] = sm?.months[monthKey]?.attended || 0;
      });
      return row;
    });
  }, [months, students, studentMonthly]);

  return (
    <div>
      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={() => downloadPDF('charts-content', 'Karate_Charts_Report', 'landscape')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Download Charts Report (PDF)
        </button>
      </div>

      <div id="charts-content" className="space-y-10 bg-white p-6 rounded-lg">
        {/* Chart 1: Attendance by Student */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Attendance by Student</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={studentStats} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="attended" name="Classes Attended">
                {studentStats.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Chart 2: Monthly Total Attendance */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Total Attendance</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlySummary} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalAttendance" name="Total Attendance" fill="#2563eb" />
              <Bar dataKey="classesHeld" name="Classes Held" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Chart 3: Students per Class Over Time */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Students per Class Over Time</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={classAttendanceData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="students"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 5 }}
                name="Students Present"
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Chart 4: Student Attendance by Month (Stacked) */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Student Attendance by Month</h2>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={stackedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="month" width={80} />
              <Tooltip />
              <Legend />
              {students.map((student, i) => (
                <Bar
                  key={student}
                  dataKey={student}
                  stackId="a"
                  fill={COLORS[i % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}
