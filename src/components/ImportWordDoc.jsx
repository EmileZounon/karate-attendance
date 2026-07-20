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
    <div className="p-4 border border-dashed border-line2 rounded-lg bg-sumi2">
      <h3 className="font-serif font-bold mb-2 text-gi">Import from Word Document</h3>
      <p className="text-sm text-gidim mb-3">
        Upload an attendance report (.docx) to import student names and statistics.
      </p>
      <input
        type="file"
        accept=".docx"
        onChange={handleFileChange}
        className="block w-full text-sm text-gidim bg-sumi3 border border-line2 rounded file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-hinomaru file:text-white hover:file:bg-hinomarudeep"
      />

      {status && (
        <div className={`mt-3 p-3 rounded text-sm border border-line2 ${
          status.type === 'error' ? 'bg-sumi3 text-hinomaru' :
          status.type === 'loading' ? 'bg-sumi3 text-gold' :
          'bg-sumi3 text-indigosoft'
        }`}>
          {status.message}
        </div>
      )}

      {importResult && importResult.newStudents.length > 0 && (
        <button
          onClick={confirmImport}
          className="mt-3 px-4 py-2 dojo-cta rounded transition-colors"
        >
          Add {importResult.newStudents.length} New Student{importResult.newStudents.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
