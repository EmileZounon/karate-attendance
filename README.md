# Karate Black Belt Program — Attendance Tracker

A web app for tracking and analysing attendance for the Karate Black Belt Program 2026. Built with React and deployed to GitHub Pages.

**Live app:** https://emilezounon.github.io/karate-attendance/

---

## Features

### Attendance Tab
- Grid view of all classes (Thursdays & Sundays)
- Click any cell to cycle through states: **Empty → Present (1) → Absent (0) → Empty**
- Row totals show how many students attended each class
- Data persists in the browser via `localStorage`

### Analytics Tab
- **Student Statistics** — ranked table with classes attended, classes held, and attendance %
- **Monthly Summary** — total attendance, classes held, and average per class by month
- **Student Attendance by Month** — breakdown per student across months
- Export the full report as a **PDF**

### Charts Tab
- Bar chart: attendance count per student
- Bar chart: monthly total attendance vs. classes held
- Line chart: students present per class over time
- Stacked bar chart: student attendance contribution by month
- Export charts as a **PDF**

### Manage Students Tab
- Add or remove students (removing also clears their attendance records)
- Import student names from a **Word document** (`.docx`)
- Export all data as **JSON** for backup
- Import a previously exported **JSON** file
- Reset everything back to the default 16-student January 2026 dataset

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| PDF export | jsPDF + html2canvas |
| Word parsing | Mammoth |
| Persistence | localStorage |
| Deployment | GitHub Actions → GitHub Pages |

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The app deploys automatically to GitHub Pages on every push to `main` via the workflow in `.github/workflows/deploy.yml`.

---

## Data Format

Attendance data is stored (and exported) as JSON with this shape:

```json
{
  "students": ["Paul", "Varak", "Bruce", ...],
  "attendance": {
    "2026-01-04": {
      "Paul": 1,
      "Varak": 1,
      "Bruce": 0
    }
  }
}
```

`1` = present, `0` = absent, key absent = no record for that day.
