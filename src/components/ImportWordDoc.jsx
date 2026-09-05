import { useState } from 'react';
import { parseWordDocument, mergeImportedData } from '../utils/wordParser';
import { useLang } from '../i18n';

export default function ImportWordDoc({ students, onImport }) {
  const { t } = useLang();
  const [status, setStatus] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setStatus({ type: 'error', message: t('word.needDocx') });
      return;
    }

    try {
      setStatus({ type: 'loading', message: t('word.parsing') });
      const data = await parseWordDocument(file);

      if (data.students.length === 0) {
        setStatus({ type: 'error', message: t('word.noData') });
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
        message: `${t('word.found', { n: data.students.length, month: data.month || t('word.unknownMonth'), year: data.year || '' })} ${
          newStudents.length > 0 ? t('word.newStudents', { names: newStudents.join(', ') }) : t('word.noNew')
        }`,
      });
    } catch (error) {
      setStatus({ type: 'error', message: t('word.parseError', { error: error.message }) });
    }
  };

  const confirmImport = () => {
    if (importResult) {
      onImport(importResult.mergedStudents);
      setStatus({ type: 'success', message: t('word.updated') });
      setImportResult(null);
    }
  };

  return (
    <div className="p-4 border border-dashed border-line2 rounded-lg bg-sumi2">
      <h3 className="font-serif font-bold mb-2 text-gi">{t('word.title')}</h3>
      <p className="text-sm text-gidim mb-3">
        {t('word.intro')}
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
          {t(importResult.newStudents.length > 1 ? 'word.addNew.many' : 'word.addNew.one', { n: importResult.newStudents.length })}
        </button>
      )}
    </div>
  );
}
