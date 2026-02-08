import { useState } from 'react';
import { parseWordDocument, mergeImportedData } from '../utils/wordParser';

export default function ImportWordDoc({ students, onImport }) {
  const [status, setStatus] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setStatus({ type: 'error', message: 'Please upload a .docx file' });
      return;
    }

    try {
      setStatus({ type: 'loading', message: 'Parsing document...' });
      const data = await parseWordDocument(file);

      if (data.students.length === 0) {
        setStatus({ type: 'error', message: 'No student data found in document' });
        return;
      }

      const mergedStudents = mergeImportedData(students, data);
      const newStudents = data.students.filter(s => !students.includes(s));

      setImportResult({
        data,
        mergedStudents,
        newStudents,
      });

      setStatus({
        type: 'success',
        message: `Found ${data.students.length} students from ${data.month || 'unknown month'} ${data.year || ''}. ${
          newStudents.length > 0
            ? `New students: ${newStudents.join(', ')}`
            : 'No new students to add.'
        }`
      });
    } catch (error) {
      setStatus({ type: 'error', message: 'Error parsing document: ' + error.message });
    }
  };

  const confirmImport = () => {
    if (importResult) {
      onImport(importResult.mergedStudents);
      setStatus({ type: 'success', message: 'Students updated successfully!' });
      setImportResult(null);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold mb-2">Import from Word Document</h3>
      <p className="text-sm text-gray-600 mb-3">
        Upload an attendance report (.docx) to import student names and statistics.
      </p>
      <input
        type="file"
        accept=".docx"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
      />

      {status && (
        <div className={`mt-3 p-3 rounded text-sm ${
          status.type === 'error' ? 'bg-red-100 text-red-700' :
          status.type === 'loading' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {status.message}
        </div>
      )}

      {importResult && importResult.newStudents.length > 0 && (
        <button
          onClick={confirmImport}
          className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Add {importResult.newStudents.length} New Student{importResult.newStudents.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
