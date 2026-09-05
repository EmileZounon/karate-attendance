import { NEW_STUDENT } from '../utils/nameSimilarity';
import { useLang } from '../i18n';

// One row per pasted spelling that is close to somebody already on the roster.
// Each row is a radio choice: a roster name (pre-selected when there is only
// one) or "add as a new student". A row with no choice yet is outlined in gold
// and the parent keeps its save button disabled until it is settled.
//
// rows        : parseNameList(...).closeMatches
// resolutions : { [pastedName]: rosterName | NEW_STUDENT | null }
// onPick      : (pastedName, value) => void
// idPrefix    : keeps radio groups apart if two paste tools are on one page
export default function DidYouMean({ rows, resolutions, onPick, idPrefix = 'dym' }) {
  const { t } = useLang();
  if (!rows || rows.length === 0) return null;
  const open = rows.filter((r) => resolutions[r.name] == null).length;

  return (
    <div>
      <h3 className="font-semibold text-sm font-serif text-gi mb-1">
        {t('dym.title', { n: rows.length })}
      </h3>
      <p className="text-xs text-gifaint mb-2">
        {t('dym.hint')}
        {open > 0 && (
          <span className="block text-gold mt-1">
            {open === 1 ? t('dym.open.one') : t('dym.open.many', { n: open })}
          </span>
        )}
      </p>
      <div className="space-y-2">
        {rows.map((r) => {
          const pick = resolutions[r.name];
          const group = `${idPrefix}-${r.name}`;
          return (
            <fieldset
              key={r.name}
              className={`rounded-lg border px-3 pb-2 pt-1 ${pick == null ? 'border-gold' : 'border-line2'}`}
            >
              <legend className="px-1 text-sm text-gi">
                {t('dym.youPasted')} <span className="font-semibold">“{r.raw}”</span>
              </legend>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {r.candidates.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-gi py-1">
                    <input
                      type="radio"
                      name={group}
                      checked={pick === c}
                      onChange={() => onPick(r.name, c)}
                      className="h-5 w-5 shrink-0 accent-hinomaru"
                    />
                    <span>{c}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm text-gidim py-1">
                  <input
                    type="radio"
                    name={group}
                    checked={pick === NEW_STUDENT}
                    onChange={() => onPick(r.name, NEW_STUDENT)}
                    className="h-5 w-5 shrink-0 accent-hinomaru"
                  />
                  <span>{t('dym.addNew', { name: r.name })}</span>
                </label>
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
