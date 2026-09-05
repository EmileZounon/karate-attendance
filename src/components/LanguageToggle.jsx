import { useLang } from '../i18n';

const OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本語' },
];

// Two-segment pill. The active segment is stamped hinomaru red like an
// active tab; the other reads as a quiet outline button.
export default function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useLang();
  return (
    <div
      role="group"
      aria-label={t('lang.switch')}
      className={`inline-flex overflow-hidden rounded-lg border border-line2 text-xs font-medium ${className}`}
    >
      {OPTIONS.map((o) => {
        const active = lang === o.code;
        return (
          <button
            key={o.code}
            type="button"
            aria-pressed={active}
            onClick={() => setLang(o.code)}
            className={`px-2.5 py-1.5 transition-colors ${
              active ? 'bg-hinomaru text-white' : 'bg-sumi2 text-gidim hover:bg-sumi3 hover:text-gi'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
