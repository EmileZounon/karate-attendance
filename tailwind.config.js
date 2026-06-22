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
        sumi:    '#15110F',
        sumi2:   '#1E1916',
        sumi3:   '#2A2320',
        gi:      '#EFE7D8',
        gidim:   '#A89C8A',
        gifaint: '#6F665B',
        hinomaru:     '#D23B2C',
        hinomarudeep: '#A82A1E',
        indigoink:    '#3E5C82',
        indigosoft:   '#5E7CA3',
        gold:    '#C8A24B',
        line:    'rgba(239,231,216,0.10)',
        line2:   'rgba(239,231,216,0.16)',
      },
      fontFamily: {
        serif: ["'Zen Antique'", 'Georgia', 'serif'],
        sans:  ["'Zen Kaku Gothic New'", 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
