// Pure translation core. No React and no DOM, so plain node can test it.
//
// makeT(lang, dicts) -> t(key, vars)
//   Looks the key up in the active dictionary, then English, then returns the
//   key itself. A missing Japanese string therefore shows English, never a
//   blank. `vars` fills {placeholder} slots.

export const LANGS = ['en', 'ja'];
export const DEFAULT_LANG = 'en';

// Only bare identifiers in braces are placeholders. "{ students, attendance }"
// in a copy string is left alone.
const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

export function interpolate(str, vars = {}) {
  return String(str).replace(PLACEHOLDER, (match, key) =>
    key in vars ? String(vars[key]) : match
  );
}

export function makeT(lang, dicts) {
  const active = dicts[lang] || {};
  const base = dicts[DEFAULT_LANG] || {};
  return (key, vars) => {
    const str = active[key] ?? base[key] ?? key;
    return vars ? interpolate(str, vars) : str;
  };
}

export function normalizeLang(value) {
  return LANGS.includes(value) ? value : DEFAULT_LANG;
}
