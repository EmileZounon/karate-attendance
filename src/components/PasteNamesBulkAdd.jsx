import { useState } from 'react';
import { parseNameList } from '../utils/nameListParser';

// Bulk-add students by pasting a list (e.g. copied from WhatsApp).
// Parses the text, lets the teacher review, then adds only the checked names.
// `students` is the current roster; `onAdd(newNamesArray)` appends them.
export default function PasteNamesBulkAdd({ students, onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null); // { newNames, duplicates, skipped }
  const [checked, setChecked] = useState({}); // name -> bool
  const [done, setDone] = useState(null); // success message

  const runPreview = () => {
    setDone(null);
    const result = parseNameList(text, students);
    setPreview(result);
    // New names checked by default; rescued (skipped) names unchecked.
    const init = {};
    result.newNames.forEach((n) => { init[n.name] = true; });
    result.skipped.forEach((s) => { init[s.raw] = false; });
    setChecked(init);
  };

  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  const selectedNames = () => {
    if (!preview) return [];
    const out = [];
    const seen = new Set(students.map((s) => s.toLowerCase()));
    const take = (name) => {
      const lower = name.toLowerCase();
      if (seen.has(lower)) return; // re-check dup at commit time
      seen.add(lower);
      out.push(name);
    };
    preview.newNames.forEach((n) => { if (checked[n.name]) take(n.name); });
    preview.skipped.forEach((s) => { if (checked[s.raw]) take(s.raw); });
    return out;
  };

  const commit = () => {
    const toAdd = selectedNames();
    if (toAdd.length === 0) return;
    onAdd(toAdd);
    setDone(`Added ${toAdd.length} student${toAdd.length > 1 ? 's' : ''}.`);
    setText('');
    setPreview(null);
    setChecked({});
  };

  const reset = () => {
    setText('');
    setPreview(null);
    setChecked({});
    setDone(null);
  };

  const selectedCount = selectedNames().length;

  return (
    <section className="p-4 border rounded-lg bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-lg font-bold">Paste Names (bulk add)</h2>
        <span className="text-gray-400 text-sm">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-gray-600">
            Paste a list of names, one per line or separated by commas. Forgot
            the commas? A single line like "angel ib emile" works too. The app
            adds only the new ones and skips anyone already on the roster.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={'IB, angel, varak, paul, julia, ricardo\n\nor one name per line, pasted from WhatsApp'}
            className="w-full px-3 py-2 border rounded text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={runPreview}
              disabled={!text.trim()}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Preview
            </button>
            {(preview || text) && (
              <button
                onClick={reset}
                className="w-full sm:w-auto px-4 py-2.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {done && (
            <div className="p-3 rounded text-sm bg-green-100 text-green-700">{done}</div>
          )}

          {preview && (
            <div className="space-y-4 border-t pt-3">
              {/* New names */}
              {preview.newNames.length > 0 ? (
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 mb-2">
                    New names ({preview.newNames.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {preview.newNames.map((n) => (
                      <label key={n.name} className="flex items-center gap-2 text-sm py-1.5">
                        <input
                          type="checkbox"
                          checked={!!checked[n.name]}
                          onChange={() => toggle(n.name)}
                          className="h-5 w-5 rounded shrink-0"
                        />
                        <span>{n.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No new names to add.</p>
              )}

              {/* Rescuable skipped lines */}
              {preview.skipped.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 mb-1">
                    Doesn&apos;t look like a name ({preview.skipped.length})
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Skipped (dates, class lines, etc). Tick any that are actually a student.
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {preview.skipped.map((s) => (
                      <label key={s.raw} className="flex items-center gap-2 text-sm text-gray-500 py-1.5">
                        <input
                          type="checkbox"
                          checked={!!checked[s.raw]}
                          onChange={() => toggle(s.raw)}
                          className="h-5 w-5 rounded shrink-0"
                        />
                        <span>{s.raw}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Already on roster */}
              {preview.duplicates.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 mb-1">
                    Already in app ({preview.duplicates.length})
                  </h3>
                  <p className="text-sm text-gray-400">{preview.duplicates.join(', ')}</p>
                </div>
              )}

              {selectedCount > 0 && (
                <button
                  onClick={commit}
                  className="w-full sm:w-auto px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-base font-medium"
                >
                  Add {selectedCount} student{selectedCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
