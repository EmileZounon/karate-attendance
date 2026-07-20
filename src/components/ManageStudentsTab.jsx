import { useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import ImportWordDoc from './ImportWordDoc';
import PasteNamesBulkAdd from './PasteNamesBulkAdd';
import { formatDate, generateDates, getMonthKey, getMonthLabel } from '../utils/dateUtils';
import { calculateStudentStats, calculateMonthlySummary, calculateStudentMonthly, getClassesHeld } from '../utils/statistics';

export default function ManageStudentsTab({
  students,
  attendance,
  updateStudents,
  updateAttendance,
  updateBoth,
  resetToDefaults,
  importData,
  data,
}) {
  const [newName, setNewName] = useState('');
  const [editingName, setEditingName] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const backupsRef = collection(db, 'attendance-data', 'main', 'backups');
      const q = query(backupsRef, orderBy('timestamp', 'desc'), limit(20));
      const snap = await getDocs(q);
      setBackups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading backups:', err);
    }
    setLoadingBackups(false);
  };

  const restoreBackup = (backup) => {
    const { id, backupAt, timestamp, ...restoreData } = backup;
    if (!confirm(`Restore backup from ${new Date(backupAt).toLocaleString()}? This will replace all current data.`)) return;
    importData(restoreData);
    alert('Backup restored!');
  };

  const startEdit = (name) => {
    setEditingName(name);
    setEditValue(name);
  };

  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === editingName) { setEditingName(null); return; }
    if (students.includes(trimmed)) {
      alert(`"${trimmed}" already exists.`);
      return;
    }
    // Atomic update: rename in both students and attendance in one write
    const newStudents = students.map(s => s === editingName ? trimmed : s);
    const newAtt = { ...attendance };
    Object.keys(newAtt).forEach(date => {
      if (newAtt[date][editingName] !== undefined) {
        const val = newAtt[date][editingName];
        const { [editingName]: _, ...rest } = newAtt[date];
        newAtt[date] = { ...rest, [trimmed]: val };
      }
    });
    updateBoth(newStudents, newAtt);
    setEditingName(null);
  };

  const addStudent = () => {
    const name = newName.trim();
    if (!name) return;
    if (students.includes(name)) {
      alert(`"${name}" is already in the list.`);
      return;
    }
    updateStudents([...students, name]);
    setNewName('');
  };

  const removeStudent = (name) => {
    if (!confirm(`Remove "${name}" and all their attendance records?`)) return;
    // Atomic update: remove from both students and attendance in one write
    const newStudents = students.filter(s => s !== name);
    const newAtt = { ...attendance };
    Object.keys(newAtt).forEach(date => {
      if (newAtt[date][name] !== undefined) {
        const { [name]: _, ...rest } = newAtt[date];
        newAtt[date] = rest;
      }
    });
    updateBoth(newStudents, newAtt);
  };

  const handleImportStudents = (mergedStudents) => {
    updateStudents(mergedStudents);
  };

  const handleBulkAdd = (newNames) => {
    if (!newNames.length) return;
    updateStudents([...students, ...newNames]);
  };

  const exportExcel = () => {
    const sortedStudents = [...students].sort((a, b) => a.localeCompare(b));
    const dates = Object.keys(attendance).sort();
    const allDates = generateDates();
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Attendance Grid ──
    const attRows = dates.map(date => {
      const dayData = attendance[date] || {};
      const total = Object.values(dayData).filter(v => v === 1).length;
      const row = { Date: formatDate(date), Total: total };
      sortedStudents.forEach(s => {
        const val = dayData[s];
        row[s] = val === 1 ? 1 : val === 0 ? 0 : '';
      });
      return row;
    });
    const totalsRow = { Date: 'TOTAL', Total: '' };
    sortedStudents.forEach(s => {
      totalsRow[s] = dates.reduce((sum, date) => {
        return sum + ((attendance[date] || {})[s] === 1 ? 1 : 0);
      }, 0);
    });
    attRows.push(totalsRow);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attRows), 'Attendance');

    // ── Sheet 2: Student Stats ──
    const stats = calculateStudentStats(sortedStudents, allDates, attendance);
    const studentMonthly = calculateStudentMonthly(sortedStudents, allDates, attendance);
    const months = [...new Set(getClassesHeld(allDates, attendance).map(getMonthKey))].sort();

    const statsRows = stats.map(s => {
      const row = { Student: s.name, 'Classes Attended': s.attended, 'Total Classes': s.total, 'Attendance %': s.percentage };
      const sm = studentMonthly.find(m => m.name === s.name);
      months.forEach(mk => {
        row[getMonthLabel(mk)] = sm?.months[mk]?.attended || 0;
      });
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsRows), 'Student Stats');

    // ── Sheet 3: Monthly Summary ──
    const monthly = calculateMonthlySummary(allDates, attendance);
    const monthlyRows = monthly.map(m => ({
      Month: m.month,
      'Classes Held': m.classesHeld,
      'Total Attendance': m.totalAttendance,
      'Avg per Class': m.avgPerClass,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyRows), 'Monthly Summary');

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `karate-attendance-${today}.xlsx`);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'karate-attendance-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!imported.students || !imported.attendance) {
          alert('Invalid data format. Expected { students, attendance }.');
          return;
        }
        importData(imported);
        alert('Data imported successfully!');
      } catch {
        alert('Error reading JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (!confirm('Reset all data to defaults? This cannot be undone.')) return;
    resetToDefaults();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Add Student */}
      <section className="dojo-card p-4">
        <h2 className="font-serif text-lg text-gi mb-3">Add Student</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStudent()}
            placeholder="Student name"
            className="flex-1 px-3 py-2 bg-sumi3 border border-line2 text-gi placeholder-gifaint rounded-lg focus:outline-none focus:border-hinomaru"
          />
          <button
            onClick={addStudent}
            className="dojo-cta px-4 py-2"
          >
            Add
          </button>
        </div>
      </section>

      {/* Paste Names (bulk add) */}
      <PasteNamesBulkAdd students={students} onAdd={handleBulkAdd} />

      {/* Student List */}
      <section className="dojo-card p-4">
        <h2 className="font-serif text-lg text-gi mb-3">
          Current Students ({students.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {students.map(name => (
            <div key={name} className="flex items-center gap-2 p-2 bg-sumi3 border border-line rounded-lg">
              {editingName === name ? (
                <>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingName(null); }}
                    className="flex-1 px-2 py-1 bg-sumi3 border border-line2 text-gi placeholder-gifaint rounded-lg text-sm focus:outline-none focus:border-hinomaru"
                  />
                  <button onClick={saveEdit} className="text-indigosoft hover:text-gi text-sm font-medium">Save</button>
                  <button onClick={() => setEditingName(null)} className="text-gifaint hover:text-gidim text-sm">Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium text-gi">{name}</span>
                  <button onClick={() => startEdit(name)} className="text-indigosoft hover:text-gi text-sm font-medium">Edit</button>
                  <button onClick={() => removeStudent(name)} className="text-hinomaru hover:text-hinomarudeep text-sm font-medium">Remove</button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Import from Word Doc */}
      <section>
        <ImportWordDoc students={students} onImport={handleImportStudents} />
      </section>

      {/* Backup & Restore */}
      <section className="dojo-card p-4">
        <h2 className="font-serif text-lg text-gi mb-3">Backup & Restore</h2>
        <button
          onClick={loadBackups}
          disabled={loadingBackups}
          className="px-4 py-2 bg-indigoink text-gi rounded-lg hover:bg-indigosoft transition-colors disabled:opacity-50"
        >
          {loadingBackups ? 'Loading...' : 'Load Backups'}
        </button>
        {backups.length > 0 && (
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {backups.map(b => (
              <div key={b.id} className="flex items-center justify-between p-2 bg-sumi3 border border-line rounded-lg text-sm">
                <div>
                  <span className="font-medium text-gi">{new Date(b.backupAt).toLocaleString()}</span>
                  <span className="text-gifaint ml-2">
                    ({b.students?.length || 0} students, {Object.keys(b.attendance || {}).length} dates)
                  </span>
                </div>
                <button
                  onClick={() => restoreBackup(b)}
                  className="px-3 py-1 bg-indigoink text-gi rounded-lg text-xs hover:bg-indigosoft transition-colors"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
        {backups.length === 0 && !loadingBackups && (
          <p className="text-xs text-gifaint mt-2">
            Auto-backups are created every 5 minutes when you make changes. Click above to check for available backups.
          </p>
        )}
      </section>

      {/* Export / Import JSON */}
      <section className="dojo-card p-4">
        <h2 className="font-serif text-lg text-gi mb-3">Data Management</h2>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={exportExcel}
              className="px-4 py-2 bg-indigoink text-gi rounded-lg hover:bg-indigosoft transition-colors"
            >
              Export as Excel
            </button>
            <button
              onClick={exportJSON}
              className="px-4 py-2 bg-indigoink text-gi rounded-lg hover:bg-indigosoft transition-colors"
            >
              Export Data (JSON)
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gidim mb-1">
              Import Data (JSON)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="block w-full text-sm text-gifaint file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sumi3 file:text-gi hover:file:bg-line2"
            />
          </div>
          <div className="pt-3 border-t border-line2">
            <button
              onClick={handleReset}
              className="dojo-ghost px-4 py-2 text-hinomaru border-hinomaru"
            >
              Reset to Defaults
            </button>
            <p className="text-xs text-gifaint mt-1">
              Restores original 16 students and January 2026 attendance data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
