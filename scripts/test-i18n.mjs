// Standalone test for the i18n dictionaries and the pure translate core.
// Run: node scripts/test-i18n.mjs
import en from '../src/i18n/en.js';
import ja from '../src/i18n/ja.js';
import { makeT, interpolate, normalizeLang, LANGS, DEFAULT_LANG } from '../src/i18n/translate.js';
import { readFileSync, readdirSync } from 'node:fs';

let passed = 0;
let failed = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}\n       expected ${e}\n       got      ${a}`); }
}

console.log('Dictionaries:');
{
  const enKeys = Object.keys(en).sort();
  const jaKeys = Object.keys(ja).sort();
  eq(enKeys.filter((k) => !(k in ja)), [], 'every English key exists in Japanese');
  eq(jaKeys.filter((k) => !(k in en)), [], 'every Japanese key exists in English');
  eq(enKeys.length > 100, true, 'dictionary is not a stub');
  const empty = [...enKeys.map((k) => ['en', k, en[k]]), ...jaKeys.map((k) => ['ja', k, ja[k]])]
    .filter(([, , v]) => typeof v !== 'string' || !v.trim())
    .map(([l, k]) => `${l}:${k}`);
  eq(empty, [], 'no empty strings');
  const PH = /\{([A-Za-z0-9_]+)\}/g;
  const lost = enKeys.filter((k) => {
    const want = [...(en[k].matchAll(PH))].map((m) => m[1]).sort();
    const have = [...((ja[k] || '').matchAll(PH))].map((m) => m[1]).sort();
    return JSON.stringify(want) !== JSON.stringify(have);
  });
  eq(lost, [], 'every {placeholder} survives translation');
  const dashes = [...enKeys.map((k) => ['en', k, en[k]]), ...jaKeys.map((k) => ['ja', k, ja[k]])]
    .filter(([, , v]) => /[–—]/.test(v))
    .map(([l, k]) => `${l}:${k}`);
  eq(dashes, [], 'no em or en dashes in any string');
}

console.log('translate core:');
{
  eq(LANGS, ['en', 'ja'], 'two languages');
  eq(DEFAULT_LANG, 'en', 'English is the default');
  eq(normalizeLang('ja'), 'ja', 'known language passes through');
  eq(normalizeLang('fr'), 'en', 'unknown language falls back to English');
  eq(normalizeLang(null), 'en', 'missing value falls back to English');
  eq(interpolate('Hello {name}, {n} classes', { name: 'Sage', n: 3 }), 'Hello Sage, 3 classes', 'placeholders are replaced');
  eq(interpolate('Expected { students, attendance }.', {}), 'Expected { students, attendance }.', 'braces with spaces are left alone');
  eq(interpolate('{missing} stays', {}), '{missing} stays', 'unknown placeholder is left visible, not blanked');

  const dicts = { en: { 'a.b': 'Hello {name}', 'only.en': 'English only' }, ja: { 'a.b': 'こんにちは {name}' } };
  const tja = makeT('ja', dicts);
  eq(tja('a.b', { name: 'Sage' }), 'こんにちは Sage', 'active language wins');
  eq(tja('only.en'), 'English only', 'missing Japanese falls back to English');
  eq(tja('nope.nothing'), 'nope.nothing', 'missing everywhere falls back to the key');
  const ten = makeT('en', dicts);
  eq(ten('a.b', { name: 'Sage' }), 'Hello Sage', 'English lookup');

  const realJa = makeT('ja', { en, ja });
  eq(realJa('nav.today'), '今日', 'real dictionary: nav.today');
  eq(makeT('en', { en, ja })('nav.today'), 'Today', 'real dictionary: nav.today in English');
}

console.log('Keys used in components exist:');
{
  const files = ['../src/App.jsx', ...readdirSync(new URL('../src/components/', import.meta.url)).filter((f) => f.endsWith('.jsx')).map((f) => '../src/components/' + f)];
  const used = new Set();
  for (const f of files) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/t\('([a-zA-Z.]+)'/g)) used.add(m[1]);
    for (const m of src.matchAll(/\? '([a-zA-Z.]+)' : '([a-zA-Z.]+)'/g)) { used.add(m[1]); used.add(m[2]); }
    for (const m of src.matchAll(/'((?:gate|nav|dan)\.[a-zA-Z.]+)'/g)) used.add(m[1]);
  }
  // Real keys look like `section.name`. Drop scan artifacts: `t('nav.' + tab)`
  // in App.jsx yields a bare `nav.` prefix (the seven nav.* keys are covered by
  // the explicit check below), and `createElement('a')` in ManageStudentsTab.jsx
  // trips the `t('` pattern via `Elemen` + `t(`.
  for (const k of [...used]) if (!k.includes('.') || k.endsWith('.')) used.delete(k);
  const missing = [...used].filter((k) => !(k in en));
  eq(missing, [], 'every key referenced in a component exists in en.js');
  eq(used.size > 100, true, 'the scan actually found keys');
  eq(['today','attendance','danExam','awards','charts','analytics','manage'].filter((k) => !(('nav.' + k) in en)), [], 'every nav tab key has a nav.* label');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
