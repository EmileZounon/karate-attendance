// Standalone test for the near-match helper behind "Did you mean?".
// Run: node scripts/test-nameSimilarity.mjs
import { findCloseMatches, initialResolutions, applyResolutions, NEW_STUDENT } from '../src/utils/nameSimilarity.js';

let passed = 0;
let failed = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}\n       expected ${e}\n       got      ${a}`); }
}

// The live roster on 2026-09-05, after the duplicate cleanup.
const ROSTER = [
  'Aidan', 'Amandine', 'Anelisa', 'Angel', 'Barkev', 'Benjamin BU', 'Bruce', 'Cassiano',
  'Dani Thomas', 'Dmitry', 'Emile', 'Ewa', 'Fides (H)', 'Gabriel', 'Ib', 'Jessie BU',
  'Julia G', 'Julia S', 'Justina', 'Laura', 'Maggie', 'Marcella', 'Maria', 'Marylin',
  'Matteos', 'Munawwar', 'Myriam', 'Ohta', 'Paul', 'Peiqi', 'Qiu Yu Hong Lu', 'Ricardo',
  'Rose', 'Sage', 'Sasiru', 'Sevara', 'Tilly (H)', 'Varak', 'Vashnavi', 'Vazrik', 'Xiangja',
];

console.log('Historical typos that created duplicate rows:');
eq(findCloseMatches('Matheus', ROSTER), ['Matteos'], 'Matheus -> Matteos (two typos in a 7-letter name)');
eq(findCloseMatches('Anelise', ROSTER), ['Anelisa'], 'Anelise -> Anelisa');
eq(findCloseMatches('Myrian', ROSTER), ['Myriam'], 'Myrian -> Myriam');
eq(findCloseMatches('Fideis', ROSTER), ['Fides (H)'], 'Fideis -> Fides (H), tag ignored');
eq(findCloseMatches('Marcela', ROSTER), ['Marcella'], 'Marcela -> Marcella');
eq(findCloseMatches('Aiden', ROSTER), ['Aidan'], 'Aiden -> Aidan');
eq(findCloseMatches('Emilia', ROSTER), ['Emile'], 'Emilia -> Emile');
eq(findCloseMatches('Julia Santos', ROSTER), ['Julia S'], 'Julia Santos -> Julia S only (not Julia G)');

console.log('First-name shortcuts:');
eq(findCloseMatches('Fides', ROSTER), ['Fides (H)'], 'Fides -> Fides (H)');
eq(findCloseMatches('Benjamin', ROSTER), ['Benjamin BU'], 'Benjamin -> Benjamin BU');
eq(findCloseMatches('Dani', ROSTER), ['Dani Thomas'], 'Dani -> Dani Thomas');
eq(findCloseMatches('Julia', ROSTER), ['Julia G', 'Julia S'], 'bare Julia is ambiguous: both Julias, alphabetical');
eq(findCloseMatches('Julai', ROSTER), ['Julia G', 'Julia S'], 'typo in the first name still finds both Julias');

console.log('Small typos and normalisation:');
eq(findCloseMatches('Pual', ROSTER), ['Paul'], 'a swapped pair counts as one typo');
eq(findCloseMatches('Sévara', ROSTER), ['Sevara'], 'accents are ignored');
eq(findCloseMatches('matteos', ROSTER), ['Matteos'], 'case is ignored');
eq(findCloseMatches('Dmitri', ROSTER), ['Dmitry'], 'Dmitri -> Dmitry');

console.log('Must NOT match:');
eq(findCloseMatches('Lior', ROSTER), [], 'a genuinely new student gets no suggestion');
eq(findCloseMatches('Ab', ROSTER), [], 'two-letter names never fuzzy-match (Ib stays exact-only)');
eq(findCloseMatches('Ibb', ROSTER), [], 'three letters: exact only');
eq(findCloseMatches('Sarah', ROSTER), [], 'Sarah is not Sage or Sasiru');
eq(findCloseMatches('Thomas', ROSTER), [], 'a last name alone does not match');
eq(findCloseMatches('', ROSTER), [], 'empty input');

console.log('Known near-pairs on the roster (each name looked up with itself removed):');
{
  const collisions = [];
  for (const a of ROSTER) {
    const others = ROSTER.filter((x) => x !== a);
    const hits = findCloseMatches(a, others);
    if (hits.length) collisions.push([a, hits]);
  }
  // Documented: the two Julias, Myriam~Maria, Vazrik~Varak. Anything new here
  // means a roster addition sits within typo range of an existing student.
  eq(collisions, [
    ['Julia G', ['Julia S']], ['Julia S', ['Julia G']], ['Myriam', ['Maria']], ['Vazrik', ['Varak']],
  ], 'only the four documented near-pairs');
}

console.log('Resolving "Did you mean?" rows:');
{
  const rows = [
    { name: 'Matheus', raw: 'Matheus', candidates: ['Matteos'] },
    { name: 'Julia', raw: 'Julia', candidates: ['Julia G', 'Julia S'] },
    { name: 'Fideis', raw: 'Fideis', candidates: ['Fides (H)'] },
  ];
  const init = initialResolutions(rows);
  eq(init, { Matheus: 'Matteos', Julia: null, Fideis: 'Fides (H)' }, 'one candidate is pre-selected, a tie is left open');

  const picked = { ...init, Julia: 'Julia S', Fideis: NEW_STUDENT };
  eq(applyResolutions(rows, picked), { present: ['Matteos', 'Julia S'], added: ['Fideis'], unresolved: [] },
    'roster picks become present, a "new student" pick is added under the pasted spelling');

  eq(applyResolutions(rows, init), { present: ['Matteos', 'Fides (H)'], added: [], unresolved: ['Julia'] },
    'an open tie is reported as unresolved');

  eq(applyResolutions([], {}), { present: [], added: [], unresolved: [] }, 'no rows, nothing to do');

  const twoTypos = [
    { name: 'Matheus', raw: 'Matheus', candidates: ['Matteos'] },
    { name: 'Mateus', raw: 'Mateus', candidates: ['Matteos'] },
  ];
  eq(applyResolutions(twoTypos, initialResolutions(twoTypos)), { present: ['Matteos'], added: [], unresolved: [] },
    'two typos of one student mark that student present once');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
