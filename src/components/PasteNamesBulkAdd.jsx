import { useState } from 'react';
import { parseNameList } from '../utils/nameListParser';
import { initialResolutions, applyResolutions } from '../utils/nameSimilarity';
import DidYouMean from './DidYouMean';
import { useLang } from '../i18n';

// Bulk-add students by pasting a list (e.g. copied from WhatsApp).
// Parses the text, lets the teacher review, then adds only the checked names.
// `students` is the current roster; `onAdd(newNamesArray)` appends them.
export default function PasteNamesBulkAdd({ students, onAdd }) {
  const { t } = useLang();
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
    setDone(t(toAdd.length > 1 ? 'bulk.added.many' : 'bulk.added.one', { n: toAdd.length }));
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
        <h2 className="text-lg font-serif text-gi">{t('bulk.title')}</h2>
        <span className="text-gifaint text-sm">{open ? t('paste.hide') : t('paste.show')}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-gidim">
            {t('bulk.intro')}
          </p>
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
              disabled={!text.trim()}
              className="dojo-cta w-full sm:w-auto px-4 py-2.5 disabled:opacity-50"
            >
              {t('paste.preview')}
            </button>
            {(preview || text) && (
              <button
                onClick={reset}
                className="dojo-ghost w-full sm:w-auto px-4 py-2.5"
              >
                {t('paste.clear')}
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
                    {t('bulk.newNames', { n: preview.newNames.length })}
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
                <p className="text-sm text-gifaint">{t('bulk.noNew')}</p>
              )}

              {/* Close to an existing student: pick who was meant */}
              <DidYouMean rows={preview.closeMatches} resolutions={resolutions} onPick={pick} idPrefix="add" />

              {/* Rescuable skipped lines */}
              {preview.skipped.length > 0 && (
                <div>
                  <h3 className="font-serif text-sm text-gi mb-1">
                    {t('paste.skipped', { n: preview.skipped.length })}
                  </h3>
                  <p className="text-xs text-gifaint mb-2">
                    {t('paste.skippedHint')}
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
                    {t('bulk.alreadyIn', { n: alreadyIn.length })}
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
                    ? t('bulk.settleFirst')
                    : t(selectedCount > 1 ? 'bulk.add.many' : 'bulk.add.one', { n: selectedCount })}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
