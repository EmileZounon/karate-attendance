import { useState } from 'react';
import ImportWordDoc from './ImportWordDoc';

export default function ManageStudentsTab({
  students,
  attendance,
  updateStudents,
  updateAttendance,
  resetToDefaults,
  importData,
  data,
}) {
  const [newName, setNewName] = useState('');

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
    updateStudents(students.filter(s => s !== name));
    // Also remove from attendance data
    const newAtt = { ...attendance };
    Object.keys(newAtt).forEach(date => {
      if (newAtt[date][name] !== undefined) {
        const { [name]: _, ...rest } = newAtt[date];
        newAtt[date] = rest;
      }
    });
    updateAttendance(newAtt);
  };

  const handleImportStudents = (mergedStudents) => {
    updateStudents(mergedStudents);
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
      <section className="p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-lg font-bold mb-3">Add Student</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStudent()}
            placeholder="Student name"
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addStudent}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Add
          </button>
        </div>
      </section>

      {/* Student List */}
      <section className="p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-lg font-bold mb-3">
          Current Students ({students.length})
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {students.map(name => (
            <div
              key={name}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span className="font-medium">{name}</span>
              <button
                onClick={() => removeStudent(name)}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Import from Word Doc */}
      <section>
        <ImportWordDoc students={students} onImport={handleImportStudents} />
      </section>

      {/* Export / Import JSON */}
      <section className="p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-lg font-bold mb-3">Data Management</h2>
        <div className="space-y-3">
          <div>
            <button
              onClick={exportJSON}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Export Data (JSON)
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Import Data (JSON)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-700"
            />
          </div>
          <div className="pt-3 border-t">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Reset to Defaults
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Restores original 16 students and January 2026 attendance data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
