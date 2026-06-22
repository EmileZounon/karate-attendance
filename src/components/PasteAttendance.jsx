import { useMemo, useState } from 'react';
import { parseNameList } from '../utils/nameListParser';
import { buildAttendanceUpdate } from '../utils/attendanceUpdate';
import { generateDates, formatDate } from '../utils/dateUtils';
import { countPresent } from '../utils/statistics';

// Pick a sensible default class date: today if it's a class day, otherwise the
// most recent past class date, otherwise the first date.
function defaultDate(dates) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dates.includes(today)) return today;
  const past = dates.filter((d) => d <= today);
  if (past.length) return past[past.length - 1];
  return dates[0] || '';
}

// Take attendance for a date by pasting the list of who showed up.
// Matched names are marked present (1); everyone else on the roster is marked
// absent (0). Unmatched names can be added to the roster + marked present.
export default function PasteAttendance({ students, attendance, updateBoth }) {
  const dates = useMemo(() => generateDates(), []);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => defaultDate(dates));
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null); // { duplicates, newNames, skipped }
  const [checked, setChecked] = useState({}); // key -> bool (newNames by name, skipped by raw)
  const [showAbsent, setShowAbsent] = useState(false);
  const [done, setDone] = useState(null);

  const existingPresent = countPresent(date, attendance);
  const dateHasData = Object.keys(attendance[date] || {}).length > 0;

  const runPreview = () => {
    setDone(null);
    const result = parseNameList(text, students);
    setPreview(result);
    const init = {};
    result.newNames.forEach((n) => { init[n.name] = true; });
    result.skipped.forEach((s) => { init[s.raw] = false; });
    setChecked(init);
  };

  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  // Names being added to the roster this save (checked new names + rescued skips).
  const addedNames = () => {
    if (!preview) return [];
    const out = [];
    const seen = new Set(students.map((s) => s.toLowerCase()));
    const take = (name) => {
      const lower = name.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      out.push(name);
    };
    preview.newNames.forEach((n) => { if (checked[n.name]) take(n.name); });
    preview.skipped.forEach((s) => { if (checked[s.raw]) take(s.raw); });
    return out;
  };

  // Roster students marked absent (present roster names removed).
  const absentList = () => {
    if (!preview) return [];
    const present = new Set(preview.duplicates);
    return students.filter((s) => !present.has(s));
  };

  const save = () => {
    if (!preview || !date) return;
    const added = addedNames();
    const presentNames = [...preview.duplicates, ...added];
    if (presentNames.length === 0) return;
    const newStudents = [...students, ...added];
    const newAttendance = buildAttendanceUpdate(date, attendance, presentNames, newStudents);
    updateBoth(newStudents, newAttendance);
    setDone(
      `Saved ${formatDate(date)}: ${presentNames.length} present, ${newStudents.length - presentNames.length} absent` +
      (added.length ? `, ${added.length} new student${added.length > 1 ? 's' : ''} added.` : '.')
    );
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

  const present = preview ? preview.duplicates : [];
  const added = addedNames();
  const presentCount = present.length + added.length;
  const absent = absentList();

  return (
    <section className="dojo-card mb-4 p-4 no-print">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-lg font-bold font-serif text-gi">Take attendance (paste who showed up)</h2>
        <span className="text-gifaint text-sm">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-gidim">Class date:</label>
            <select
              value={date}
              onChange={(e) => { setDate(e.target.value); setPreview(null); setDone(null); }}
              className="flex-1 min-w-[8rem] sm:flex-none px-3 py-2.5 border border-line2 rounded-lg text-base sm:text-sm bg-sumi3 text-gi"
            >
              {dates.map((d) => (
                <option key={d} value={d}>{formatDate(d)}</option>
              ))}
            </select>
            {dateHasData && (
              <span className="text-xs text-gold bg-sumi3 border border-line2 rounded px-2 py-1">
                ⚠ {formatDate(date)} already has {existingPresent} present recorded — saving replaces the whole day
              </span>
            )}
          </div>

          <p className="text-sm text-gidim">
            Paste the list of who attended (commas or one per line, e.g. from WhatsApp).
            They get marked present; everyone else on the roster is marked absent for this date.
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
              disabled={!text.trim() || !date}
              className="dojo-cta w-full sm:w-auto px-4 py-2.5 rounded transition-colors disabled:opacity-50"
            >
              Preview
            </button>
            {(preview || text) && (
              <button
                onClick={reset}
                className="dojo-ghost w-full sm:w-auto px-4 py-2.5 rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {done && (
            <div className="p-3 rounded text-sm bg-sumi3 border border-line2 text-indigosoft">{done}</div>
          )}

          {preview && (
            <div className="space-y-4 border-t border-line2 pt-3">
              {/* Present */}
              <div>
                <h3 className="font-semibold text-sm font-serif text-gi mb-1">
                  Present ({present.length})
                </h3>
                {present.length > 0 ? (
                  <p className="text-sm text-[#E8786C]">{present.join(', ')}</p>
                ) : (
                  <p className="text-sm text-gifaint">No pasted names matched the roster.</p>
                )}
              </div>

              {/* Not on roster */}
              {preview.newNames.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm font-serif text-gi mb-1">
                    Not on roster ({preview.newNames.length})
                  </h3>
                  <p className="text-xs text-gifaint mb-2">
                    Tick to add them to the roster and mark present for this date.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {preview.newNames.map((n) => (
                      <label key={n.name} className="flex items-center gap-2 text-sm text-gi py-1.5">
                        <input
                          type="checkbox"
                          checked={!!checked[n.name]}
                          onChange={() => toggle(n.name)}
                          className="h-5 w-5 rounded shrink-0 accent-hinomaru"
                        />
                        <span>{n.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped junk, rescuable */}
              {preview.skipped.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm font-serif text-gi mb-1">
                    Doesn&apos;t look like a name ({preview.skipped.length})
                  </h3>
                  <p className="text-xs text-gifaint mb-2">
                    Skipped (dates, class lines, etc). Tick any that are actually a student.
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {preview.skipped.map((s) => (
                      <label key={s.raw} className="flex items-center gap-2 text-sm text-gifaint py-1.5">
                        <input
                          type="checkbox"
                          checked={!!checked[s.raw]}
                          onChange={() => toggle(s.raw)}
                          className="h-5 w-5 rounded shrink-0 accent-hinomaru"
                        />
                        <span>{s.raw}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Will be marked absent */}
              <div>
                <button
                  onClick={() => setShowAbsent((v) => !v)}
                  className="font-semibold text-sm font-serif text-gi"
                >
                  Will be marked absent ({absent.length}) {showAbsent ? '▲' : '▸'}
                </button>
                {showAbsent && (
                  <p className="text-sm text-gidim mt-1">{absent.join(', ') || 'None'}</p>
                )}
              </div>

              {presentCount > 0 && (
                <button
                  onClick={save}
                  className="dojo-cta w-full sm:w-auto px-4 py-3 rounded transition-colors text-base font-medium"
                >
                  Save attendance for {formatDate(date)} ({presentCount} present)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
