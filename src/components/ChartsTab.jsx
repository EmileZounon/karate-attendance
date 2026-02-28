import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
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
  const [activeChart, setActiveChart] = useState('');

  const classAttendanceData = useMemo(() =>
    classesHeld.map(date => ({
      date: formatDate(date),
      students: countPresent(date, attendance),
    })),
    [classesHeld, attendance]
  );

  const months = monthlySummary.map(m => m.monthKey);
  const monthlyStudentData = useMemo(() =>
    months.map(monthKey => ({
      monthKey,
      label: getMonthLabel(monthKey),
      data: students.map((student, i) => {
        const sm = studentMonthly.find(s => s.name === student);
        return {
          name: student,
          attended: sm?.months[monthKey]?.attended || 0,
          color: COLORS[i % COLORS.length],
        };
      }).sort((a, b) => b.attended - a.attended),
    })),
    [months, students, studentMonthly]
  );

  const chartOptions = [
    { id: 'total',         label: 'Total Attendance by Student' },
    ...monthlyStudentData.map(({ monthKey, label }) => ({
      id: `month-${monthKey}`,
      label: `${label} — By Student`,
    })),
    { id: 'monthly-total', label: 'Monthly Total Attendance' },
    { id: 'per-class',     label: 'Students per Class Over Time' },
  ];

  // ── Chart sections ───────────────────────────────────────────

  const charts = {
    total: (
      <section key="total">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Total Attendance by Student</h2>
        <div className="h-64 sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
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
        </div>
      </section>
    ),
    ...Object.fromEntries(
      monthlyStudentData.map(({ monthKey, label, data }) => [
        `month-${monthKey}`,
        <section key={monthKey}>
          <h2 className="text-xl font-bold text-gray-800 mb-4">{label} — Attendance by Student</h2>
          <div className="h-64 sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="attended" name="Classes Attended">
                  {data.map(entry => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ])
    ),
    'monthly-total': (
      <section key="monthly-total">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Total Attendance</h2>
        <div className="h-56 sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySummary} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalAttendance" name="Total Attendance" fill="#2563eb" />
              <Bar dataKey="classesHeld" name="Classes Held" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    ),
    'per-class': (
      <section key="per-class">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Students per Class Over Time</h2>
        <div className="h-56 sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
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
        </div>
      </section>
    ),
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 justify-between mb-4 no-print">
        <div className="flex gap-2 items-center">
          <select
            value={activeChart}
            onChange={e => setActiveChart(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">All charts</option>
            {chartOptions.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {activeChart && (
            <button
              onClick={() => setActiveChart('')}
              className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back
            </button>
          )}
        </div>
        <button
          onClick={() => downloadPDF('charts-content', 'Karate_Charts_Report', 'landscape')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Download Charts Report (PDF)
        </button>
      </div>

      <div id="charts-content" className="space-y-10 bg-white p-6 rounded-lg">
        {activeChart
          ? charts[activeChart]
          : Object.values(charts)
        }
      </div>
    </div>
  );
}
