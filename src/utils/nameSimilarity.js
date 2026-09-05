// Near-match helper behind the "Did you mean?" step of the paste tools.
//
// findCloseMatches(pastedName, roster) -> [rosterName, ...]
//   Roster names the pasted spelling is probably meant to be, closest tier
//   only, alphabetical within a tie. Empty when nothing is close enough.
//
// Exact (case-insensitive) matching is the caller's job; this only runs on
// what fell through, so a correct spelling never becomes a suggestion.

// Drop accents, case, parenthesised tags "(H)" and short ALL-CAPS tokens like
// "BU", then collapse whitespace. "Fides (H)" and "Benjamin BU" become the
// bare first names teachers actually type.
export function normalizeName(name) {
  return String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok && !/^[A-Z]{2,3}$/.test(tok))
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Typos tolerated for a name of `len` letters: none for tiny names (Ib, Ewa),
// one up to five letters, two beyond. Length-aware so "Ab" never becomes "Ib".
export function tolerance(len) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

// Optimal string alignment distance: insert, delete, substitute, or swap two
// adjacent letters each cost 1, so "Pual" -> "Paul" is 1, not 2.
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

// How close `pasted` is to one normalised roster name, or null if not close.
// Two ways in:
//   1. whole-name typo: distance within the tolerance for the pasted length.
//   2. first-name match: first words within tolerance AND whatever follows on
//      one side is a prefix of the other. So "julia" ~ "julia g",
//      "julia santos" ~ "julia s", but "julia santos" is not "julia g".
function closeness(pasted, rosterNorm) {
  if (!pasted || !rosterNorm) return null;
  const whole = editDistance(pasted, rosterNorm);
  if (whole <= tolerance(pasted.length)) return whole;

  const [pFirst, ...pRest] = pasted.split(' ');
  const [rFirst, ...rRest] = rosterNorm.split(' ');
  const firstDist = editDistance(pFirst, rFirst);
  if (firstDist > tolerance(pFirst.length)) return null;
  const pTail = pRest.join(' ');
  const rTail = rRest.join(' ');
  return pTail.startsWith(rTail) || rTail.startsWith(pTail) ? firstDist : null;
}

export function findCloseMatches(pastedName, roster = []) {
  const pasted = normalizeName(pastedName);
  if (!pasted) return [];
  const scored = [];
  for (const name of roster) {
    const score = closeness(pasted, normalizeName(name));
    if (score !== null) scored.push({ name, score });
  }
  if (!scored.length) return [];
  // Closest tier only: a one-letter slip should not drag in a two-letter one.
  const best = Math.min(...scored.map((s) => s.score));
  return scored
    .filter((s) => s.score === best)
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b));
}

// ---- Resolving "Did you mean?" rows -------------------------------------
//
// The paste tools keep one choice per close-match row: a roster name, or
// NEW_STUDENT to add the pasted spelling as a new row anyway. `null` means the
// teacher still has to pick, which blocks saving.
export const NEW_STUDENT = '__new_student__';

// A single candidate is pre-selected; a tie stays open so nobody is guessed.
export function initialResolutions(rows) {
  const out = {};
  for (const r of rows) out[r.name] = r.candidates.length === 1 ? r.candidates[0] : null;
  return out;
}

// Turn the choices into what the save should do.
//   present    : roster names to mark present (deduplicated)
//   added      : pasted spellings to add as new students
//   unresolved : pasted spellings still waiting for a choice
export function applyResolutions(rows, resolutions) {
  const present = [];
  const added = [];
  const unresolved = [];
  for (const r of rows) {
    const pick = resolutions[r.name];
    if (pick == null) unresolved.push(r.name);
    else if (pick === NEW_STUDENT) { if (!added.includes(r.name)) added.push(r.name); }
    else if (!present.includes(pick)) present.push(pick);
  }
  return { present, added, unresolved };
}
