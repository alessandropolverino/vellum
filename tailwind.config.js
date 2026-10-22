/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#fdfaf2',
          100: '#f8f1df',
          200: '#efe2c0',
          300: '#e2cb98',
          800: '#58180D',
          900: '#3b0f08',
        },
        dndRed: {
          DEFAULT: '#58180D',
          light: '#7a2213',
          dark: '#3d0e06',
          gold: '#c9ad6a',
        }
      },
      fontFamily: {
        serif: ['"Bookinsanity"', '"Georgia"', '"Cambria"', '"Times New Roman"', 'serif'],
        header: ['"Cinzel"', '"Georgia"', 'serif'],
        sans: ['"ScalySans"', '"Inter"', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
