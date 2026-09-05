# Japanese Language Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an EN | 日本語 toggle to the karate attendance app so every screen, hint, chart legend, dialog and date renders in Japanese, remembered per device, with the Excel export left in English.

**Architecture:** Two flat dictionaries (`src/i18n/en.js`, `src/i18n/ja.js`) with identical keys feed a `t(key, vars)` function exposed through a React context (`LanguageProvider` / `useLang()`). Date formatters in `dateUtils.js` take a trailing `lang` argument that defaults to `'en'`, so screens pass the active language and the Excel export, which passes nothing, stays English. Each component swaps its literals for `t()` calls; nothing else about the app changes.

**Tech Stack:** React 18, Vite, Tailwind, Recharts, Firebase (untouched). Tests are plain `node scripts/*.mjs` files, no runner.

**Spec:** `docs/superpowers/specs/2026-09-05-japanese-toggle-design.md`

## Global Constraints

- Work on branch `japanese-toggle` in a git worktree (superpowers:using-git-worktrees). `main` auto-deploys on push; do not push to `main` until Task 10.
- The worktree needs `node_modules`: symlink it from the main checkout (`ln -s <main-repo>/node_modules node_modules`) rather than running `npm ci` again.
- Commit as `emile.giovannie@gmail.com` (Vercel/GitHub attribution rule): `git -c user.email=emile.giovannie@gmail.com -c user.name="Emile Giovannie" commit ...`. End every commit message with the two trailer lines used throughout this repo today:
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_016EZNhgumvMeRCWxuSGQT8f`.
- No em dashes or en dashes in any user-facing string, English or Japanese. Use commas, periods, colons, the middle dot `·` already used by the app, or Japanese 、and 。. Three existing English strings contain an em dash; the plan replaces them with `·` or a comma when they move into the dictionary.
- Student names, numbers, emoji and the decorative kanji already in the theme (道場, 今日, 賞, 昇段, 押忍, 初段, 弐段, 指導員) are never translated.
- `public/classic/`, `public/sage/`, `public/v1/`, `public/v2/`, `src/data/defaults.js` and `firestore.rules` are not touched.
- The Excel export in `ManageStudentsTab.jsx` (`exportExcel`) must keep calling `formatDate(date)` and `getMonthLabel(mk)` with NO `lang` argument and must keep using `m.month` from `calculateMonthlySummary`. That is what keeps it English.
- Every task ends with `node scripts/test-i18n.mjs && node scripts/test-dateUtils.mjs && node scripts/test-nameListParser.mjs && node scripts/test-nameSimilarity.mjs && node scripts/test-attendanceUpdate.mjs` passing and `npm run build` succeeding.
- `t()` is always obtained inside a component via `const { t, lang } = useLang();`. Never import a dictionary directly into a component.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/i18n/translate.js` (create) | Pure, React-free: `LANGS`, `DEFAULT_LANG`, `interpolate()`, `makeT()`, `normalizeLang()`. Tested by node. |
| `src/i18n/en.js` (create) | Every English string, flat object, dotted keys. Source of truth for what labels exist. |
| `src/i18n/ja.js` (create) | Same keys, Japanese. |
| `src/i18n/index.jsx` (create) | `LanguageProvider`, `useLang()`. Reads/writes `localStorage['karate-lang']`, sets `document.documentElement.lang`. |
| `src/components/LanguageToggle.jsx` (create) | The EN / 日本語 pill. |
| `src/main.jsx` (modify) | Wrap `<App />` in `<LanguageProvider>`. |
| `src/utils/dateUtils.js` (modify) | `formatDate`, `getMonth`, `getMonthLabel` gain `lang = 'en'`. |
| `src/App.jsx` (modify) | Tabs become keys, header strings via `t()`, toggle in header. |
| `src/components/*.jsx` (modify, 12 files) | Literals become `t()` calls; dates pass `lang`. |
| `scripts/test-i18n.mjs` (create) | Key parity, empties, placeholders, fallback, `{ students, attendance }` is not a placeholder. |
| `scripts/test-dateUtils.mjs` (create) | The date table from the spec, both languages, default is English. |

---

### Task 0: Worktree and branch

**Files:** none (git only)

- [ ] **Step 1: Create the worktree** using the superpowers:using-git-worktrees skill, branch name `japanese-toggle`, based on current `main` (`4a6f835` or later).

- [ ] **Step 2: Link node_modules and confirm the toolchain works**

```bash
cd <worktree>
ln -s /Users/emilegio/ClaudeProjects/01-clients/hdki-karate/karate-attendance/node_modules node_modules
node scripts/test-nameSimilarity.mjs | tail -1 && npm run build 2>&1 | grep -E "built in|error"
```
Expected: `29 passed, 0 failed` and `✓ built in ...`.

---

### Task 1: Translation core and dictionaries

**Files:**
- Create: `src/i18n/translate.js`
- Create: `src/i18n/en.js`
- Create: `src/i18n/ja.js`
- Test: `scripts/test-i18n.mjs`

