# Japanese language toggle: design

**Date:** 2026-09-05
**Status:** approved by Emile (approach A, "every screen, exports stay English")
**Why now:** JUKF visit to Boston with Osada Sensei, 10 to 17 September 2026. The team wants to show the attendance app in Japanese.

## Goal

A visitor opens `emilezounon.com/karate-attendance/`, taps 日本語 in the header, and every screen reads in Japanese: labels, buttons, hints, warnings, tab names, chart legends, tooltips, the password gate, and dates. Tapping EN switches back. The choice is remembered on that device.

## Non-goals

- Student names are never translated or transliterated.
- The Excel export stays English regardless of the toggle (it goes to registrars).
- The Charts PDF is a screenshot of the screen (`html2canvas`), so it follows whatever language is showing when Download is clicked. No forcing to English. Emile chose this explicitly.
- `public/classic/` (archived old app), `public/sage/` (Wellesley PE record) and `public/v1/`, `public/v2/` are untouched.
- No French yet. The structure must make it a one-file addition later.

## Architecture

New folder `src/i18n/`:

| File | Purpose |
|---|---|
| `en.js` | `export default { ... }` flat object, dotted keys, English strings. The single source of truth for every user-facing label. |
| `ja.js` | Same keys, Japanese strings. |
| `index.jsx` | `LanguageProvider`, `useLang()` hook, `t()` implementation, `LANGS = ['en', 'ja']`, storage key `karate-lang`. |

`useLang()` returns `{ lang, setLang, t }`.

`t(key, vars)`:
1. Look up `key` in the active dictionary; fall back to `en`; fall back to the key itself. A missing Japanese string therefore shows English, never a blank.
2. Replace `{name}`-style placeholders from `vars`.
3. Plural forms are handled by separate keys where English needs them (e.g. `paste.added.one`, `paste.added.many`); Japanese has no plural so both keys carry the same string.

The provider sits at the very top (in `main.jsx`, wrapping `<App />`) so `PasswordGate` is inside it and the gate can show the toggle. It also sets `document.documentElement.lang` to the active language.

`LanguageToggle` component (`src/components/LanguageToggle.jsx`): a two-segment pill, "EN | 日本語", `aria-pressed` on the active segment, rendered top-right in `App.jsx`'s header and top-right on the `PasswordGate` card.

### Tabs

`App.jsx` `TABS` becomes an array of stable keys (`today`, `attendance`, `danExam`, `awards`, `charts`, `analytics`, `manage`). `activeTab` state holds the key; the button label is `t('nav.' + key)`. Nothing else keys off the English tab names.

### Dates

`src/utils/dateUtils.js` formatting functions gain a trailing `lang = 'en'` argument:

| Function | en | ja |
|---|---|---|
| `formatDate(d, lang)` | `Thu 3/9` | `9/3（木）` |
| `getMonth(d, lang)` | `September` | `9月` |
| `getMonthLabel(key, lang)` | `September 2026` | `2026年9月` |

Weekday characters for `ja`: 日 月 火 水 木 金 土. Components pass `lang` from `useLang()`. The Excel export in `ManageStudentsTab` calls these without `lang`, so it stays English by default with no special casing.

### Charts

Recharts `name=` props and custom tooltip labels go through `t()`. Axis tick text is data (student names, dates via `formatDate(d, lang)`).

### Native dialogs

`confirm()` and `alert()` strings in `ManageStudentsTab` and `PasteNamesBulkAdd` go through `t()` like everything else.

## Japanese register

- Navigation and headings: short noun phrases. 今日 · 出席 · 昇段審査 · 表彰 · グラフ · 分析 · 生徒管理.
- Hints, confirmations, warnings: polite form (です・ます).
- Karate terms stay in kanji where a Japanese reader expects them: 初段, 弐段, 指導員, 道場, 稽古, 昇段.
- The three password-gate messages (Keikoku / Hansoku-Chui / Hansoku) get faithful Japanese versions that keep the joke.
- Existing decorative kanji in the Dojo theme (道場, 今日, 賞, 昇段) are left as they are in both languages.
- Emile's rule: no em or en dashes in copy. Use commas, periods, colons, or the Japanese 、and 。.

The Japanese file is written by Claude and must be read by a native speaker before the visit. It is one file so that review is a twenty-minute job.

## Testing

`scripts/test-i18n.mjs`, run with plain `node` like the other tests:

1. `en` and `ja` have exactly the same key set (report keys missing on either side).
2. No string is empty or whitespace.
3. Every `{placeholder}` in an English string appears in the Japanese string.
4. `t()` falls back to English for a key missing in `ja`, and to the key itself when missing everywhere.
5. `formatDate`, `getMonth`, `getMonthLabel` produce the table above for both languages, and the no-argument call still returns English.

Then the manual pass used for every change here: `vite preview`, log in, walk each tab in English and again in Japanese, screenshot the paste preview in Japanese.

## Rollout

Work on branch `japanese-toggle` in a git worktree so `main` (auto-deploys on push) stays untouched until both languages render cleanly. Land in three commits:

1. i18n core, `LanguageToggle`, `main.jsx` provider, `App.jsx` header + tabs, `PasswordGate`, `TodayTab`, `dateUtils`, the i18n test.
2. `AttendanceTab`, `PasteAttendance`, `PasteNamesBulkAdd`, `DidYouMean`, `GradingTab`, `AwardsTab`.
3. `ChartsTab`, `AnalyticsTab`, `ManageStudentsTab`, `ImportWordDoc`.

Then fast-forward merge into `main`, push, `gh run watch`, verify the live bundle contains a Japanese string. Update the project memory. A native-speaker pass on `ja.js` afterwards is a one-file follow-up commit.

## Open risks

- Roughly 220 strings across 13 components. The mechanical edits are where a label gets missed; the manual walk-through in Japanese is the catch.
- Long Japanese strings may wrap differently in tight spots (pill tabs, the paste preview headings). Check on a phone-width viewport.
- Fonts: the theme loads Zen Antique and Zen Kaku Gothic, which are Japanese-capable, so no new font work is expected.
