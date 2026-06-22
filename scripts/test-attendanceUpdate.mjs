// Standalone test for the pure attendance-update builder.
// Run: node scripts/test-attendanceUpdate.mjs
import { buildAttendanceUpdate } from '../src/utils/attendanceUpdate.js';

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

const roster = ['Ib', 'Angel', 'Varak', 'Paul', 'Julia', 'Ricardo', 'Cassiano'];

// 1. Present get 1, everyone else 0, for the chosen date only.
{
  const att = {};
  const out = buildAttendanceUpdate('2026-06-21', att, ['Ib', 'Angel', 'Paul'], roster);
  eq(out['2026-06-21'], {
    Ib: 1, Angel: 1, Varak: 0, Paul: 1, Julia: 0, Ricardo: 0, Cassiano: 0,
  }, 'present -> 1, others -> 0');
}

// 2. Other dates are left untouched.
{
  const att = { '2026-06-18': { Ib: 1, Angel: 0 } };
  const out = buildAttendanceUpdate('2026-06-21', att, ['Ib'], roster);
  eq(out['2026-06-18'], { Ib: 1, Angel: 0 }, 'other dates untouched');
  eq(out['2026-06-21'].Ib, 1, 'new date Ib present');
  eq(out['2026-06-21'].Angel, 0, 'new date Angel absent');
}

// 3. Overwriting a date with existing data fully replaces that day.
{
  const att = { '2026-06-21': { Cassiano: 1, Ib: 1, Angel: 1 } };
  const out = buildAttendanceUpdate('2026-06-21', att, ['Paul'], roster);
  eq(out['2026-06-21'], {
    Ib: 0, Angel: 0, Varak: 0, Paul: 1, Julia: 0, Ricardo: 0, Cassiano: 0,
  }, 'overwrite replaces whole day (old present become 0)');
}

// 4. A newly added student (in allStudents + presentNames) is marked present.
{
  const att = {};
  const rosterPlus = [...roster, 'Danny Thomas BU'];
  const out = buildAttendanceUpdate('2026-06-21', att, ['Ib', 'Danny Thomas BU'], rosterPlus);
  eq(out['2026-06-21']['Danny Thomas BU'], 1, 'newly added student present');
  eq(out['2026-06-21'].Ib, 1, 'matched student present');
  eq(out['2026-06-21'].Varak, 0, 'untouched student absent');
}

// 5. Input attendance object is not mutated.
{
  const att = { '2026-06-21': { Cassiano: 1 } };
  buildAttendanceUpdate('2026-06-21', att, ['Ib'], roster);
  eq(att, { '2026-06-21': { Cassiano: 1 } }, 'input not mutated');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
