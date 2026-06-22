// Pure parser for turning a pasted block of text (e.g. a WhatsApp list) into
// student names. No React, no DOM — easy to test in isolation.
//
// parseNameList(rawText, existingStudents) -> { newNames, duplicates, skipped }
//   newNames   : [{ name, raw }]  names that look real and are not already on the roster
//   duplicates : [string]         existing roster spelling for names already present
//   skipped    : [{ raw }]        lines that do not look like names (dates, "class 19", ...)

const MONTHS = new Set([
  'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april',
  'may', 'jun', 'june', 'jul', 'july', 'aug', 'august', 'sep', 'sept',
  'september', 'oct', 'october', 'nov', 'november', 'dec', 'december',
]);

// Leading list markers: "1.", "2)", "-", "*", "•", "·" followed by space(s).
const LEADING_MARKER = /^\s*(?:\d+[.)]|[-*•·])\s+/;
// Trailing checkmarks / common emoji / stray punctuation + whitespace.
const TRAILING_JUNK = /[\s✅✔✓️.,;:]+$/;

function clean(line) {
  return line.replace(LEADING_MARKER, '').replace(TRAILING_JUNK, '').trim();
}

function looksLikeJunk(name) {
  if (!name) return true;
  if (/\d/.test(name)) return true; // any digit => date / class line, not a name
  if (MONTHS.has(name.toLowerCase())) return true; // bare month word
  return false;
}

export function parseNameList(rawText, existingStudents = []) {
  const existingByLower = new Map();
  for (const s of existingStudents) {
    existingByLower.set(s.trim().toLowerCase(), s);
  }

  const newNames = [];
  const duplicates = [];
  const skipped = [];
  const seenNew = new Set(); // lower-cased names already added this paste
  const seenDup = new Set(); // lower-cased duplicates already reported

  const tokens = String(rawText || '').split(/[\n,;]+/);

  for (const token of tokens) {
    if (!token.trim()) continue; // drop empty lines silently
    const name = clean(token);
    if (!name) continue;

    if (looksLikeJunk(name)) {
      skipped.push({ raw: token.trim() });
      continue;
    }

    const lower = name.toLowerCase();
    if (existingByLower.has(lower)) {
      if (!seenDup.has(lower)) {
        seenDup.add(lower);
        duplicates.push(existingByLower.get(lower)); // report app's spelling
      }
      continue;
    }

    if (seenNew.has(lower)) continue; // in-paste duplicate
    seenNew.add(lower);
    newNames.push({ name, raw: token.trim() });
  }

  return { newNames, duplicates, skipped };
}
