/**
 * Builds a single-student PE attendance page for the Wellesley College club.
 *
 *   node scripts/build-student-page.mjs [StudentName] [outDirName]
 *
 * The emitted page is a static shell that reads attendance LIVE from Firestore in the
 * browser, so it never goes stale: fill in missing dates from the page itself, then print.
 * Output lands in public/<student>/index.html, so the normal `vite build` ships it at
 * /karate-attendance/<student>/ without touching the React app.
 *
 * Class-length rules set by the instructor: Tue 1:15, Thu 1:15, Sun 2:00.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const STUDENT = process.argv[2] || 'Sage';
const SLUG = (process.argv[3] || STUDENT).toLowerCase();
const FULL_NAME = STUDENT === 'Sage' ? 'Sage Wilder' : STUDENT;

const firebaseConfig = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'src/firebase.js'), 'utf8');
  const m = src.match(/const firebaseConfig = (\{[\s\S]*?\});/);
  if (!m) throw new Error('Could not parse firebaseConfig from src/firebase.js');
  return eval('(' + m[1] + ')');
})();

const logo = fs.readFileSync(
  '/Users/emilegio/ClaudeProjects/giovannielabs.ai/karate/logos/wellesley-college.svg', 'utf8'
).replace(/<\?xml.*?\?>/, '').trim();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${FULL_NAME} — Karate Attendance Record</title>
<meta name="robots" content="noindex, nofollow">
<style>
  @page { size: letter; margin: 0.6in; }
  :root {
    --wc-blue: #003c71;
    --wc-blue-soft: #e8eff6;
    --ink: #0b0b0b;
    --ink-2: #52514e;
    --muted: #898781;
    --rule: #dcdbd4;
    --grid: #ebeae4;
    --absent: #c9c8c1;
    --norecord: #f0efec;
    --surface: #ffffff;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #eceae4; color: var(--ink);
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 10.5pt; line-height: 1.45;
  }
  /* On screen the record sits on a page plane, like a sheet on a desk.
     In print the sheet IS the page, so the chrome collapses away. */
  .sheet {
    background: var(--surface); max-width: 8.5in; margin: 10px auto 40px;
    padding: 0.6in; border-radius: 2px;
    box-shadow: 0 1px 2px rgba(11,11,11,.12), 0 8px 28px rgba(11,11,11,.10);
  }
  .bar {
    max-width: 8.5in; margin: 16px auto 0; padding: 0 2px;
    display: flex; align-items: center; gap: 8px;
    font-family: system-ui, -apple-system, sans-serif; font-size: 9pt;
  }
  .bar .spacer { margin-left: auto; }
  button {
    font: inherit; font-family: system-ui, sans-serif; font-size: 9pt;
    color: var(--wc-blue); background: #fff; border: 1px solid var(--wc-blue);
    border-radius: 3px; padding: 6px 12px; cursor: pointer;
  }
  button:hover { background: var(--wc-blue); color: #fff; }
  button.primary { background: var(--wc-blue); color: #fff; }
  button.primary:hover { filter: brightness(1.25); }
  button[disabled] { opacity: .45; cursor: default; }
  .status-msg { font-family: system-ui, sans-serif; font-size: 8.5pt; color: var(--ink-2); }

  header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid var(--wc-blue); padding-bottom: 14px; }
  header svg { width: 54px; height: 54px; flex: none; }
  .org { font-size: 15pt; font-weight: 700; color: var(--wc-blue); letter-spacing: .01em; }
  .org small { display: block; font-size: 9pt; font-weight: 400; color: var(--ink-2); letter-spacing: .06em; text-transform: uppercase; margin-top: 3px; font-family: system-ui, sans-serif; }
  .issued { margin-left: auto; text-align: right; font-size: 8.5pt; color: var(--muted); font-family: system-ui, sans-serif; }

  h1 { font-size: 17pt; margin: 22px 0 2px; }
  .sub { color: var(--ink-2); margin: 0 0 20px; }

  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 22px; }
  .tile { border: 1px solid var(--rule); border-top: 3px solid var(--wc-blue); border-radius: 3px; padding: 12px 14px; }
  .tile.pending { border-top-color: var(--absent); }
  .tile .k { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-family: system-ui, sans-serif; }
  .tile .v { font-size: 24pt; font-weight: 700; color: var(--wc-blue); line-height: 1.15; margin-top: 4px; font-family: system-ui, sans-serif; }
  .tile.pending .v { color: var(--ink-2); }
  .tile .n { font-size: 8.5pt; color: var(--ink-2); font-family: system-ui, sans-serif; }

  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: .07em; color: var(--wc-blue); border-bottom: 1px solid var(--rule); padding-bottom: 5px; margin: 0 0 12px; font-family: system-ui, sans-serif; }
  section { margin-bottom: 24px; }

  .legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 8.5pt; color: var(--ink-2); margin-bottom: 8px; font-family: system-ui, sans-serif; }
  .legend span { display: flex; align-items: center; gap: 5px; }
  .sw { width: 10px; height: 10px; border-radius: 2px; flex: none; }

  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; font-family: system-ui, sans-serif; }
  thead th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); border-bottom: 1.5px solid var(--rule); padding: 0 8px 6px; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid var(--grid); font-variant-numeric: tabular-nums; }
  tbody tr.present td { background: var(--wc-blue-soft); }
  tbody tr.present td:first-child { box-shadow: inset 3px 0 0 var(--wc-blue); }
  td.num { text-align: right; }
  .pill { font-size: 8pt; }
  tr.present .pill { color: var(--wc-blue); font-weight: 600; }
  tr.absent .pill, tr.norecord .pill, tr.upcoming .pill { color: var(--muted); }
  tfoot td { padding-top: 9px; font-weight: 700; border-top: 1.5px solid var(--wc-blue); border-bottom: none; }

  /* Edit controls: only exist while editing, never on paper. */
  .mark { display: none; }
  body.editing .mark { display: flex; gap: 4px; }
  body.editing th.mark { display: table-cell; }
  .mark button {
    padding: 2px 7px; font-size: 8pt; border-color: var(--rule); color: var(--ink-2);
  }
  .mark button[aria-pressed="true"] { background: var(--wc-blue); border-color: var(--wc-blue); color: #fff; }
  .mark button:hover { background: var(--wc-blue); border-color: var(--wc-blue); color: #fff; }

  .note { background: #fafaf8; border-left: 3px solid var(--absent); padding: 10px 13px; font-size: 9pt; color: var(--ink-2); }
  .note ul { margin: 6px 0 0; padding-left: 16px; }
  .note li { margin-bottom: 3px; }

  .sign { margin-top: 30px; padding-top: 14px; border-top: 1px solid var(--rule); font-size: 9.5pt; }
  .sign .line { width: 260px; border-bottom: 1px solid var(--ink); height: 30px; }
  .sign .who { margin-top: 5px; font-weight: 700; }
  .sign .role, .sign .mail { color: var(--ink-2); font-size: 9pt; }

  .loading { padding: 60px 0; text-align: center; color: var(--muted); font-family: system-ui, sans-serif; }

  /* Paper is a hard constraint: two Letter sheets, even if the print dialog adds
     headers/footers, widens margins, or scales up. Content runs ~13.5in against 19.6in
     of usable paper, so this stays gentle on purpose — the earlier 3-page prints came
     from the phone breakpoint leaking onto paper, not from the record being too tall.
     Squeezing the type further would cost legibility on a document a registrar reads. */
  @media print {
    body { background: #fff; font-size: 10pt; line-height: 1.36; }
    .sheet { max-width: none; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
    .bar, .mark { display: none !important; }

    header { padding-bottom: 11px; }
    header svg { width: 48px; height: 48px; }
    .org { font-size: 14pt; }
    h1 { font-size: 16pt; margin: 13px 0 2px; }
    .sub { margin-bottom: 13px; }

    /* Hours completed / still scheduled / term total sit side by side on one line. */
    .tiles { grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 13px; }
    .tile { padding: 9px 12px; }
    .tile .v { font-size: 21pt; margin-top: 3px; }

    h2 { padding-bottom: 4px; margin-bottom: 9px; }
    section { margin-bottom: 14px; }
    .legend { margin-bottom: 6px; }
    /* Full width would make the chart ~2.1in tall; it reads fine smaller and the
       height is the scarce resource on paper. */
    svg { max-height: 1.7in; }

    table { font-size: 9pt; }
    thead th { padding-bottom: 4px; }
    td { padding: 2.5px 8px; }
    tfoot td { padding-top: 6px; }

    .note { padding: 8px 11px; font-size: 8.6pt; }
    .note li { margin-bottom: 2px; }

    /* A signature line stranded alone on a third sheet reads as a missing page. */
    .sign { margin-top: 20px; padding-top: 11px; }
    .sign .line { height: 27px; }
    /* Only small blocks are atomic. The class-by-class section is ~6in tall: making it
       unbreakable pushes the whole table to the next sheet the moment it overflows,
       which costs a page rather than saving one. It must stay free to split. */
    .note, .sign, tbody tr { break-inside: avoid; }
    thead { display: table-header-group; }
  }
  /* Phone rules, and ONLY phone rules. Without "screen" these also hit paper: Chrome
     resolves print media queries against the page area (~7.3in ≈ 700px at Letter with
     0.6in margins), which is under this breakpoint, so the tiles would silently stack
     into three rows on the printed record. */
  @media screen and (max-width: 800px) {
    body { background: #fff; }
    .sheet { margin: 0; padding: 20px; border-radius: 0; box-shadow: none; }
    .bar { margin-top: 10px; padding: 0 20px; flex-wrap: wrap; }
    header { flex-wrap: wrap; }
    .issued { margin-left: 0; text-align: left; width: 100%; }
    .tiles { grid-template-columns: 1fr; }
    table { font-size: 9pt; }
    td, thead th { padding-left: 4px; padding-right: 4px; }
  }
</style>
</head>
<body>

<div class="bar">
  <button id="edit-btn">Fill out attendance</button>
  <span id="msg" class="status-msg"></span>
  <span class="spacer"></span>
  <button id="print-btn" class="primary">Print / Save as PDF</button>
</div>

<div class="sheet">
  <header>
    ${logo}
    <div class="org">Wellesley College Shotokan Karate
      <small>Physical Education Attendance Record</small>
    </div>
    <div class="issued" id="issued"></div>
  </header>

  <h1>${FULL_NAME}</h1>
  <p class="sub">Verified attendance and contact hours, Summer 2026 term.</p>

  <div id="body"><div class="loading">Loading attendance…</div></div>
</div>

<script type="module">
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, doc, onSnapshot, setDoc, deleteField }
  from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const STUDENT = ${JSON.stringify(STUDENT)};
const START = '2026-06-01', END = '2026-07-31';
const TUESDAY_START = '2026-05-26';   // mirrors src/utils/dateUtils.js
const HOURS_BY_WEEKDAY = { 0: 2, 2: 1.25, 4: 1.25 };
const LABEL_BY_WEEKDAY = { 0: '2:00', 2: '1:15', 4: '1:15' };
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_TEXT = { present: 'Present', absent: 'Absent', norecord: 'No class scheduled', upcoming: 'Scheduled' };
const STATUS_FILL = { present: 'var(--wc-blue)', absent: 'var(--absent)', norecord: 'var(--norecord)' };

const pad = (n) => String(n).padStart(2, '0');
const dateAt = (s) => new Date(s + 'T12:00:00');
const iso = (d) => \`\${d.getFullYear()}-\${pad(d.getMonth()+1)}-\${pad(d.getDate())}\`;
const todayISO = () => iso(new Date());
const fmtHours = (h) => {
  const whole = Math.floor(h), mins = Math.round((h - whole) * 60);
  return mins ? \`\${whole}:\${pad(mins)}\` : \`\${whole}:00\`;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

/** Class calendar for the term, matching the app's own schedule rules. */
function classDates() {
  const out = [];
  for (const d = dateAt(START); iso(d) <= END; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(), s = iso(d);
    if (day === 4 || day === 0 || (day === 2 && s >= TUESDAY_START)) out.push(s);
  }
  return out;
}

/**
 * A day nobody was marked on is reported as "No class scheduled", never an absence —
 * the distinction matters on a document going to a registrar.
 *
 * CAVEAT: this is an inference, not a fact. All we know is that no student was marked.
 * That reads as "no class was held" only while attendance is actually being taken for
 * the classes that DO run; a held-but-unrecorded class lands in this same branch and
 * would be reported to the college as though it never happened.
 */
function statusFor(dateStr, row, today) {
  if (dateStr > today) return 'upcoming';
  if (row?.[STUDENT] === 1) return 'present';
  const classWasTaken = row && Object.values(row).some((x) => x === 1);
  return classWasTaken ? 'absent' : 'norecord';
}

function buildRows(attendance) {
  const today = todayISO();
  return classDates().map((dateStr) => {
    const d = dateAt(dateStr);
    return {
      date: dateStr,
      day: DAY_NAMES[d.getDay()],
      label: \`\${MONTH_NAMES[d.getMonth()].slice(0,3)} \${d.getDate()}\`,
      dayNum: d.getDate(),
      month: MONTH_NAMES[d.getMonth()],
      duration: LABEL_BY_WEEKDAY[d.getDay()],
      hours: HOURS_BY_WEEKDAY[d.getDay()],
      status: statusFor(dateStr, attendance[dateStr], today),
      raw: attendance[dateStr]?.[STUDENT],
    };
  });
}

// ── Chart: hours per class across the term, one bar per class day ───────────
function chartSVG(rows) {
  const W = 720, H = 210, padL = 34, padR = 8, padT = 8, padB = 46;
  const plotW = W - padL - padR, plotH = H - padT - padB, yMax = 2;
  const barW = Math.min(22, (plotW / rows.length) - 4);
  const xFor = (i) => padL + (plotW / rows.length) * (i + 0.5);
  const yFor = (v) => padT + plotH - (v / yMax) * plotH;

  const grid = [0, 1, 2].map((v) =>
    \`<line x1="\${padL}" x2="\${W-padR}" y1="\${yFor(v)}" y2="\${yFor(v)}" stroke="\${v===0?'var(--rule)':'var(--grid)'}" stroke-width="1"/>
     <text x="\${padL-7}" y="\${yFor(v)+3}" text-anchor="end" font-size="8" fill="var(--muted)" font-family="system-ui,sans-serif">\${v===0?'0':v+'h'}</text>\`
  ).join('');

  const bars = rows.map((r, i) => {
    const x = xFor(i) - barW/2, y = yFor(r.hours), h = padT + plotH - y;
    const title = \`<title>\${esc(r.label)} · \${esc(r.day)} · \${r.duration} · \${STATUS_TEXT[r.status]}</title>\`;
    if (r.status === 'upcoming') {
      return \`<rect x="\${x}" y="\${y}" width="\${barW}" height="\${h}" rx="3" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3 2.5" opacity="0.75">\${title}</rect>\`;
    }
    const stroke = r.status === 'norecord' ? ' stroke="var(--rule)" stroke-width="1"' : '';
    return \`<rect x="\${x}" y="\${y}" width="\${barW}" height="\${h}" rx="3" fill="\${STATUS_FILL[r.status]}"\${stroke}>\${title}</rect>\`;
  }).join('');

  // Direct-label only the attended bars — a number on every bar would be noise.
  const labels = rows.map((r, i) => r.status === 'present'
    ? \`<text x="\${xFor(i)}" y="\${yFor(r.hours)-5}" text-anchor="middle" font-size="7.5" fill="var(--wc-blue)" font-weight="600" font-family="system-ui,sans-serif">\${r.duration}</text>\`
    : '').join('');

  const ticks = rows.map((r, i) => i % 2 === 0
    ? \`<text x="\${xFor(i)}" y="\${H-26}" text-anchor="middle" font-size="7" fill="var(--muted)" font-family="system-ui,sans-serif">\${r.dayNum}</text>\`
    : '').join('');

  let seen = null;
  const months = rows.map((r, i) => {
    if (r.month === seen) return '';
    seen = r.month;
    return \`<text x="\${xFor(i)-6}" y="\${H-8}" font-size="8.5" font-weight="700" fill="var(--ink-2)" font-family="system-ui,sans-serif">\${r.month}</text>\`;
  }).join('');

  const attended = rows.filter((r) => r.status === 'present');
  const alt = \`Hours per class from June 1 to July 31, 2026. \${attended.length} classes attended, totalling \${fmtHours(attended.reduce((t,r)=>t+r.hours,0))} hours.\`;
  return \`<svg viewBox="0 0 \${W} \${H}" width="100%" role="img" aria-label="\${esc(alt)}">\${grid}\${bars}\${labels}\${ticks}\${months}</svg>\`;
}

function render(attendance) {
  const rows = buildRows(attendance);
  const sum = (list) => list.reduce((t, r) => t + r.hours, 0);
  const attended = rows.filter((r) => r.status === 'present');
  const upcoming = rows.filter((r) => r.status === 'upcoming');
  const norecord = rows.filter((r) => r.status === 'norecord');
  const earned = sum(attended), pending = sum(upcoming), potential = earned + pending;
  const byMonth = ['June','July'].map((m) => ({
    month: m,
    hours: sum(attended.filter((r) => r.month === m)),
    classes: attended.filter((r) => r.month === m).length,
  }));

  const today = new Date();
  const todayLabel = \`\${MONTH_NAMES[today.getMonth()]} \${today.getDate()}, \${today.getFullYear()}\`;
  document.getElementById('issued').innerHTML =
    \`Issued \${todayLabel}<br>Report period: June 1 – July 31, 2026\`;

  document.getElementById('body').innerHTML = \`
  <div class="tiles">
    <div class="tile">
      <div class="k">Hours completed</div>
      <div class="v">\${fmtHours(earned)}</div>
      <div class="n">\${attended.length} classes attended to date</div>
    </div>
    <div class="tile pending">
      <div class="k">Hours still scheduled</div>
      <div class="v">\${fmtHours(pending)}</div>
      <div class="n">\${upcoming.length} classes remaining this term</div>
    </div>
    <div class="tile pending">
      <div class="k">Term total if completed</div>
      <div class="v">\${fmtHours(potential)}</div>
      <div class="n">\${attended.length + upcoming.length} classes across June and July</div>
    </div>
  </div>

  <section>
    <h2>Attendance across the term</h2>
    <div class="legend">
      <span><i class="sw" style="background:var(--wc-blue)"></i>Attended</span>
      <span><i class="sw" style="background:var(--absent)"></i>Absent</span>
      <span><i class="sw" style="background:var(--norecord);border:1px solid var(--rule)"></i>No class scheduled</span>
      <span><i class="sw" style="border:1.5px dashed var(--muted);background:none"></i>Scheduled (not yet held)</span>
    </div>
    \${chartSVG(rows)}
  </section>

  <section>
    <h2>Class-by-class record</h2>
    <table>
      <thead><tr>
        <th>Date</th><th>Day</th><th>Class length</th><th>Status</th>
        <th class="num">Hours earned</th><th class="mark">Mark</th>
      </tr></thead>
      <tbody>
        \${rows.map((r) => \`<tr class="\${r.status}">
          <td>\${r.label}, 2026</td>
          <td>\${r.day}</td>
          <td>\${r.duration}</td>
          <td class="pill">\${STATUS_TEXT[r.status]}</td>
          <td class="num">\${r.status === 'present' ? fmtHours(r.hours) : '—'}</td>
          <td class="mark">
            <button data-date="\${r.date}" data-v="1" aria-pressed="\${r.raw === 1}">Present</button>
            <button data-date="\${r.date}" data-v="0" aria-pressed="\${r.raw === 0}">Absent</button>
            <button data-date="\${r.date}" data-v="clear" aria-pressed="\${r.raw !== 1 && r.raw !== 0}">Clear</button>
          </td>
        </tr>\`).join('')}
      </tbody>
      <tfoot><tr>
        <td colspan="4">Total hours completed as of \${todayLabel}</td>
        <td class="num">\${fmtHours(earned)}</td><td class="mark"></td>
      </tr></tfoot>
    </table>
  </section>

  <section>
    <div class="note">
      <strong>Notes on this record</strong>
      <ul>
        <li>Class length is fixed by schedule: Tuesday 1:15, Thursday 1:15, Sunday 2:00.</li>
        <li>June: \${fmtHours(byMonth[0].hours)} across \${byMonth[0].classes} classes. July: \${fmtHours(byMonth[1].hours)} across \${byMonth[1].classes} classes.</li>
        \${upcoming.length ? \`<li>\${upcoming.length} classes remain scheduled through July 31 and are shown as pending. If \${STUDENT} attends all of them, her term total reaches \${fmtHours(potential)}.</li>\` : ''}
        \${norecord.length ? \`<li>No class was held on \${norecord.length} \${norecord.length === 1 ? 'date' : 'dates'} in the regular Tuesday, Thursday and Sunday pattern (\${norecord.map((r) => r.label).join(', ')}), so \${norecord.length === 1 ? 'it is' : 'they are'} not counted against her attendance.</li>\` : ''}
        <li>Attendance is recorded live in the club's attendance system at each class.</li>
      </ul>
    </div>
  </section>

  <div class="sign">
    <div class="line"></div>
    <div class="who">Vazrik Chiloyan</div>
    <div class="role">Instructor, Wellesley College Shotokan Karate</div>
    <div class="mail">vazrik@mit.edu</div>
  </div>\`;
}

// ── Live data ───────────────────────────────────────────────────────────────
const db = getFirestore(initializeApp(${JSON.stringify(firebaseConfig)}));
const ref = doc(db, 'attendance-data', 'main');
const msg = document.getElementById('msg');
const say = (t) => { msg.textContent = t; };

onSnapshot(ref, (snap) => {
  if (!snap.exists()) { say('Could not load attendance.'); return; }
  render(snap.data().attendance || {});
}, (err) => { say('Load failed: ' + err.message); });

// ── Editing ─────────────────────────────────────────────────────────────────
const editBtn = document.getElementById('edit-btn');

function setEditing(on) {
  document.body.classList.toggle('editing', on);
  editBtn.textContent = on ? 'Done editing' : 'Fill out attendance';
  editBtn.classList.toggle('primary', on);
  say(on ? 'Marking ' + STUDENT + '. Changes save as you click.' : '');
}

editBtn.addEventListener('click', () => {
  setEditing(!document.body.classList.contains('editing'));
});

// Merge-write a single field so other students and dates are never touched.
document.getElementById('body').addEventListener('click', async (e) => {
  const btn = e.target.closest('.mark button');
  if (!btn || !document.body.classList.contains('editing')) return;
  const { date, v } = btn.dataset;
  const value = v === 'clear' ? deleteField() : Number(v);
  say('Saving ' + date + '…');
  try {
    await setDoc(ref, { attendance: { [date]: { [STUDENT]: value } } }, { merge: true });
    say('Saved ' + date + '.');
  } catch (err) {
    say('Save failed: ' + err.message);
  }
});

document.getElementById('print-btn').addEventListener('click', () => {
  document.body.classList.remove('editing');
  setEditing(false);
  window.print();
});
</script>
</body>
</html>`;

const out = path.join(ROOT, 'public', SLUG, 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${out}\n  → ships at /karate-attendance/${SLUG}/`);
