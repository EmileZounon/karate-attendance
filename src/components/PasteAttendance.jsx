import { useMemo, useState } from 'react';
import { parseNameList } from '../utils/nameListParser';
import { buildAttendanceUpdate, splitPastedNames } from '../utils/attendanceUpdate';
import { generateDates, formatDate } from '../utils/dateUtils';
import { initialResolutions, applyResolutions } from '../utils/nameSimilarity';
import DidYouMean from './DidYouMean';
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
// Matched names are marked present (1). Anyone already marked for that date
// keeps their mark, so a latecomer can be pasted on their own without
// un-marking the students already recorded — unless "replace the whole day" is
// ticked. Unmatched names can be added to the roster + marked present, except
// that a spelling close to an existing student becomes a "Did you mean?" choice
// instead of a silent new row.
export default function PasteAttendance({ students, attendance, updateBoth }) {
  const dates = useMemo(() => generateDates(), []);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => defaultDate(dates));
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null); // { duplicates, newNames, skipped, closeMatches }
  const [checked, setChecked] = useState({}); // key -> bool (newNames by name, skipped by raw)
  const [resolutions, setResolutions] = useState({}); // closeMatch name -> roster name | NEW_STUDENT | null
  const [showAbsent, setShowAbsent] = useState(false);
  const [replaceDay, setReplaceDay] = useState(false);
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
    setResolutions(initialResolutions(result.closeMatches));
  };

  const pick = (name, value) => setResolutions((r) => ({ ...r, [name]: value }));

  // What the "Did you mean?" choices amount to for this save.
  const resolved = applyResolutions(preview ? preview.closeMatches : [], resolutions);

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
    resolved.added.forEach(take);
    return out;
  };

  // Pasted names that matched the roster, exactly or via a "Did you mean?" pick.
  const matchedPresent = () => {
    if (!preview) return [];
    const out = [...preview.duplicates];
    resolved.present.forEach((n) => { if (!out.includes(n)) out.push(n); });
    return out;
  };

  // Students already recorded present for this date who aren't in the paste.
  // Merge keeps them present; replace wipes them.
  const keptPresentList = (pastedPresent) => {
    if (replaceDay) return [];
    const day = attendance[date] || {};
    return students.filter((s) => !pastedPresent.has(s) && day[s] === 1);
  };

  // Roster students this save will mark absent. Under merge that excludes
  // anyone already marked present — their 1 is left alone.
  const absentList = (pastedPresent) => {
    const day = attendance[date] || {};
    return students.filter(
      (s) => !pastedPresent.has(s) && (replaceDay || day[s] !== 1)
    );
  };

  const save = () => {
    if (!preview || !date || resolved.unresolved.length > 0) return;
    const added = addedNames();
    const presentNames = [...matchedPresent(), ...added];
    if (presentNames.length === 0) return;
    const newStudents = [...students, ...added];
    const newAttendance = buildAttendanceUpdate(date, attendance, presentNames, newStudents, {
      replace: replaceDay,
    });
    updateBoth(newStudents, newAttendance);
    // Report the day as it now stands, not just what was pasted.
    const day = newAttendance[date];
    const totalPresent = Object.values(day).filter((v) => v === 1).length;
    const totalAbsent = Object.values(day).filter((v) => v === 0).length;
    setDone(
      `Saved ${formatDate(date)}: ${totalPresent} present, ${totalAbsent} absent` +
      (added.length ? `, ${added.length} new student${added.length > 1 ? 's' : ''} added.` : '.')
    );
    setText('');
    setPreview(null);
    setChecked({});
    setResolutions({});
    setReplaceDay(false);
  };

  const reset = () => {
    setText('');
    setPreview(null);
    setChecked({});
    setResolutions({});
    setReplaceDay(false);
    setDone(null);
  };

  const present = matchedPresent();
  const added = addedNames();
  const pastedPresent = new Set([...present, ...added]);
  const kept = keptPresentList(pastedPresent);
  const absent = absentList(pastedPresent);
  const presentCount = pastedPresent.size + kept.length;
  // Of the pasted names, which ones this save actually changes.
  const { fresh: pastedFresh, unchanged: pastedUnchanged } = splitPastedNames(attendance[date], present);

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
              onChange={(e) => { setDate(e.target.value); setPreview(null); setReplaceDay(false); setDone(null); }}
              className="flex-1 min-w-[8rem] sm:flex-none px-3 py-2.5 border border-line2 rounded-lg text-base sm:text-sm bg-sumi3 text-gi"
            >
              {dates.map((d) => (
                <option key={d} value={d}>{formatDate(d)}</option>
              ))}
            </select>
            {dateHasData && (
              <span className="text-xs text-indigosoft bg-sumi3 border border-line2 rounded px-2 py-1">
                {formatDate(date)} already has {existingPresent} present recorded — they stay present
              </span>
            )}
          </div>

          <p className="text-sm text-gidim">
            Paste the list of who attended (commas or one per line, e.g. from
            WhatsApp). A single line of names split by spaces works too.
            They get marked present. {dateHasData
              ? 'Anyone already recorded for this date keeps their mark, so you can paste a latecomer on their own.'
              : 'Everyone else on the roster is marked absent for this date.'}
          </p>

          {dateHasData && (
            <label className="flex items-start gap-2 text-sm text-gidim">
              <input
                type="checkbox"
                checked={replaceDay}
                onChange={(e) => setReplaceDay(e.target.checked)}
                className="h-5 w-5 rounded shrink-0 mt-0.5 accent-hinomaru"
              />
              <span>
                Replace the whole day instead
                <span className="block text-xs text-gold">
                  ⚠ Wipes the {existingPresent} already recorded present. Only for fixing a wrong list.
                </span>
              </span>
            </label>
          )}
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
              {/* From your paste — split into who changes and who was already present */}
              <div>
                <h3 className="font-semibold text-sm font-serif text-gi mb-1">
                  From your paste ({present.length})
                </h3>
                {present.length === 0 && (
                  <p className="text-sm text-gifaint">No pasted names matched the roster.</p>
                )}
                {pastedFresh.length > 0 && (
                  <p className="text-sm text-[#E8786C]">{pastedFresh.join(', ')}</p>
                )}
                {pastedUnchanged.map((name) => (
                  <p key={name} className="text-sm text-gidim">
                    {name} <span className="text-gifaint">— already present, no change</span>
                  </p>
                ))}
              </div>

              {/* Already recorded present, left alone by a merge */}
              {kept.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm font-serif text-gi mb-1">
                    Already present, kept ({kept.length})
                  </h3>
                  <p className="text-xs text-gifaint mb-1">
                    Recorded earlier for this date. This save leaves them present.
                  </p>
                  <p className="text-sm text-[#E8786C]">{kept.join(', ')}</p>
                </div>
              )}

              {/* Close to an existing student: pick who was meant */}
              <DidYouMean rows={preview.closeMatches} resolutions={resolutions} onPick={pick} idPrefix="att" />

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

              {(pastedPresent.size > 0 || resolved.unresolved.length > 0) && (
                <button
                  onClick={save}
                  disabled={resolved.unresolved.length > 0}
                  className="dojo-cta w-full sm:w-auto px-4 py-3 rounded transition-colors text-base font-medium disabled:opacity-50"
                >
                  {resolved.unresolved.length > 0
                    ? 'Settle the "Did you mean?" choices to save'
                    : `Save attendance for ${formatDate(date)} (${presentCount} present)`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
