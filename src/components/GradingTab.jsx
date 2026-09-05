import { grading2026 } from '../data/grading2026';
import { useLang } from '../i18n';

// Highest celebration first: the new black belts, then the new licensed
// instructors. Each rank carries its kanji and a short plain-English label.
const RANKS = [
  { key: 'shodan',      kanji: '初段',   titleKey: 'dan.shodan.title',      labelKey: 'dan.shodan.label',      accent: 'gold' },
  { key: 'nidan',       kanji: '弐段',   titleKey: 'dan.nidan.title',       labelKey: 'dan.nidan.label',       accent: 'gold' },
  { key: 'instructors', kanji: '指導員', titleKey: 'dan.instructors.title', labelKey: 'dan.instructors.label', accent: 'indigo' },
];

export default function GradingTab() {
  const { t } = useLang();
  return (
    <div className="max-w-md mx-auto">
      <header className="mb-6">
        <div className="font-serif text-xs tracking-[0.16em] uppercase text-gidim">{t('dan.eyebrow')}</div>
        <h2 className="font-serif text-2xl text-gi mt-1">{t('dan.title')}</h2>
        <p className="text-sm text-gidim mt-0.5">JKA · {t('dan.date')}</p>
        <span className="dojo-brush mt-3" />
      </header>

      {RANKS.map(rank => {
        const names = grading2026[rank.key] || [];
        if (!names.length) return null;
        const isGold = rank.accent === 'gold';
        return (
          <section key={rank.key} className="mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`font-serif text-lg ${isGold ? 'text-gold' : 'text-indigosoft'}`}>{rank.kanji}</span>
              <h3 className="font-serif text-lg text-gi">{t(rank.titleKey)}</h3>
              <span className="text-xs text-gifaint ml-auto text-right">{t(rank.labelKey)}</span>
            </div>
            <div className="dojo-card divide-y divide-line">
              {names.map(name => {
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <div key={name} className="flex items-center gap-3 p-3">
                    <div className={`w-9 h-9 rounded-lg grid place-items-center font-bold text-sm flex-shrink-0 ${isGold ? 'bg-gold text-sumi' : 'bg-indigoink text-white'}`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0 text-gi font-medium truncate">{name}</div>
                    <span className="text-lg flex-shrink-0" aria-hidden="true">🥋</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="text-center mt-8">
        <span className="dojo-brush mx-auto mb-3" />
        <p className="text-sm text-gifaint">{t('dan.congrats')}</p>
      </div>
    </div>
  );
}
