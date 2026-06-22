// Standalone test for the pure name-list parser.
// Run: node scripts/test-nameListParser.mjs
import { parseNameList } from '../src/utils/nameListParser.js';

let passed = 0;
let failed = 0;

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}\n       expected ${e}\n       got      ${a}`);
  }
}

const names = (r) => r.newNames.map((n) => n.name);
const skippedLines = (r) => r.skipped.map((s) => s.raw);

// 1. Messy screenshot-style paste: names extracted, date/class lines skipped.
{
  const text = `08 mar 26 sunday(9) class 19
Vazrik
Amandine
05 Mar 2026
01 Mar 2026 (13) Class 17
Danny Thomas BU`;
  const r = parseNameList(text, []);
  eq(names(r), ['Vazrik', 'Amandine', 'Danny Thomas BU'], 'messy paste -> names only');
  eq(skippedLines(r), ['08 mar 26 sunday(9) class 19', '05 Mar 2026', '01 Mar 2026 (13) Class 17'], 'messy paste -> junk skipped');
  eq(r.duplicates, [], 'messy paste -> no duplicates');
}

// 2. Clean comma list, case-insensitive dedup against existing roster.
{
  const roster = ['Ib', 'Angel', 'Varak', 'Paul', 'Ricardo'];
  const r = parseNameList('IB, angel, varak, paul, julia, ricardo', roster);
  eq(names(r), ['julia'], 'comma list -> only julia is new (case-insensitive)');
  // duplicates report the existing app spelling, not the typed spelling.
  eq(r.duplicates.sort(), ['Angel', 'Ib', 'Paul', 'Ricardo', 'Varak'], 'comma list -> rest are duplicates (app spelling)');
}

// 3. In-paste duplicates collapse to one (first spelling wins).
{
  const r = parseNameList('John\njohn\nJOHN', []);
  eq(names(r), ['John'], 'in-paste dupes collapse to one');
}

// 4. Bullets and numbering stripped; bare month words skipped.
{
  const r = parseNameList('1. Maria\n- Pedro\n• Lucia\nMarch', []);
  eq(names(r), ['Maria', 'Pedro', 'Lucia'], 'bullets/numbering stripped');
  eq(skippedLines(r), ['March'], 'bare month word skipped');
}

// 5. Empty / whitespace input -> all empty, no crash.
{
  const r = parseNameList('   \n\n  ', []);
  eq(names(r), [], 'whitespace-only -> no names');
  eq(r.duplicates, [], 'whitespace-only -> no duplicates');
  eq(r.skipped, [], 'whitespace-only -> nothing skipped (empty lines dropped silently)');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
