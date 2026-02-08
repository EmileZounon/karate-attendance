import { useState } from 'react';
import { useFirestore } from './hooks/useFirestore';
import { defaultStudents, defaultAttendance } from './data/defaults';
import AttendanceTab from './components/AttendanceTab';
import AnalyticsTab from './components/AnalyticsTab';
import ChartsTab from './components/ChartsTab';
import ManageStudentsTab from './components/ManageStudentsTab';

const TABS = ['Attendance', 'Analytics', 'Charts', 'Manage Students'];

export default function App() {
  const [activeTab, setActiveTab] = useState('Attendance');
  const [data, setData, loading, error] = useFirestore({
    students: defaultStudents,
    attendance: defaultAttendance,
    savedAt: new Date().toISOString(),
  });

  const updateStudents = (students) => {
    setData(prev => ({ ...prev, students, savedAt: new Date().toISOString() }));
  };

  const updateAttendance = (attendance) => {
    setData(prev => ({ ...prev, attendance, savedAt: new Date().toISOString() }));
  };

  const resetToDefaults = () => {
    setData({
      students: defaultStudents,
      attendance: defaultAttendance,
      savedAt: new Date().toISOString(),
    });
  };

  const importData = (imported) => {
    setData({ ...imported, savedAt: new Date().toISOString() });
  };

  const savedTime = data.savedAt
    ? new Date(data.savedAt).toLocaleString()
    : 'Never';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold text-blue-800">
          Karate Black Belt Program 2026
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Last saved: {savedTime}
          {error && <span className="text-red-500 ml-2">(offline mode)</span>}
        </p>
      </header>

      <nav className="flex justify-center gap-2 mb-6 no-print">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab ? 'tab-active' : 'tab-inactive'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'Attendance' && (
          <AttendanceTab
            students={data.students}
            attendance={data.attendance}
            updateAttendance={updateAttendance}
          />
        )}
        {activeTab === 'Analytics' && (
          <AnalyticsTab
            students={data.students}
            attendance={data.attendance}
          />
        )}
        {activeTab === 'Charts' && (
          <ChartsTab
            students={data.students}
            attendance={data.attendance}
          />
        )}
        {activeTab === 'Manage Students' && (
          <ManageStudentsTab
            students={data.students}
            attendance={data.attendance}
            updateStudents={updateStudents}
            updateAttendance={updateAttendance}
            resetToDefaults={resetToDefaults}
            importData={importData}
            data={data}
          />
        )}
      </main>
    </div>
  );
}
