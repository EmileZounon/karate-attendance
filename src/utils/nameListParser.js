// Pure parser for turning a pasted block of text (e.g. a WhatsApp list) into
// student names. No React, no DOM — easy to test in isolation.
//
// parseNameList(rawText, existingStudents) -> { newNames, duplicates, skipped, closeMatches }
//   newNames     : [{ name, raw }]              names that look real, not on the roster, and not close to anyone on it
//   duplicates   : [string]                     existing roster spelling for names already present
//   skipped      : [{ raw }]                    lines that do not look like names (dates, "class 19", ...)
//   closeMatches : [{ name, raw, candidates }]  unknown spellings that are probably a typo of a roster name;
//                                               candidates = roster names to offer as "Did you mean?"

import { findCloseMatches } from './nameSimilarity.js';

const MONTHS = new Set([
  'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april',
  'may', 'jun', 'june', 'jul', 'july', 'aug', 'august', 'sep', 'sept',
  'september', 'oct', 'october', 'nov', 'november', 'dec', 'december',
]);

// Explicit separators the teacher typed on purpose: line breaks, commas,
// semicolons. Their presence anywhere in the paste means boundaries are known.
const EXPLICIT_SEPARATORS = /[\n,;]/;
const SPLIT_ON_EXPLICIT = /[\n,;]+/;
// Fallback for a single delimiter-free line like "angel ib emile".
const SPLIT_ON_WHITESPACE = /\s+/;

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

// Decide how to cut a raw paste into tokens.
//
// Returns the RegExp to pass to String.split().
//
// The trade-off: a comma is the teacher saying "boundary here". A space is not,
// which is why "Danny Thomas BU" must stay one name in a multi-line paste. But
// when someone types "angel ib emile" as a single line with no separator at
// all, the only sane reading is three students.
//
// A trailing comma/semicolon/newline is leftover punctuation, not a boundary
// between two names, so ignore it when deciding.
function chooseSplitter(rawText) {
  const meaningful = rawText.replace(/[\s,;]+$/, '');
  return EXPLICIT_SEPARATORS.test(meaningful) ? SPLIT_ON_EXPLICIT : SPLIT_ON_WHITESPACE;
}

export function parseNameList(rawText, existingStudents = []) {
  const existingByLower = new Map();
  for (const s of existingStudents) {
    existingByLower.set(s.trim().toLowerCase(), s);
  }

  const newNames = [];
  const duplicates = [];
  const skipped = [];
  const closeMatches = [];
  const seenNew = new Set(); // lower-cased unknown names already handled this paste
  const seenDup = new Set(); // lower-cased duplicates already reported

  const text = String(rawText || '');
  const tokens = text.split(chooseSplitter(text));

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

    // Not an exact match: is it a near miss of someone already on the roster?
    const candidates = findCloseMatches(name, existingStudents);
    if (candidates.length) {
      closeMatches.push({ name, raw: token.trim(), candidates });
      continue;
    }
    newNames.push({ name, raw: token.trim() });
  }

  return { newNames, duplicates, skipped, closeMatches };
}
