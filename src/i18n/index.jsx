import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';
import ja from './ja';
import { makeT, normalizeLang, DEFAULT_LANG } from './translate';

// Language context for the whole app. Reads the saved choice, exposes
// { lang, setLang, t } to every component, and keeps <html lang> in sync.
const DICTS = { en, ja };
const STORAGE_KEY = 'karate-lang';

const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: makeT(DEFAULT_LANG, DICTS),
});

function readStoredLang() {
  try {
    return normalizeLang(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LANG;
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  const setLang = (next) => {
    const value = normalizeLang(next);
    setLangState(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* storage unavailable, keep in memory */ }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: makeT(lang, DICTS) }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