**Interfaces:**
- Produces: `makeT(lang, dicts) -> t(key, vars?)`, `interpolate(str, vars)`, `normalizeLang(value)`, `LANGS = ['en','ja']`, `DEFAULT_LANG = 'en'`, and the two dictionaries as default exports. Every later task uses the keys defined here and only these keys.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-i18n.mjs`:

```js
// Standalone test for the i18n dictionaries and the pure translate core.
// Run: node scripts/test-i18n.mjs
import en from '../src/i18n/en.js';
import ja from '../src/i18n/ja.js';
import { makeT, interpolate, normalizeLang, LANGS, DEFAULT_LANG } from '../src/i18n/translate.js';

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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/test-i18n.mjs`
Expected: error `Cannot find module '.../src/i18n/en.js'` (the modules do not exist yet).

- [ ] **Step 3: Create the translate core**

Create `src/i18n/translate.js`:

```js
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
```

- [ ] **Step 4: Create the English dictionary**

Create `src/i18n/en.js`. Every string the app shows, grouped by screen. Placeholders are `{name}` style.

```js
// Every user-facing English string in the app. Keys are dotted by screen.
// ja.js must carry exactly the same keys; scripts/test-i18n.mjs enforces it.
export default {
  // App shell
  'app.title': 'Karate Black Belt Program 2026',
  'app.titleShort': 'Karate Black Belt Program',
  'app.lastSaved': 'Last saved: {time}',
  'app.never': 'Never',
  'app.offline': '(offline mode)',
  'app.loading': 'Loading attendance data...',
  'lang.switch': 'Language',

  // Navigation
  'nav.today': 'Today',
  'nav.attendance': 'Attendance',
  'nav.danExam': 'Dan Exam',
  'nav.awards': 'Awards',
  'nav.charts': 'Charts',
  'nav.analytics': 'Analytics',
  'nav.manage': 'Manage Students',

  // Password gate
  'gate.prompt': 'Enter the team password to continue',
  'gate.placeholder': 'Team password',
  'gate.enter': 'Enter',
  'gate.entering': 'OOS. Enter in the Dojo.',
  'gate.error1': 'Keikoku. Try again.',
  'gate.error2': 'Hansoku-Chui. Do 2 Sochin and Try again.',
  'gate.error3': 'Hansoku. You are not among the descendants of Funakoshi and Tabata.',
  'gate.lockedTitle': 'Hansoku.',
  'gate.lockedBody': 'You are not among the descendants of Funakoshi and Tabata.',
  'gate.tryAgainIn': 'Try again in {time}',

  // Today
  'today.eyebrow': '{date} · Class {n}',
  'today.title': 'Today',
  'today.take': 'Take attendance',
  'today.takeFor': 'Take attendance · {date}',
  'today.lastClass': 'Last class · {date}',
  'today.present': '{n} present',
  'today.streak': '{name}, {n} consecutive classes',
  'today.noClasses': 'No classes recorded yet',
  'today.noClassesHint': 'Take your first attendance to start the record.',
  'today.expected': 'Expected today',
  'today.moreRegulars': 'and {n} more regular attendees',
  'today.noRegulars': 'No regular attendees yet. Record a few classes to populate this list.',

  // Attendance grid
  'att.clickHint': 'Click cells to toggle: 0 (Absent) ↔ 1 (Present)',
  'att.allMonths': 'All months',
  'att.date': 'Date',
  'att.total': 'Total',

  // Paste attendance
  'paste.title': 'Take attendance (paste who showed up)',
  'paste.hide': '▲ Hide',
  'paste.show': '▼ Show',
  'paste.classDate': 'Class date:',
  'paste.alreadyRecorded': '{date} already has {n} present recorded, they stay present',
  'paste.intro': 'Paste the list of who attended (commas or one per line, e.g. from WhatsApp). A single line of names split by spaces works too. They get marked present.',
  'paste.introMerge': 'Anyone already recorded for this date keeps their mark, so you can paste a latecomer on their own.',
  'paste.introFresh': 'Everyone else on the roster is marked absent for this date.',
  'paste.replaceDay': 'Replace the whole day instead',
  'paste.replaceWarn': '⚠ Wipes the {n} already recorded present. Only for fixing a wrong list.',
  'paste.placeholder': 'IB, angel, varak, paul, julia, ricardo\n\nor one name per line, pasted from WhatsApp',
  'paste.preview': 'Preview',
  'paste.clear': 'Clear',
  'paste.fromPaste': 'From your paste ({n})',
  'paste.noneMatched': 'No pasted names matched the roster.',
  'paste.alreadyPresentSuffix': 'already present, no change',
  'paste.kept': 'Already present, kept ({n})',
  'paste.keptHint': 'Recorded earlier for this date. This save leaves them present.',
  'paste.notOnRoster': 'Not on roster ({n})',
  'paste.notOnRosterHint': 'Tick to add them to the roster and mark present for this date.',
  'paste.skipped': "Doesn't look like a name ({n})",
  'paste.skippedHint': 'Skipped (dates, class lines, etc). Tick any that are actually a student.',
  'paste.absent': 'Will be marked absent ({n})',
  'paste.none': 'None',
  'paste.save': 'Save attendance for {date} ({n} present)',
  'paste.settleFirst': 'Settle the "Did you mean?" choices to save',
  'paste.saved': 'Saved {date}: {present} present, {absent} absent',
  'paste.savedAdded.one': ', 1 new student added.',
  'paste.savedAdded.many': ', {n} new students added.',
  'paste.savedEnd': '.',

  // Did you mean?
  'dym.title': 'Did you mean? ({n})',
  'dym.hint': 'These spellings are close to someone already on the roster, so they were not added as new students. Pick who you meant.',
  'dym.open.one': '⚠ One spelling still needs a choice before you can save.',
  'dym.open.many': '⚠ {n} spellings still need a choice before you can save.',
  'dym.youPasted': 'You pasted',
  'dym.addNew': 'No, add “{name}” as a new student',

  // Paste names (bulk add)
  'bulk.title': 'Paste Names (bulk add)',
  'bulk.intro': 'Paste a list of names, one per line or separated by commas. Forgot the commas? A single line like "angel ib emile" works too. The app adds only the new ones and skips anyone already on the roster.',
  'bulk.newNames': 'New names ({n})',
  'bulk.noNew': 'No new names to add.',
  'bulk.alreadyIn': 'Already in app ({n})',
  'bulk.add.one': 'Add 1 student',
  'bulk.add.many': 'Add {n} students',
  'bulk.settleFirst': 'Settle the "Did you mean?" choices to add',
  'bulk.added.one': 'Added 1 student.',
  'bulk.added.many': 'Added {n} students.',

  // Dan exam
  'dan.eyebrow': '昇段 · Dan Exam',
  'dan.title': 'Dan Exam 2026',
  'dan.date': 'Saturday 13 June 2026',
  'dan.shodan.title': 'Shodan',
  'dan.shodan.label': 'New 1st-degree black belts',
  'dan.nidan.title': 'Nidan',
  'dan.nidan.label': 'New 2nd-degree black belts',
  'dan.instructors.title': 'JKA instructors & judges',
  'dan.instructors.label': 'Newly licensed by the JKA',
  'dan.congrats': '押忍 · Congratulations to every new grade',

  // Awards
  'awards.title': 'Awards',
  'awards.subtitle': 'Recognizing the most consistent attendance',
  'awards.empty': 'No classes recorded yet. Awards will appear once attendance has been entered.',
  'awards.month': 'Month',
  'awards.monthly': 'Monthly award · {month}',
  'awards.noMonth': 'No attendance recorded for this month yet.',
  'awards.allTime': 'All-time',
  'awards.noStudents': 'No students recorded yet.',
  'awards.classes': '{n} classes',
  'awards.classesPct': '{n} classes · {pct}%',

  // Charts
  'charts.total': 'Total Attendance by Student',
  'charts.monthByStudent': '{month} · By Student',
  'charts.monthByStudentTitle': '{month} · Attendance by Student',
  'charts.monthlyTotal': 'Monthly Total Attendance',
  'charts.perClass': 'Students per Class Over Time',
  'charts.all': 'All charts',
  'charts.download': 'Download Charts Report (PDF)',
  'charts.attended': 'Classes Attended',
  'charts.totalAttendance': 'Total Attendance',
  'charts.classesHeld': 'Classes Held',
  'charts.studentsPresent': 'Students Present',

  // Analytics
  'an.monthlyLb': 'Monthly Leaderboards',
  'an.overallLb': 'Overall Leaderboard',
  'an.studentStats': 'Student Statistics',
  'an.monthlySummary': 'Monthly Summary',
  'an.byMonth': 'Student Attendance by Month',
  'an.allSections': 'All sections',
  'an.downloadFull': 'Download Full Report (PDF)',
  'an.downloadMonth': 'Download Month Report (PDF)',
  'an.rank': 'Rank',
  'an.student': 'Student',
  'an.attended': 'Attended',
  'an.classesAttended': 'Classes Attended',
  'an.classesMissed': 'Classes Missed',
  'an.classesHeld': 'Classes Held',
  'an.attendancePct': 'Attendance %',
  'an.month': 'Month',
  'an.totalAttendance': 'Total Attendance',
  'an.avgPerClass': 'Avg per Class',
  'an.total': 'Total',
  'an.reportTitle': 'Karate Black Belt Program · {month}',
  'an.studentAttendance': 'Student Attendance',

  // Manage students
  'manage.addStudent': 'Add Student',
  'manage.namePlaceholder': 'Student name',
  'manage.add': 'Add',
  'manage.current': 'Current Students ({n})',
  'manage.save': 'Save',
  'manage.cancel': 'Cancel',
  'manage.edit': 'Edit',
  'manage.remove': 'Remove',
  'manage.backup': 'Backup & Restore',
  'manage.loading': 'Loading...',
  'manage.loadBackups': 'Load Backups',
  'manage.backupMeta': '({students} students, {dates} dates)',
  'manage.restore': 'Restore',
  'manage.backupHint': 'Auto-backups are created every 5 minutes when you make changes. Click above to check for available backups.',
  'manage.data': 'Data Management',
  'manage.exportExcel': 'Export as Excel',
  'manage.exportJson': 'Export Data (JSON)',
  'manage.importJson': 'Import Data (JSON)',
  'manage.reset': 'Reset to Defaults',
  'manage.resetHint': 'Restores original 16 students and January 2026 attendance data.',
  'manage.confirmRestore': 'Restore backup from {time}? This will replace all current data.',
  'manage.restored': 'Backup restored!',
  'manage.exists': '"{name}" already exists.',
  'manage.inList': '"{name}" is already in the list.',
  'manage.confirmRemove': 'Remove "{name}" and all their attendance records?',
  'manage.invalidJson': 'Invalid data format. Expected { students, attendance }.',
  'manage.imported': 'Data imported successfully!',
  'manage.jsonError': 'Error reading JSON file.',
  'manage.confirmReset': 'Reset all data to defaults? This cannot be undone.',

  // Import from Word
  'word.title': 'Import from Word Document',
  'word.intro': 'Upload an attendance report (.docx) to import student names and statistics.',
  'word.needDocx': 'Please upload a .docx file',
  'word.parsing': 'Parsing document...',
  'word.noData': 'No student data found in document',
  'word.found': 'Found {n} students from {month} {year}.',
  'word.unknownMonth': 'unknown month',
  'word.newStudents': 'New students: {names}',
  'word.noNew': 'No new students to add.',
  'word.parseError': 'Error parsing document: {error}',
  'word.updated': 'Students updated successfully!',
  'word.addNew.one': 'Add 1 New Student',
  'word.addNew.many': 'Add {n} New Students',
};
```

- [ ] **Step 5: Create the Japanese dictionary**

Create `src/i18n/ja.js`. Same keys, same order, same placeholders.

```js
// 日本語. Same keys as en.js; scripts/test-i18n.mjs enforces parity.
// Register: short noun phrases for navigation and headings, polite form for
// hints and confirmations, karate terms in kanji. Written by Claude on
// 2026-09-05; to be read by a native speaker before the JUKF visit.
export default {
  // App shell
  'app.title': '空手 黒帯プログラム 2026',
  'app.titleShort': '空手 黒帯プログラム',
  'app.lastSaved': '最終保存: {time}',
  'app.never': '未保存',
  'app.offline': '（オフライン）',
  'app.loading': '出席データを読み込み中...',
  'lang.switch': '言語',

  // Navigation
  'nav.today': '今日',
  'nav.attendance': '出席',
  'nav.danExam': '昇段審査',
  'nav.awards': '表彰',
  'nav.charts': 'グラフ',
  'nav.analytics': '分析',
  'nav.manage': '生徒管理',

  // Password gate
  'gate.prompt': 'チームのパスワードを入力してください',
  'gate.placeholder': 'チームパスワード',
  'gate.enter': '入る',
  'gate.entering': '押忍。道場へどうぞ。',
  'gate.error1': '警告。もう一度。',
  'gate.error2': '反則注意。壮鎮を2回やってから、もう一度。',
  'gate.error3': '反則。あなたは船越と田畑の系譜にはいません。',
  'gate.lockedTitle': '反則。',
  'gate.lockedBody': 'あなたは船越と田畑の系譜にはいません。',
  'gate.tryAgainIn': '{time} 後にもう一度',

  // Today
  'today.eyebrow': '{date} · 第{n}回',
  'today.title': '今日',
  'today.take': '出席をとる',
  'today.takeFor': '出席をとる · {date}',
  'today.lastClass': '前回の稽古 · {date}',
  'today.present': '出席 {n}名',
  'today.streak': '{name}、{n}回連続出席',
  'today.noClasses': 'まだ稽古の記録がありません',
  'today.noClassesHint': '最初の出席をとると記録が始まります。',
  'today.expected': '今日の出席予定',
  'today.moreRegulars': 'ほか常連 {n}名',
  'today.noRegulars': 'まだ常連の生徒はいません。数回分の稽古を記録するとここに表示されます。',

  // Attendance grid
  'att.clickHint': 'セルをタップで切替: 0（欠席）↔ 1（出席）',
  'att.allMonths': 'すべての月',
  'att.date': '日付',
  'att.total': '合計',

  // Paste attendance
  'paste.title': '出席をとる（出席者リストを貼り付け）',
  'paste.hide': '▲ 閉じる',
  'paste.show': '▼ 開く',
  'paste.classDate': '稽古日:',
  'paste.alreadyRecorded': '{date} はすでに {n}名の出席が記録されています。そのまま残ります',
  'paste.intro': '出席した人のリストを貼り付けてください（カンマ区切りか1行に1名、WhatsAppからのコピーでも可）。スペース区切りの1行でも構いません。貼り付けた名前は出席になります。',
  'paste.introMerge': 'この日にすでに記録のある人はそのまま残るので、遅れて来た人だけを貼り付けることもできます。',
  'paste.introFresh': '名簿のそれ以外の人は、この日は欠席になります。',
  'paste.replaceDay': 'この日の記録をすべて置き換える',
  'paste.replaceWarn': '⚠ 記録済みの出席 {n}名を消去します。リストの間違いを直すときだけ使ってください。',
  'paste.placeholder': 'IB, angel, varak, paul, julia, ricardo\n\nまたは1行に1名（WhatsAppから貼り付け）',
  'paste.preview': '確認',
  'paste.clear': 'クリア',
  'paste.fromPaste': '貼り付けから（{n}）',
  'paste.noneMatched': '名簿と一致する名前がありませんでした。',
  'paste.alreadyPresentSuffix': 'すでに出席、変更なし',
  'paste.kept': 'すでに出席、そのまま（{n}）',
  'paste.keptHint': 'この日に先に記録された人です。保存しても出席のまま残ります。',
  'paste.notOnRoster': '名簿にいない名前（{n}）',
  'paste.notOnRosterHint': 'チェックすると名簿に追加され、この日の出席になります。',
  'paste.skipped': '名前ではないようです（{n}）',
  'paste.skippedHint': '日付や回数などの行はスキップしました。実際は生徒名のものがあればチェックしてください。',
  'paste.absent': '欠席になる人（{n}）',
  'paste.none': 'なし',
  'paste.save': '{date} の出席を保存（出席 {n}名）',
  'paste.settleFirst': '「この人ですか？」の選択を済ませると保存できます',
  'paste.saved': '{date} を保存しました: 出席 {present}名、欠席 {absent}名',
  'paste.savedAdded.one': '、新しい生徒 1名を追加しました。',
  'paste.savedAdded.many': '、新しい生徒 {n}名を追加しました。',
  'paste.savedEnd': '。',

  // Did you mean?
  'dym.title': 'この人ですか？（{n}）',
  'dym.hint': '名簿にいる人と似たつづりなので、新しい生徒としては追加していません。どの人か選んでください。',
  'dym.open.one': '⚠ 選択が済んでいない名前が 1件あります。選ぶと保存できます。',
  'dym.open.many': '⚠ 選択が済んでいない名前が {n}件あります。選ぶと保存できます。',
  'dym.youPasted': '貼り付けた名前:',
  'dym.addNew': 'いいえ、「{name}」を新しい生徒として追加',

  // Paste names (bulk add)
  'bulk.title': '名前を貼り付け（まとめて追加）',
  'bulk.intro': '名前のリストを貼り付けてください。1行に1名か、カンマ区切りで。「angel ib emile」のようなスペース区切りの1行でも構いません。新しい名前だけ追加され、名簿にいる人はスキップされます。',
  'bulk.newNames': '新しい名前（{n}）',
  'bulk.noNew': '追加する新しい名前はありません。',
  'bulk.alreadyIn': 'すでに登録済み（{n}）',
  'bulk.add.one': '生徒 1名を追加',
  'bulk.add.many': '生徒 {n}名を追加',
  'bulk.settleFirst': '「この人ですか？」の選択を済ませると追加できます',
  'bulk.added.one': '生徒 1名を追加しました。',
  'bulk.added.many': '生徒 {n}名を追加しました。',

  // Dan exam
  'dan.eyebrow': '昇段 · 審査',
  'dan.title': '昇段審査 2026',
  'dan.date': '2026年6月13日（土）',
  'dan.shodan.title': '初段',
  'dan.shodan.label': '新初段',
  'dan.nidan.title': '弐段',
  'dan.nidan.label': '新弐段',
  'dan.instructors.title': 'JKA 指導員・審判員',
  'dan.instructors.label': 'JKA 新規資格取得',
  'dan.congrats': '押忍 · 昇段された皆さん、おめでとうございます',

  // Awards
  'awards.title': '表彰',
  'awards.subtitle': 'もっとも安定して出席した人をたたえます',
  'awards.empty': 'まだ稽古の記録がありません。出席を記録すると表彰が表示されます。',
  'awards.month': '月',
  'awards.monthly': '月間表彰 · {month}',
  'awards.noMonth': 'この月の出席はまだ記録されていません。',
  'awards.allTime': '通算',
  'awards.noStudents': 'まだ生徒の記録がありません。',
  'awards.classes': '{n}回',
  'awards.classesPct': '{n}回 · {pct}%',

  // Charts
  'charts.total': '生徒別 総出席数',
  'charts.monthByStudent': '{month} · 生徒別',
  'charts.monthByStudentTitle': '{month} · 生徒別出席数',
  'charts.monthlyTotal': '月別 総出席数',
  'charts.perClass': '稽古ごとの出席人数の推移',
  'charts.all': 'すべてのグラフ',
  'charts.download': 'グラフレポートをダウンロード（PDF）',
  'charts.attended': '出席回数',
  'charts.totalAttendance': '総出席数',
  'charts.classesHeld': '稽古回数',
  'charts.studentsPresent': '出席人数',

  // Analytics
  'an.monthlyLb': '月間ランキング',
  'an.overallLb': '総合ランキング',
  'an.studentStats': '生徒別統計',
  'an.monthlySummary': '月別まとめ',
  'an.byMonth': '生徒別 月ごとの出席',
  'an.allSections': 'すべてのセクション',
  'an.downloadFull': '全体レポートをダウンロード（PDF）',
  'an.downloadMonth': '月別レポートをダウンロード（PDF）',
  'an.rank': '順位',
  'an.student': '生徒',
  'an.attended': '出席',
  'an.classesAttended': '出席回数',
  'an.classesMissed': '欠席回数',
  'an.classesHeld': '稽古回数',
  'an.attendancePct': '出席率',
  'an.month': '月',
  'an.totalAttendance': '総出席数',
  'an.avgPerClass': '1回あたり平均',
  'an.total': '合計',
  'an.reportTitle': '空手 黒帯プログラム · {month}',
  'an.studentAttendance': '生徒の出席',

  // Manage students
  'manage.addStudent': '生徒を追加',
  'manage.namePlaceholder': '生徒の名前',
  'manage.add': '追加',
  'manage.current': '現在の生徒（{n}名）',
  'manage.save': '保存',
  'manage.cancel': 'キャンセル',
  'manage.edit': '編集',
  'manage.remove': '削除',
  'manage.backup': 'バックアップと復元',
  'manage.loading': '読み込み中...',
  'manage.loadBackups': 'バックアップを読み込む',
  'manage.backupMeta': '（生徒 {students}名、{dates}日分）',
  'manage.restore': '復元',
  'manage.backupHint': '変更があると5分ごとに自動でバックアップされます。上のボタンで一覧を確認できます。',
  'manage.data': 'データ管理',
  'manage.exportExcel': 'Excelで書き出す',
  'manage.exportJson': 'データを書き出す（JSON）',
  'manage.importJson': 'データを読み込む（JSON）',
  'manage.reset': '初期状態に戻す',
  'manage.resetHint': '初期の生徒16名と2026年1月の出席データに戻します。',
  'manage.confirmRestore': '{time} のバックアップを復元しますか？現在のデータはすべて置き換えられます。',
  'manage.restored': 'バックアップを復元しました。',
  'manage.exists': '「{name}」はすでに存在します。',
  'manage.inList': '「{name}」はすでに名簿にあります。',
  'manage.confirmRemove': '「{name}」と出席記録をすべて削除しますか？',
  'manage.invalidJson': 'データ形式が正しくありません。{ students, attendance } が必要です。',
  'manage.imported': 'データを読み込みました。',
  'manage.jsonError': 'JSONファイルを読み込めませんでした。',
  'manage.confirmReset': 'すべてのデータを初期状態に戻しますか？元に戻せません。',

  // Import from Word
  'word.title': 'Word文書から読み込む',
  'word.intro': '出席レポート（.docx）をアップロードすると、生徒名と統計を読み込みます。',
  'word.needDocx': '.docx ファイルをアップロードしてください',
  'word.parsing': '文書を解析中...',
  'word.noData': '文書に生徒データが見つかりませんでした',
  'word.found': '{month} {year} の生徒 {n}名を見つけました。',
  'word.unknownMonth': '不明な月',
  'word.newStudents': '新しい生徒: {names}',
  'word.noNew': '追加する新しい生徒はいません。',
  'word.parseError': '文書の解析エラー: {error}',
  'word.updated': '生徒を更新しました。',
  'word.addNew.one': '新しい生徒 1名を追加',
  'word.addNew.many': '新しい生徒 {n}名を追加',
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node scripts/test-i18n.mjs`
Expected: all `ok`, final line `N passed, 0 failed` (N is 22).

- [ ] **Step 7: Commit**

```bash
git add src/i18n/translate.js src/i18n/en.js src/i18n/ja.js scripts/test-i18n.mjs
git -c user.email=emile.giovannie@gmail.com -c user.name="Emile Giovannie" commit -m "i18n: translation core and the English and Japanese dictionaries

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016EZNhgumvMeRCWxuSGQT8f"
```

---

### Task 2: Localised date formatting

**Files:**
- Modify: `src/utils/dateUtils.js` (the three formatting functions; `generateDates`, `getMonthKey`, `getUniqueMonths` unchanged)
- Test: `scripts/test-dateUtils.mjs`

**Interfaces:**
- Produces: `formatDate(dateStr, lang = 'en')`, `getMonth(dateStr, lang = 'en')`, `getMonthLabel(monthKey, lang = 'en')`. Calls without `lang` behave exactly as today (this is what keeps the Excel export English).

- [ ] **Step 1: Write the failing test**

Create `scripts/test-dateUtils.mjs`:

```js
// Standalone test for date labels in both languages.
// Run: node scripts/test-dateUtils.mjs
import { formatDate, getMonth, getMonthLabel, generateDates } from '../src/utils/dateUtils.js';

let passed = 0;
let failed = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}\n       expected ${e}\n       got      ${a}`); }
}

console.log('English (default, used by the Excel export):');
eq(formatDate('2026-09-03'), 'Thu 3/9', 'formatDate default');
eq(formatDate('2026-09-03', 'en'), 'Thu 3/9', 'formatDate en');
eq(getMonth('2026-09-03'), 'September', 'getMonth default');
eq(getMonthLabel('2026-09'), 'September 2026', 'getMonthLabel default');

console.log('Japanese:');
eq(formatDate('2026-09-03', 'ja'), '9/3（木）', 'Thursday');
eq(formatDate('2026-09-06', 'ja'), '9/6（日）', 'Sunday');
eq(formatDate('2026-09-01', 'ja'), '9/1（火）', 'Tuesday');
eq(formatDate('2026-12-31', 'ja'), '12/31（木）', 'two-digit month and day');
eq(getMonth('2026-09-03', 'ja'), '9月', 'getMonth ja');
eq(getMonthLabel('2026-09', 'ja'), '2026年9月', 'getMonthLabel ja');
eq(getMonthLabel('2026-12', 'ja'), '2026年12月', 'getMonthLabel ja December');

console.log('Unknown language falls back to English:');
eq(formatDate('2026-09-03', 'fr'), 'Thu 3/9', 'formatDate fr');
eq(getMonthLabel('2026-09', 'fr'), 'September 2026', 'getMonthLabel fr');

console.log('Calendar untouched:');
{
  const d = generateDates();
  eq([d[0], d[d.length - 1], d.length], ['2026-01-04', '2026-12-31', 139], 'Jan 4 to Dec 31, 139 class days');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/test-dateUtils.mjs`
