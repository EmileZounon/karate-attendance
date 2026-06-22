# Paste Names (Bulk Add) — Design

**Date:** 2026-06-21
**Status:** Approved, ready to implement

## Problem

Adding students one at a time through the single "Add Student" box is slow when a
whole list of names exists (e.g. copied from WhatsApp). The teacher wants to paste
a list and have new students added directly, without scrolling the roster to find
and add each name by hand. The manual single-add stays for the times the manual
touch is wanted.

## Input the feature must handle

Two real shapes:

1. **Clean list** — `IB, angel, varak, paul, julia, ricardo` (comma or newline
   separated, casual casing).
2. **Messy paste** — a screenshot-style list with section headers mixed in:
   ```
   08 mar 26 sunday(9) class 19
   Vazrik
   Amandine
   05 Mar 2026
   01 Mar 2026 (13) Class 17
   Danny Thomas BU
   ```
   Checkmarks in the source are UI icons, not text, so they do not arrive on paste.

## Approach

Auto-filter the junk, then let the user review a checklist before committing.
Existing names are skipped (case-insensitive). Mirrors the existing Word-doc
import's "preview, then confirm" pattern.

## Components

### 1. Pure parser — `src/utils/nameListParser.js`

`parseNameList(rawText, existingStudents) -> { newNames, duplicates, skipped }`

Per token (split on newlines **and** commas):
1. Strip leading bullets / numbering (`1.`, `2)`, `-`, `*`, `•`, `·`) and trailing
   checkmark/emoji/whitespace, then trim.
2. Classify:
   - **skipped** — empty after cleaning, OR contains any digit (`05 Mar 2026`,
     `class 19`, `(13)`, `(9)`), OR is a bare month name (`mar`, `march`, ...).
   - **duplicate** — matches an entry in `existingStudents` (case-insensitive,
     trimmed). Preserves the existing app spelling in the result.
   - **newName** — everything else. Multi-word names ("Danny Thomas BU") preserved.
3. Dedupe within the paste itself, case-insensitively (first spelling wins).

Returns three arrays. `newNames` are objects `{ name, raw }`; `skipped` carries the
original line so the UI can show what was dropped. Pure and synchronous — no React,
no DOM.

### 2. UI component — `src/components/PasteNamesBulkAdd.jsx`

- Collapsible section "Paste Names (bulk add)" rendered in `ManageStudentsTab`,
  directly under the single Add Student box, above the Word import.
- A `<textarea>` + "Preview" button.
- Preview renders three groups:
  - **New names** — checkboxes, all checked by default.
  - **Doesn't look like a name** — the `skipped` lines as checkboxes, all
    *unchecked*. Lets the user rescue a real name the filter wrongly dropped.
  - **Already in app** — duplicates, greyed text, count only, not addable.
- "Add N students" commits the checked items (new + any rescued skipped) via the
  existing `onImport`/`updateStudents([...students, ...selected])` path — same
  atomic write and auto-backup already in place. Re-checks duplicates at commit
  time so a rescued line that collides is not double-added.
- After commit: success message, textarea cleared, preview reset.

## Data flow

textarea text → `parseNameList(text, students)` → preview state → user toggles
checkboxes → "Add" → `onImport([...students, ...checkedNames])` → existing
`updateStudents` (Firestore write + auto-backup).

No changes to the storage shape: students remain a flat array of name strings.

## Error / empty states

- Empty textarea or no tokens → "Nothing to preview" message, no crash.
- All names already exist → preview shows the "Already in app" group and a
  "No new names to add" note; Add button hidden.
- Whitespace-only lines dropped silently.

## Testing

`parseNameList` is pure, so a standalone Node script (`scripts/test-nameListParser.mjs`)
asserts:
- The messy screenshot block yields `Vazrik, Amandine, Danny Thomas BU` as names
  and skips `08 mar 26 sunday(9) class 19`, `05 Mar 2026`, `01 Mar 2026 (13) Class 17`.
- `IB, angel, varak, paul, julia, ricardo` against a roster containing
  `Ib/Angel/Varak/Paul/Ricardo` yields exactly `Julia` as new, the rest as
  duplicates (case-insensitive).
- In-paste duplicates collapse to one.

The repo has no test runner; this script runs with `node` directly. UI verified
with a dev build.

## Out of scope (YAGNI)

- Importing attendance/dates from the paste (names only).
- Phone-number parsing, OCR from images.
- Adding a test framework to the repo.
