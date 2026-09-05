import { useMemo, useState } from 'react';
import { parseNameList } from '../utils/nameListParser';
import { buildAttendanceUpdate, splitPastedNames } from '../utils/attendanceUpdate';
import { generateDates, formatDate } from '../utils/dateUtils';
import { initialResolutions, applyResolutions } from '../utils/nameSimilarity';
import DidYouMean from './DidYouMean';
import { countPresent } from '../utils/statistics';
import { useLang } from '../i18n';

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
  const { t, lang } = useLang();
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
      t('paste.saved', { date: formatDate(date, lang), present: totalPresent, absent: totalAbsent }) +
      (added.length
        ? t(added.length > 1 ? 'paste.savedAdded.many' : 'paste.savedAdded.one', { n: added.length })
        : t('paste.savedEnd'))
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
        <h2 className="text-lg font-bold font-serif text-gi">{t('paste.title')}</h2>
        <span className="text-gifaint text-sm">{open ? t('paste.hide') : t('paste.show')}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-gidim">{t('paste.classDate')}</label>
            <select
              value={date}
              onChange={(e) => { setDate(e.target.value); setPreview(null); setReplaceDay(false); setDone(null); }}
              className="flex-1 min-w-[8rem] sm:flex-none px-3 py-2.5 border border-line2 rounded-lg text-base sm:text-sm bg-sumi3 text-gi"
            >
              {dates.map((d) => (
                <option key={d} value={d}>{formatDate(d, lang)}</option>
              ))}
            </select>
            {dateHasData && (
              <span className="text-xs text-indigosoft bg-sumi3 border border-line2 rounded px-2 py-1">
                {t('paste.alreadyRecorded', { date: formatDate(date, lang), n: existingPresent })}
              </span>
            )}
          </div>

          <p className="text-sm text-gidim">
            {t('paste.intro')} {dateHasData ? t('paste.introMerge') : t('paste.introFresh')}
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
                {t('paste.replaceDay')}
                <span className="block text-xs text-gold">
                  {t('paste.replaceWarn', { n: existingPresent })}
                </span>
              </span>
            </label>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={t('paste.placeholder')}
            className="w-full px-3 py-2 bg-sumi3 border border-line2 text-gi placeholder-gifaint rounded-lg text-base focus:outline-none focus:border-hinomaru"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={runPreview}
              disabled={!text.trim() || !date}
              className="dojo-cta w-full sm:w-auto px-4 py-2.5 rounded transition-colors disabled:opacity-50"
            >
              {t('paste.preview')}
            </button>
            {(preview || text) && (
              <button
                onClick={reset}
                className="dojo-ghost w-full sm:w-auto px-4 py-2.5 rounded transition-colors"
              >
                {t('paste.clear')}
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
                  {t('paste.fromPaste', { n: present.length })}
                </h3>
                {present.length === 0 && (
                  <p className="text-sm text-gifaint">{t('paste.noneMatched')}</p>
                )}
                {pastedFresh.length > 0 && (
                  <p className="text-sm text-[#E8786C]">{pastedFresh.join(', ')}</p>
                )}
                {pastedUnchanged.map((name) => (
                  <p key={name} className="text-sm text-gidim">
                    {name} <span className="text-gifaint">· {t('paste.alreadyPresentSuffix')}</span>
                  </p>
                ))}
              </div>

              {/* Already recorded present, left alone by a merge */}
              {kept.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm font-serif text-gi mb-1">
                    {t('paste.kept', { n: kept.length })}
                  </h3>
                  <p className="text-xs text-gifaint mb-1">
                    {t('paste.keptHint')}
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
                    {t('paste.notOnRoster', { n: preview.newNames.length })}
                  </h3>
                  <p className="text-xs text-gifaint mb-2">
                    {t('paste.notOnRosterHint')}
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
                    {t('paste.skipped', { n: preview.skipped.length })}
                  </h3>
                  <p className="text-xs text-gifaint mb-2">
                    {t('paste.skippedHint')}
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
                  {t('paste.absent', { n: absent.length })} {showAbsent ? '▲' : '▸'}
                </button>
                {showAbsent && (
                  <p className="text-sm text-gidim mt-1">{absent.join(', ') || t('paste.none')}</p>
                )}
              </div>

              {(pastedPresent.size > 0 || resolved.unresolved.length > 0) && (
                <button
                  onClick={save}
                  disabled={resolved.unresolved.length > 0}
                  className="dojo-cta w-full sm:w-auto px-4 py-3 rounded transition-colors text-base font-medium disabled:opacity-50"
                >
                  {resolved.unresolved.length > 0
                    ? t('paste.settleFirst')
                    : t('paste.save', { date: formatDate(date, lang), n: presentCount })}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