Expected: the seven Japanese cases FAIL (they return English), everything else `ok`.

- [ ] **Step 3: Implement**

In `src/utils/dateUtils.js`, replace the three functions `formatDate`, `getMonth`, `getMonthLabel` (keep everything else in the file as is) with:

```js
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

// Format date for display. en: "Thu 3/9" (day/month). ja: "9/3（木）" (month/day,
// the order Japanese readers expect). Unknown lang falls back to English.
export const formatDate = (dateStr, lang = 'en') => {
  const d = new Date(dateStr + 'T12:00:00');
  if (lang === 'ja') return `${d.getMonth() + 1}/${d.getDate()}（${DAYS_JA[d.getDay()]}）`;
  return `${DAYS_EN[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};

// Month name from date string. en: "September". ja: "9月".
export const getMonth = (dateStr, lang = 'en') => {
  const monthIndex = parseInt(dateStr.split('-')[1]) - 1;
  if (lang === 'ja') return `${monthIndex + 1}月`;
  return MONTHS_EN[monthIndex];
};

// Month label from month key. en: "2026-09" -> "September 2026". ja: "2026年9月".
export const getMonthLabel = (monthKey, lang = 'en') => {
  const [year, month] = monthKey.split('-');
  if (lang === 'ja') return `${year}年${parseInt(month)}月`;
  return `${MONTHS_EN[parseInt(month) - 1]} ${year}`;
};
```

Delete the two duplicated inline `months` arrays that the old `getMonth` and `getMonthLabel` carried.

- [ ] **Step 4: Run the tests**

Run: `node scripts/test-dateUtils.mjs && node scripts/test-i18n.mjs && node scripts/test-nameListParser.mjs && node scripts/test-nameSimilarity.mjs && node scripts/test-attendanceUpdate.mjs`
Expected: every file ends `... 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dateUtils.js scripts/test-dateUtils.mjs
git -c user.email=emile.giovannie@gmail.com -c user.name="Emile Giovannie" commit -m "Dates can render in Japanese; English stays the default

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016EZNhgumvMeRCWxuSGQT8f"
```

---

### Task 3: Provider, toggle, header, tabs and password gate

**Files:**
- Create: `src/i18n/index.jsx`
- Create: `src/components/LanguageToggle.jsx`
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/PasswordGate.jsx`

**Interfaces:**
- Consumes: `makeT`, `normalizeLang`, `DEFAULT_LANG` from `src/i18n/translate.js`; `en`, `ja` dictionaries.
- Produces: `LanguageProvider` (wraps the app), `useLang() -> { lang, setLang, t }`, `<LanguageToggle className? />`. Every component task after this one starts with `import { useLang } from '../i18n';` and `const { t, lang } = useLang();`.

There is no node test for React context in this repo; the deliverable is verified by `npm run build` plus the browser check in Step 7.

- [ ] **Step 1: Create the provider**

Create `src/i18n/index.jsx`:

```jsx
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
```

- [ ] **Step 2: Create the toggle**

Create `src/components/LanguageToggle.jsx`:

```jsx
import { useLang } from '../i18n';

const OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本語' },
];

// Two-segment pill. The active segment is stamped hinomaru red like an
// active tab; the other reads as a quiet outline button.
export default function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useLang();
  return (
    <div
      role="group"
      aria-label={t('lang.switch')}
      className={`inline-flex overflow-hidden rounded-lg border border-line2 text-xs font-medium ${className}`}
    >
      {OPTIONS.map((o) => {
        const active = lang === o.code;
        return (
          <button
            key={o.code}
            type="button"
            aria-pressed={active}
            onClick={() => setLang(o.code)}
            className={`px-2.5 py-1.5 transition-colors ${
              active ? 'bg-hinomaru text-white' : 'bg-sumi2 text-gidim hover:bg-sumi3 hover:text-gi'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Mount the provider**

Replace `src/main.jsx` with:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
```

- [ ] **Step 4: App.jsx: tabs by key, header via t(), toggle in header**

In `src/App.jsx`:

1. Add imports after the existing ones:
```jsx
import LanguageToggle from './components/LanguageToggle';
import { useLang } from './i18n';
```

2. Replace the `TABS` constant:
```jsx
// Stable keys; labels come from the dictionary (nav.<key>).
const TABS = ['today', 'attendance', 'danExam', 'awards', 'charts', 'analytics', 'manage'];
```

3. At the top of `App()`, change `useState('Today')` to `useState('today')` and add, right after the `useFirestore` call:
```jsx
  const { t, lang } = useLang();
```

4. Replace the `savedTime` block with:
```jsx
  const savedTime = data.savedAt
    ? new Date(data.savedAt).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')
    : t('app.never');
```

5. In the loading screen, replace `Loading attendance data...` with `{t('app.loading')}`.

6. Replace the `<header>` element with:
```jsx
      <header className="text-center mb-6 relative">
        <LanguageToggle className="absolute right-0 top-0 no-print" />
        <div className="font-serif text-xs tracking-[0.16em] uppercase text-gidim mb-1">
          道場 · JKA
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-gi px-16">
          {t('app.title')}
        </h1>
        <span className="dojo-brush mx-auto mt-3" />
        <p className="text-sm text-gifaint mt-3">
          {t('app.lastSaved', { time: savedTime })}
          {error && <span className="text-hinomaru ml-2">{t('app.offline')}</span>}
        </p>
      </header>
```
(`px-16` keeps the title clear of the pill on narrow phones.)

7. In the `<nav>`, replace `{tab}` (the button text) with `{t('nav.' + tab)}`.

8. Replace every `activeTab === '<English name>'` with the key: `'Today'`→`'today'`, `'Attendance'`→`'attendance'`, `'Dan Exam'`→`'danExam'`, `'Awards'`→`'awards'`, `'Analytics'`→`'analytics'`, `'Charts'`→`'charts'`, `'Manage Students'`→`'manage'`. Also `onTakeAttendance={() => setActiveTab('Attendance')}` becomes `setActiveTab('attendance')`.

- [ ] **Step 5: PasswordGate via t(), with the toggle**

In `src/components/PasswordGate.jsx`:

1. Add imports:
```jsx
import LanguageToggle from './LanguageToggle';
import { useLang } from '../i18n';
```

2. Replace the `ERROR_MESSAGES` constant with keys:
```jsx
const ERROR_KEYS = ['gate.error1', 'gate.error2', 'gate.error3'];
```

3. Inside `PasswordGate`, first line of the function body:
```jsx
  const { t } = useLang();
```

4. Replace `? ERROR_MESSAGES[Math.min(attempts - 1, ERROR_MESSAGES.length - 1)]` with `? t(ERROR_KEYS[Math.min(attempts - 1, ERROR_KEYS.length - 1)])`.

5. Text replacements:
   - `OOS. Enter in the Dojo.` → `{t('gate.entering')}`
   - `Hansoku.` (lockout title) → `{t('gate.lockedTitle')}`
   - `You are not among the descendants of Funakoshi and Tabata.` (lockout body) → `{t('gate.lockedBody')}`
   - `Try again in {remaining}` → `{t('gate.tryAgainIn', { time: remaining })}`
   - `Karate Black Belt Program` (h1) → `{t('app.titleShort')}`
   - `Enter the team password to continue` → `{t('gate.prompt')}`
   - `placeholder="Team password"` → `placeholder={t('gate.placeholder')}`
   - `Enter` (submit button) → `{t('gate.enter')}`

6. On the main gate card (the one containing the form), change `className="dojo-card p-8 max-w-sm w-full mx-4 text-center"` to `className="dojo-card p-8 max-w-sm w-full mx-4 text-center relative"` and insert as its first child:
```jsx
        <LanguageToggle className="absolute right-3 top-3" />
```

- [ ] **Step 6: Build and run all tests**

Run: `npm run build 2>&1 | grep -E "built in|error" && node scripts/test-i18n.mjs | tail -1 && node scripts/test-dateUtils.mjs | tail -1`
Expected: `✓ built in ...`, `22 passed, 0 failed`, `15 passed, 0 failed`.

- [ ] **Step 7: Browser check**

```bash
npx vite preview --port 4174 --strictPort &
```
Open `http://localhost:4174/karate-attendance/` (Playwright MCP or Chrome). Expected: the gate shows the EN | 日本語 pill top-right. Click 日本語: prompt reads チームのパスワードを入力してください, button 入る. Log in with `Cassiano`. Header title 空手 黒帯プログラム 2026, tabs 今日 · 出席 · 昇段審査 · 表彰 · グラフ · 分析 · 生徒管理, "最終保存:" line. Reload the page: still Japanese (persisted). Click EN: everything back to English. Stop the preview server afterwards (`pkill -f "vite preview --port 4174"`).

- [ ] **Step 8: Commit**

```bash
git add src/i18n/index.jsx src/components/LanguageToggle.jsx src/main.jsx src/App.jsx src/components/PasswordGate.jsx
git -c user.email=emile.giovannie@gmail.com -c user.name="Emile Giovannie" commit -m "EN | 日本語 toggle in the header and on the password gate

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016EZNhgumvMeRCWxuSGQT8f"
```

---

### Task 4: Today tab

**Files:**
- Modify: `src/components/TodayTab.jsx`

**Interfaces:**
- Consumes: `useLang()`, keys `today.*`, `formatDate(d, lang)`.

- [ ] **Step 1: Edit**

1. Add `import { useLang } from '../i18n';` and, as the first line inside `TodayTab`, `const { t, lang } = useLang();`.
2. `const eyebrowDate = nextClass ? formatDate(nextClass) : '—';` → `formatDate(nextClass, lang)` (keep the `'—'` fallback glyph, it is a symbol not copy).
3. `{eyebrowDate} · Class {snapshot.classesHeld}` → `{t('today.eyebrow', { date: eyebrowDate, n: snapshot.classesHeld })}`
4. `<h1 ...>Today</h1>` → `{t('today.title')}`
5. CTA:
```jsx
        {nextClass
          ? t('today.takeFor', { date: formatDate(nextClass, lang) })
          : t('today.take')}
```
6. `Last class · {formatDate(lastClass)}` → `{t('today.lastClass', { date: formatDate(lastClass, lang) })}`
7. `{snapshot.lastPresent} present` → `{t('today.present', { n: snapshot.lastPresent })}`
8. `{topStreaker.name}, {topStreaker.currentStreak} consecutive classes` → `{t('today.streak', { name: topStreaker.name, n: topStreaker.currentStreak })}`
9. `No classes recorded yet` → `{t('today.noClasses')}`; `Take your first attendance to start the record.` → `{t('today.noClassesHint')}`
10. `Expected today` → `{t('today.expected')}`
11. `and {moreRegulars} more regular attendees` → `{t('today.moreRegulars', { n: moreRegulars })}`
12. `No regular attendees yet. Record a few classes to populate this list.` → `{t('today.noRegulars')}`

- [ ] **Step 2: Verify no English literal is left**

Run: `grep -nE ">[^<>{}]*[A-Za-z]{3,}[^<>{}]*<" src/components/TodayTab.jsx`
Expected: no output.

- [ ] **Step 3: Build, browser check in Japanese** (Today tab: 今日 eyebrow line `9/6（日） · 第77回`, button 出席をとる · 9/6（日）, card 前回の稽古 · 9/3（木）, 出席 16名). Then `git add src/components/TodayTab.jsx` and commit `"Today tab reads from the dictionary"` with the two trailers.

---

### Task 5: Attendance grid and the two paste tools

**Files:**
- Modify: `src/components/AttendanceTab.jsx`
- Modify: `src/components/PasteAttendance.jsx`
- Modify: `src/components/DidYouMean.jsx`
- Modify: `src/components/PasteNamesBulkAdd.jsx`

**Interfaces:**
- Consumes: `useLang()`, keys `att.*`, `paste.*`, `dym.*`, `bulk.*`, `formatDate(d, lang)`, `getMonthLabel(mk, lang)`.

- [ ] **Step 1: AttendanceTab.jsx**

1. `import { useLang } from '../i18n';` and `const { t, lang } = useLang();` as the first line in the component.
2. `monthOptions`: `label: getMonthLabel(mk)` → `getMonthLabel(mk, lang)`, and add `lang` to that `useMemo`'s dependency array: `[dates, lang]`.
3. `Click cells to toggle: 0 (Absent) &harr; 1 (Present)` → `{t('att.clickHint')}`
4. `<option value="">All months</option>` → `{t('att.allMonths')}`
5. `<th ...>Date</th>` → `{t('att.date')}`; `<th ...>Total</th>` → `{t('att.total')}`
6. `{formatDate(date)}` → `{formatDate(date, lang)}`

- [ ] **Step 2: PasteAttendance.jsx**

1. `import { useLang } from '../i18n';` and `const { t, lang } = useLang();` first line in the component.
2. Every `formatDate(x)` in the file → `formatDate(x, lang)` (select options, badge, save button, `setDone`).
3. `setDone(...)` in `save()` becomes:
```jsx
    setDone(
      t('paste.saved', { date: formatDate(date, lang), present: totalPresent, absent: totalAbsent }) +
      (added.length
        ? t(added.length > 1 ? 'paste.savedAdded.many' : 'paste.savedAdded.one', { n: added.length })
        : t('paste.savedEnd'))
    );
```
4. Text replacements:
   - `Take attendance (paste who showed up)` → `{t('paste.title')}`
   - `{open ? '▲ Hide' : '▼ Show'}` → `{open ? t('paste.hide') : t('paste.show')}`
   - `Class date:` → `{t('paste.classDate')}`
   - the badge `{formatDate(date)} already has {existingPresent} present recorded — they stay present` → `{t('paste.alreadyRecorded', { date: formatDate(date, lang), n: existingPresent })}`
   - the intro paragraph → `{t('paste.intro')} {dateHasData ? t('paste.introMerge') : t('paste.introFresh')}`
   - `Replace the whole day instead` → `{t('paste.replaceDay')}`
   - `⚠ Wipes the {existingPresent} already recorded present. Only for fixing a wrong list.` → `{t('paste.replaceWarn', { n: existingPresent })}`
   - `placeholder={'IB, angel, ...'}` → `placeholder={t('paste.placeholder')}`
   - `Preview` → `{t('paste.preview')}`; `Clear` → `{t('paste.clear')}`
   - `From your paste ({present.length})` → `{t('paste.fromPaste', { n: present.length })}`
   - `No pasted names matched the roster.` → `{t('paste.noneMatched')}`
   - `{name} <span className="text-gifaint">— already present, no change</span>` → `{name} <span className="text-gifaint">· {t('paste.alreadyPresentSuffix')}</span>`
   - `Already present, kept ({kept.length})` → `{t('paste.kept', { n: kept.length })}`
   - `Recorded earlier for this date. This save leaves them present.` → `{t('paste.keptHint')}`
   - `Not on roster ({preview.newNames.length})` → `{t('paste.notOnRoster', { n: preview.newNames.length })}`
   - `Tick to add them to the roster and mark present for this date.` → `{t('paste.notOnRosterHint')}`
   - `Doesn&apos;t look like a name ({preview.skipped.length})` → `{t('paste.skipped', { n: preview.skipped.length })}`
   - `Skipped (dates, class lines, etc). Tick any that are actually a student.` → `{t('paste.skippedHint')}`
   - `Will be marked absent ({absent.length}) {showAbsent ? '▲' : '▸'}` → `{t('paste.absent', { n: absent.length })} {showAbsent ? '▲' : '▸'}`
   - `{absent.join(', ') || 'None'}` → `{absent.join(', ') || t('paste.none')}`
   - Save button label:
```jsx
                  {resolved.unresolved.length > 0
                    ? t('paste.settleFirst')
                    : t('paste.save', { date: formatDate(date, lang), n: presentCount })}
```

- [ ] **Step 3: DidYouMean.jsx**

1. `import { useLang } from '../i18n';` and `const { t } = useLang();` as the first line inside the component (before the early return is fine; hooks must run unconditionally, so place it above `if (!rows || rows.length === 0) return null;`).
2. `Did you mean? ({rows.length})` → `{t('dym.title', { n: rows.length })}`
3. The hint sentence → `{t('dym.hint')}`
4. The open warning:
```jsx
          <span className="block text-gold mt-1">
            {open === 1 ? t('dym.open.one') : t('dym.open.many', { n: open })}
          </span>
```
5. `You pasted <span className="font-semibold">“{r.raw}”</span>` → `{t('dym.youPasted')} <span className="font-semibold">“{r.raw}”</span>`
6. `No, add “{r.name}” as a new student` → `{t('dym.addNew', { name: r.name })}`

- [ ] **Step 4: PasteNamesBulkAdd.jsx**

1. `import { useLang } from '../i18n';` and `const { t } = useLang();` first line in the component.
2. `setDone(\`Added ${toAdd.length} student${toAdd.length > 1 ? 's' : ''}.\`)` → `setDone(t(toAdd.length > 1 ? 'bulk.added.many' : 'bulk.added.one', { n: toAdd.length }))`
3. Text replacements:
   - `Paste Names (bulk add)` → `{t('bulk.title')}`
   - `{open ? '▲ Hide' : '▼ Show'}` → `{open ? t('paste.hide') : t('paste.show')}`
   - the intro paragraph → `{t('bulk.intro')}`
   - `placeholder={'IB, angel, ...'}` → `placeholder={t('paste.placeholder')}`
   - `Preview` → `{t('paste.preview')}`; `Clear` → `{t('paste.clear')}`
   - `New names ({preview.newNames.length})` → `{t('bulk.newNames', { n: preview.newNames.length })}`
   - `No new names to add.` → `{t('bulk.noNew')}`
   - `Doesn&apos;t look like a name ({preview.skipped.length})` → `{t('paste.skipped', { n: preview.skipped.length })}`
   - `Skipped (dates, class lines, etc). Tick any that are actually a student.` → `{t('paste.skippedHint')}`
   - `Already in app ({alreadyIn.length})` → `{t('bulk.alreadyIn', { n: alreadyIn.length })}`
   - Add button label:
```jsx
                  {resolved.unresolved.length > 0
                    ? t('bulk.settleFirst')
                    : t(selectedCount > 1 ? 'bulk.add.many' : 'bulk.add.one', { n: selectedCount })}
```

- [ ] **Step 5: Verify, build, browser check**

Run: `grep -nE ">[^<>{}]*[A-Za-z]{3,}[^<>{}]*<" src/components/AttendanceTab.jsx src/components/PasteAttendance.jsx src/components/DidYouMean.jsx src/components/PasteNamesBulkAdd.jsx`
Expected: no output. Then `npm run build` and the Japanese browser check: Attendance tab month filter reads すべての月 / 2026年9月, grid columns 日付 · 合計, rows like 9/3（木）. Open the paste tool, paste `Matheus, Lior, Julia`, click 確認: sections 貼り付けから, この人ですか？（2）with the Matheus row pre-selected to Matteos and the Julia row pre-selected to Julia G (only one Julia remains on the roster), button 9/3（木） の出席を保存（出席 N名）. Do not save.

- [ ] **Step 6: Commit** `git add` the four files, message `"Attendance grid and paste tools read from the dictionary"` with the two trailers.

---

### Task 6: Dan Exam and Awards

**Files:**
- Modify: `src/components/GradingTab.jsx`
- Modify: `src/components/AwardsTab.jsx`

- [ ] **Step 1: GradingTab.jsx**

1. Change the import to `import { grading2026 } from '../data/grading2026';` (the date now comes from the dictionary), add `import { useLang } from '../i18n';`.
2. Replace `RANKS` with keys:
```jsx
const RANKS = [
  { key: 'shodan',      kanji: '初段',   titleKey: 'dan.shodan.title',      labelKey: 'dan.shodan.label',      accent: 'gold' },
  { key: 'nidan',       kanji: '弐段',   titleKey: 'dan.nidan.title',       labelKey: 'dan.nidan.label',       accent: 'gold' },
  { key: 'instructors', kanji: '指導員', titleKey: 'dan.instructors.title', labelKey: 'dan.instructors.label', accent: 'indigo' },
];
```
3. First line in the component: `const { t } = useLang();`
4. `昇段 · Dan Exam` → `{t('dan.eyebrow')}`; `Dan Exam 2026` → `{t('dan.title')}`; `JKA · {GRADING_DATE}` → `JKA · {t('dan.date')}`
5. `{rank.title}` → `{t(rank.titleKey)}`; `{rank.label}` → `{t(rank.labelKey)}`
6. `押忍 · Congratulations to every new grade` → `{t('dan.congrats')}`

- [ ] **Step 2: AwardsTab.jsx**

1. `import { useLang } from '../i18n';` and `const { t, lang } = useLang();` first line in `AwardsTab`.
2. `Awards` (h2) → `{t('awards.title')}`; `Recognizing the most consistent attendance` → `{t('awards.subtitle')}`
3. Empty state sentence → `{t('awards.empty')}`
4. `<label ... className="sr-only">Month</label>` → `{t('awards.month')}`
5. `{getMonthLabel(m)}` (options) → `{getMonthLabel(m, lang)}`
6. `Monthly award · {getMonthLabel(activeMonth)}` → `{t('awards.monthly', { month: getMonthLabel(activeMonth, lang) })}`
7. `No attendance recorded for this month yet.` → `{t('awards.noMonth')}`
8. `detail={\`${r.attended} classes\`}` → `detail={t('awards.classes', { n: r.attended })}`
9. `All-time` → `{t('awards.allTime')}`; `No students recorded yet.` → `{t('awards.noStudents')}`
10. `detail={\`${r.attended} classes · ${r.percentage}%\`}` → `detail={t('awards.classesPct', { n: r.attended, pct: r.percentage })}`

- [ ] **Step 3: Verify, build, browser check** (`grep` guard on both files returns nothing; Japanese: 昇段審査 2026 heading, JKA · 2026年6月13日（土）, 表彰 with 月間表彰 · 2026年9月 and rows like `3回`). Commit `"Dan Exam and Awards read from the dictionary"` with the two trailers.

---

### Task 7: Charts and Analytics

**Files:**
- Modify: `src/components/ChartsTab.jsx`
- Modify: `src/components/AnalyticsTab.jsx`

**Interfaces:**
- Consumes: `getMonthLabel(mk, lang)`. `calculateMonthlySummary` returns `{ month, monthKey, ... }` where `month` is ALWAYS English; on screen use `getMonthLabel(m.monthKey, lang)` instead of `m.month`.

- [ ] **Step 1: ChartsTab.jsx**

1. `import { useLang } from '../i18n';` and `const { t, lang } = useLang();` first line in the component.
2. `classAttendanceData`: `date: formatDate(date)` → `formatDate(date, lang)`, dependency array `[classesHeld, attendance, lang]`.
3. `monthlyStudentData`: `label: getMonthLabel(monthKey)` → `getMonthLabel(monthKey, lang)`, dependency array `[months, students, studentMonthly, lang]`.
4. Add after `monthlySummary`:
```jsx
  // Month names for the monthly chart's x-axis follow the toggle. The summary
  // itself keeps English labels for the Excel export.
  const monthlySummaryLocal = useMemo(
    () => monthlySummary.map((m) => ({ ...m, month: getMonthLabel(m.monthKey, lang) })),
    [monthlySummary, lang]
  );
```
   and in the `'monthly-total'` chart use `<BarChart data={monthlySummaryLocal} ...>`.
5. `chartOptions`:
```jsx
  const chartOptions = [
    { id: 'total',         label: t('charts.total') },
    ...monthlyStudentData.map(({ monthKey, label }) => ({
      id: `month-${monthKey}`,
      label: t('charts.monthByStudent', { month: label }),
    })),
    { id: 'monthly-total', label: t('charts.monthlyTotal') },
    { id: 'per-class',     label: t('charts.perClass') },
  ];
```
6. Headings: `Total Attendance by Student` → `{t('charts.total')}`; `{label} — Attendance by Student` → `{t('charts.monthByStudentTitle', { month: label })}`; `Monthly Total Attendance` → `{t('charts.monthlyTotal')}`; `Students per Class Over Time` → `{t('charts.perClass')}`.
7. Series names: both `name="Classes Attended"` → `name={t('charts.attended')}`; `name="Total Attendance"` → `name={t('charts.totalAttendance')}`; `name="Classes Held"` → `name={t('charts.classesHeld')}`; `name="Students Present"` → `name={t('charts.studentsPresent')}`.
8. `<option value="">All charts</option>` → `{t('charts.all')}`; `Download Charts Report (PDF)` → `{t('charts.download')}`.

- [ ] **Step 2: AnalyticsTab.jsx**

1. `import { useLang } from '../i18n';` and `const { t, lang } = useLang();` first line in the component.
2. `sectionOptions` labels → `t('an.monthlyLb')`, `t('an.overallLb')`, `t('an.studentStats')`, `t('an.monthlySummary')`, `t('an.byMonth')`.
3. Section headings (five `<h2>`): same five keys.
4. Monthly leaderboard card header `{month}` → `{getMonthLabel(monthKey, lang)}`.
5. Table headers: `Rank` → `{t('an.rank')}`, `Student` → `{t('an.student')}`, `Attended` → `{t('an.attended')}`, `Classes Attended` → `{t('an.classesAttended')}`, `Classes Missed` → `{t('an.classesMissed')}`, `Classes Held` → `{t('an.classesHeld')}`, `Attendance %` → `{t('an.attendancePct')}`, `Month` → `{t('an.month')}`, `Total Attendance` → `{t('an.totalAttendance')}`, `Avg per Class` → `{t('an.avgPerClass')}`, `Total` → `{t('an.total')}`. This applies in BOTH the on-screen tables and the hidden `analytics-month-content` block. The lone `%` header stays.
6. Monthly summary table cell `{m.month}` → `{getMonthLabel(m.monthKey, lang)}`; by-month table headers `{getMonthLabel(m)}` → `{getMonthLabel(m, lang)}`.
7. Action bar: `All sections` → `{t('an.allSections')}`; `Download Full Report (PDF)` → `{t('an.downloadFull')}`; month `<option>` text `{m.month}` → `{getMonthLabel(m.monthKey, lang)}`; `Download Month Report (PDF)` → `{t('an.downloadMonth')}`.
8. Hidden PDF block: `Karate Black Belt Program — {getMonthLabel(selectedMonth)}` → `{t('an.reportTitle', { month: getMonthLabel(selectedMonth, lang) })}`; `Monthly Summary` → `{t('an.monthlySummary')}`; `{selectedMonthlySummary.month}` → `{getMonthLabel(selectedMonth, lang)}`; `Student Attendance` → `{t('an.studentAttendance')}`.

- [ ] **Step 3: Verify, build, browser check** (`grep` guard on both files returns nothing except lines that only contain `%`; Japanese Charts: dropdown すべてのグラフ / 2026年9月 · 生徒別, legend 出席回数 on hover; Analytics: 月間ランキング cards headed 2026年9月, headers 順位 · 生徒 · 出席). Commit `"Charts and Analytics read from the dictionary"` with the two trailers.

---

### Task 8: Manage Students and Word import

**Files:**
- Modify: `src/components/ManageStudentsTab.jsx`
- Modify: `src/components/ImportWordDoc.jsx`

**Global constraint reminder:** `exportExcel()` is NOT edited. It keeps `formatDate(date)`, `getMonthLabel(mk)` and `m.month` with no language argument.

- [ ] **Step 1: ManageStudentsTab.jsx**

1. `import { useLang } from '../i18n';` and `const { t, lang } = useLang();` first line in the component.
2. Dialogs:
   - `confirm(\`Restore backup from ${new Date(backupAt).toLocaleString()}? This will replace all current data.\`)` → `confirm(t('manage.confirmRestore', { time: new Date(backupAt).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US') }))`
   - `alert('Backup restored!')` → `alert(t('manage.restored'))`
   - `alert(\`"${trimmed}" already exists.\`)` → `alert(t('manage.exists', { name: trimmed }))`
   - `alert(\`"${name}" is already in the list.\`)` → `alert(t('manage.inList', { name }))`
   - `confirm(\`Remove "${name}" and all their attendance records?\`)` → `confirm(t('manage.confirmRemove', { name }))`
   - `alert('Invalid data format. Expected { students, attendance }.')` → `alert(t('manage.invalidJson'))`
   - `alert('Data imported successfully!')` → `alert(t('manage.imported'))`
   - `alert('Error reading JSON file.')` → `alert(t('manage.jsonError'))`
   - `confirm('Reset all data to defaults? This cannot be undone.')` → `confirm(t('manage.confirmReset'))`
3. Text replacements: `Add Student` → `{t('manage.addStudent')}`; `placeholder="Student name"` → `placeholder={t('manage.namePlaceholder')}`; `Add` → `{t('manage.add')}`; `Current Students ({students.length})` → `{t('manage.current', { n: students.length })}`; `Save` → `{t('manage.save')}`; `Cancel` → `{t('manage.cancel')}`; `Edit` → `{t('manage.edit')}`; `Remove` → `{t('manage.remove')}`; `Backup & Restore` → `{t('manage.backup')}`; `{loadingBackups ? 'Loading...' : 'Load Backups'}` → `{loadingBackups ? t('manage.loading') : t('manage.loadBackups')}`; `{new Date(b.backupAt).toLocaleString()}` → `{new Date(b.backupAt).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')}`; `({b.students?.length || 0} students, {Object.keys(b.attendance || {}).length} dates)` → `{t('manage.backupMeta', { students: b.students?.length || 0, dates: Object.keys(b.attendance || {}).length })}`; `Restore` → `{t('manage.restore')}`; the auto-backup hint → `{t('manage.backupHint')}`; `Data Management` → `{t('manage.data')}`; `Export as Excel` → `{t('manage.exportExcel')}`; `Export Data (JSON)` → `{t('manage.exportJson')}`; `Import Data (JSON)` → `{t('manage.importJson')}`; `Reset to Defaults` → `{t('manage.reset')}`; the reset hint → `{t('manage.resetHint')}`.

- [ ] **Step 2: ImportWordDoc.jsx**

1. `import { useLang } from '../i18n';` and `const { t } = useLang();` first line in the component.
2. Status messages:
   - `'Please upload a .docx file'` → `t('word.needDocx')`
   - `'Parsing document...'` → `t('word.parsing')`
   - `'No student data found in document'` → `t('word.noData')`
   - the success template →
```jsx
      setStatus({
        type: 'success',
        message: `${t('word.found', { n: data.students.length, month: data.month || t('word.unknownMonth'), year: data.year || '' })} ${
          newStudents.length > 0 ? t('word.newStudents', { names: newStudents.join(', ') }) : t('word.noNew')
        }`,
      });
```
   - `'Error parsing document: ' + error.message` → `t('word.parseError', { error: error.message })`
   - `'Students updated successfully!'` → `t('word.updated')`
3. `Import from Word Document` → `{t('word.title')}`; the intro sentence → `{t('word.intro')}`; the button label `Add {n} New Student{s}` → `{t(importResult.newStudents.length > 1 ? 'word.addNew.many' : 'word.addNew.one', { n: importResult.newStudents.length })}`.

- [ ] **Step 3: Verify, build, browser check** (`grep` guard on both files returns nothing; Japanese Manage tab: 生徒を追加, 現在の生徒（42名）, 編集 / 削除, バックアップと復元, データ管理, Excelで書き出す). Click Excelで書き出す once and open the file: sheet names `Attendance`, `Student Stats`, `Monthly Summary`, dates `Thu 3/9`, months `September 2026`. That proves the export stayed English. Commit `"Manage Students and Word import read from the dictionary"` with the two trailers.

---

### Task 9: Full walkthrough in both languages

**Files:** none new; fix anything found in the component it belongs to.

- [ ] **Step 1: Leftover literal sweep across every component**

Run:
```bash
grep -rnE ">[^<>{}]*[A-Za-z]{3,}[^<>{}]*<|placeholder=\"[A-Za-z]|alert\('[A-Za-z]|confirm\('[A-Za-z]" src/App.jsx src/components/*.jsx
```
Expected: no output. Anything listed is an English literal that missed the dictionary: add a key to BOTH dictionaries, replace the literal, rerun `node scripts/test-i18n.mjs`.

- [ ] **Step 2: Serve and walk**

`npx vite preview --port 4174 --strictPort &`, open the app, log in, and for EACH of the seven tabs take one screenshot in English and one in Japanese at desktop width, plus the Today and Attendance tabs at a 390px-wide viewport. Check: nothing English remains in Japanese mode except student names, numbers and emoji; no label overflows its pill or button; the toggle is reachable on the gate and in the header; reload keeps the language.

- [ ] **Step 3: Run every test and the build one last time**

```bash
node scripts/test-i18n.mjs && node scripts/test-dateUtils.mjs && node scripts/test-nameListParser.mjs && node scripts/test-nameSimilarity.mjs && node scripts/test-attendanceUpdate.mjs && npm run build 2>&1 | grep -E "built in|error"
```
Expected: five `0 failed` lines and `✓ built in`.

- [ ] **Step 4: Commit any fixes** with message `"Japanese walkthrough fixes"` and the two trailers (skip if nothing changed).

---

### Task 10: Land on main, deploy, verify, remember

- [ ] **Step 1: Merge**

From the MAIN checkout (`/Users/emilegio/ClaudeProjects/01-clients/hdki-karate/karate-attendance`):
```bash
git checkout main && git pull --ff-only origin main
git merge --ff-only japanese-toggle || git merge --no-edit japanese-toggle
npm run build 2>&1 | grep -E "built in|error"
git push origin main
```

- [ ] **Step 2: Watch the deploy and verify live**

```bash
sleep 8; RUN=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId'); gh run watch "$RUN" --exit-status | tail -1
sleep 20
BUNDLE=$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' dist/index.html)
LIVE=$(curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0 Safari/537.36" https://emilezounon.com/karate-attendance/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
echo "live=$LIVE local=$BUNDLE"
curl -sL -A "Mozilla/5.0 Chrome/128.0" "https://emilezounon.com/karate-attendance/$LIVE" | grep -c '昇段審査'
```
Expected: live and local bundle names match (retry every 30 s up to five times if Fastly is still serving the old one), and the grep count is at least 1.

- [ ] **Step 3: Clean up the worktree** with the superpowers:using-git-worktrees skill (remove worktree, keep the merged branch or delete it).

- [ ] **Step 4: Update memory**

In `/Users/emilegio/.claude/projects/-Users-emilegio/memory/project_karate.md`, replace the "Japanese toggle (IN PROGRESS ...)" paragraph with a LIVE paragraph: date, the `src/i18n/` layout, storage key `karate-lang`, the `lang` argument on dateUtils and why Excel stays English, the PDF-follows-screen decision, and that `ja.js` still needs a native-speaker read before 10 September. Update the one-line hook in `MEMORY.md` from "IN PROGRESS" to "LIVE".

---

## Self-review against the spec

- Goal, toggle placement, persistence, `<html lang>`: Task 3. Dates table: Task 2. Charts legends and tooltips: Task 7. Password-gate messages: Task 3. Native dialogs: Tasks 5 and 8. Excel stays English: Global Constraints + Task 8 proof step. PDF follows screen: no code, by design. Register and no-dash rule: Task 1 dictionaries and the dash test. Key parity, empties, placeholders, fallback: Task 1 test. Rollout on a branch, merge, verify live, memory: Tasks 0 and 10.
- Every `t('...')` key used in Tasks 3 to 8 exists in the Task 1 dictionaries, and every dictionary key is used by some task. Checked mechanically on 2026-09-05 by extracting both dictionaries from this file: 180 keys each, identical key sets, identical placeholders, no empty strings, no em or en dashes.
- Signatures used later match Task 1 and Task 2 definitions: `useLang() -> { lang, setLang, t }`, `t(key, vars)`, `formatDate(d, lang)`, `getMonth(d, lang)`, `getMonthLabel(mk, lang)`.
