import { useState } from 'react';
import { parseNameList } from '../utils/nameListParser';
import { initialResolutions, applyResolutions } from '../utils/nameSimilarity';
import DidYouMean from './DidYouMean';

// Bulk-add students by pasting a list (e.g. copied from WhatsApp).
// Parses the text, lets the teacher review, then adds only the checked names.
// `students` is the current roster; `onAdd(newNamesArray)` appends them.
export default function PasteNamesBulkAdd({ students, onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null); // { newNames, duplicates, skipped, closeMatches }
  const [checked, setChecked] = useState({}); // name -> bool
  const [resolutions, setResolutions] = useState({}); // closeMatch name -> roster name | NEW_STUDENT | null
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
    setResolutions(initialResolutions(result.closeMatches));
  };

  const pick = (name, value) => setResolutions((r) => ({ ...r, [name]: value }));
  const resolved = applyResolutions(preview ? preview.closeMatches : [], resolutions);

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
    resolved.added.forEach(take);
    return out;
  };

  const commit = () => {
    if (resolved.unresolved.length > 0) return;
    const toAdd = selectedNames();
    if (toAdd.length === 0) return;
    onAdd(toAdd);
    setDone(`Added ${toAdd.length} student${toAdd.length > 1 ? 's' : ''}.`);
    setText('');
    setPreview(null);
    setChecked({});
    setResolutions({});
  };

  const reset = () => {
    setText('');
    setPreview(null);
    setChecked({});
    setResolutions({});
    setDone(null);
  };

  const selectedCount = selectedNames().length;
  // Already on the roster: exact matches plus "Did you mean?" picks.
  const alreadyIn = preview ? [...preview.duplicates, ...resolved.present.filter((n) => !preview.duplicates.includes(n))] : [];

  return (
    <section className="dojo-card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-lg font-serif text-gi">Paste Names (bulk add)</h2>
        <span className="text-gifaint text-sm">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-gidim">
            Paste a list of names, one per line or separated by commas. Forgot
            the commas? A single line like "angel ib emile" works too. The app
            adds only the new ones and skips anyone already on the roster.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={'IB, angel, varak, paul, julia, ricardo\n\nor one name per line, pasted from WhatsApp'}
            className="w-full px-3 py-2 bg-sumi3 border border-line2 text-gi placeholder-gifaint rounded-lg text-base focus:outline-none focus:border-hinomaru"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={runPreview}
              disabled={!text.trim()}
              className="dojo-cta w-full sm:w-auto px-4 py-2.5 disabled:opacity-50"
            >
              Preview
            </button>
            {(preview || text) && (
              <button
                onClick={reset}
                className="dojo-ghost w-full sm:w-auto px-4 py-2.5"
              >
                Clear
              </button>
            )}
          </div>

          {done && (
            <div className="p-3 rounded-lg text-sm bg-sumi3 border border-line text-indigosoft">{done}</div>
          )}

          {preview && (
            <div className="space-y-4 border-t border-line2 pt-3">
              {/* New names */}
              {preview.newNames.length > 0 ? (
                <div>
                  <h3 className="font-serif text-sm text-gi mb-2">
                    New names ({preview.newNames.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {preview.newNames.map((n) => (
                      <label key={n.name} className="flex items-center gap-2 text-sm text-gi py-1.5 px-2 border border-line rounded-lg">
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
              ) : preview.closeMatches.length === 0 && (
                <p className="text-sm text-gifaint">No new names to add.</p>
              )}

              {/* Close to an existing student: pick who was meant */}
              <DidYouMean rows={preview.closeMatches} resolutions={resolutions} onPick={pick} idPrefix="add" />

              {/* Rescuable skipped lines */}
              {preview.skipped.length > 0 && (
                <div>
                  <h3 className="font-serif text-sm text-gi mb-1">
                    Doesn&apos;t look like a name ({preview.skipped.length})
                  </h3>
                  <p className="text-xs text-gifaint mb-2">
                    Skipped (dates, class lines, etc). Tick any that are actually a student.
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {preview.skipped.map((s) => (
                      <label key={s.raw} className="flex items-center gap-2 text-sm text-gifaint py-1.5 px-2 border border-line rounded-lg">
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
              {alreadyIn.length > 0 && (
                <div>
                  <h3 className="font-serif text-sm text-gi mb-1">
                    Already in app ({alreadyIn.length})
                  </h3>
                  <p className="text-sm text-gifaint">{alreadyIn.join(', ')}</p>
                </div>
              )}

              {(selectedCount > 0 || resolved.unresolved.length > 0) && (
                <button
                  onClick={commit}
                  disabled={resolved.unresolved.length > 0}
                  className="dojo-cta w-full sm:w-auto px-4 py-3 text-base font-medium disabled:opacity-50"
                >
                  {resolved.unresolved.length > 0
                    ? 'Settle the "Did you mean?" choices to add'
                    : `Add ${selectedCount} student${selectedCount > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
