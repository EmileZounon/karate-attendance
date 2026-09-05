import { useState, useMemo } from 'react';
import { useFirestore } from './hooks/useFirestore';
import { defaultStudents, defaultAttendance } from './data/defaults';
import TodayTab from './components/TodayTab';
import AttendanceTab from './components/AttendanceTab';
import GradingTab from './components/GradingTab';
import AwardsTab from './components/AwardsTab';
import AnalyticsTab from './components/AnalyticsTab';
import ChartsTab from './components/ChartsTab';
import ManageStudentsTab from './components/ManageStudentsTab';
import PasswordGate from './components/PasswordGate';
import LanguageToggle from './components/LanguageToggle';
import { useLang } from './i18n';

// Stable keys; labels come from the dictionary (nav.<key>).
const TABS = ['today', 'attendance', 'danExam', 'awards', 'charts', 'analytics', 'manage'];
const INSTRUCTORS = ['Vazrik', 'Cassiano'];

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [data, setData, loading, error] = useFirestore({
    students: defaultStudents,
    attendance: defaultAttendance,
    savedAt: new Date().toISOString(),
  });
  const { t, lang } = useLang();

  const updateStudents = (students) => {
    setData(prev => ({ ...prev, students, savedAt: new Date().toISOString() }));
  };

  const updateAttendance = (attendance) => {
    setData(prev => ({ ...prev, attendance, savedAt: new Date().toISOString() }));
  };

  // Atomic update for operations that change both students and attendance together
  const updateBoth = (students, attendance) => {
    setData(prev => ({ ...prev, students, attendance, savedAt: new Date().toISOString() }));
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

  const allStudents = useMemo(
    () => [...data.students].sort((a, b) => a.localeCompare(b)),
    [data.students]
  );

  // All students sorted — instructors included in all tabs
  const sortedStudents = allStudents;

  const savedTime = data.savedAt
    ? new Date(data.savedAt).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')
    : t('app.never');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hinomaru mx-auto mb-4"></div>
          <p className="text-gidim">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <PasswordGate>
    <div className="max-w-[1400px] mx-auto p-4">
      <header className="text-center mb-6 relative">
        <LanguageToggle className="absolute right-0 top-0 no-print" />
        <div className="font-serif text-xs tracking-[0.16em] uppercase text-gidim mb-1">
          道場 · JKA
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-gi px-16">
          {t('app.title')}
        </h1>
        <span className="dojo-brush mx-auto mt-3" />
        <p className="text-sm text-gifaint mt-3">
          {t('app.lastSaved', { time: savedTime })}
          {error && <span className="text-hinomaru ml-2">{t('app.offline')}</span>}
        </p>
      </header>

      <nav className="flex flex-wrap justify-center gap-2 mb-6 no-print">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm px-2 py-1 sm:px-5 sm:py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab ? 'tab-active' : 'tab-inactive'
            }`}
          >
            {t('nav.' + tab)}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'today' && (
          <TodayTab
            students={sortedStudents}
            attendance={data.attendance}
            onTakeAttendance={() => setActiveTab('attendance')}
          />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab
            students={sortedStudents}
            attendance={data.attendance}
            updateAttendance={updateAttendance}
            updateBoth={updateBoth}
          />
        )}
        {activeTab === 'danExam' && (
          <GradingTab />
        )}
        {activeTab === 'awards' && (
          <AwardsTab
            students={sortedStudents.filter(s => !INSTRUCTORS.includes(s))}
            attendance={data.attendance}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            students={sortedStudents}
            attendance={data.attendance}
          />
        )}
        {activeTab === 'charts' && (
          <ChartsTab
            students={sortedStudents}
            attendance={data.attendance}
          />
        )}
        {activeTab === 'manage' && (
          <ManageStudentsTab
            students={allStudents}
            attendance={data.attendance}
            updateStudents={updateStudents}
            updateAttendance={updateAttendance}
            updateBoth={updateBoth}
            resetToDefaults={resetToDefaults}
            importData={importData}
            data={data}
          />
        )}
      </main>
    </div>
    </PasswordGate>
  );
}
