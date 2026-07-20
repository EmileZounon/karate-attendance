/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dojo (Direction 01 · 道場) palette — sumi ink + gi canvas, one hinomaru red, gold for earned
        // (lightened a step from near-black for readability — 2026-06-22)
        sumi:    '#241F1B',
        sumi2:   '#312A25',
        sumi3:   '#3E352E',
        gi:      '#EFE7D8',
        gidim:   '#BCB1A1',
        gifaint: '#8B8174',
        hinomaru:     '#D23B2C',
        hinomarudeep: '#A82A1E',
        indigoink:    '#3E5C82',
        indigosoft:   '#5E7CA3',
        gold:    '#C8A24B',
        line:    'rgba(239,231,216,0.12)',
        line2:   'rgba(239,231,216,0.18)',
      },
      fontFamily: {
        serif: ["'Zen Antique'", 'Georgia', 'serif'],
        sans:  ["'Zen Kaku Gothic New'", 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
