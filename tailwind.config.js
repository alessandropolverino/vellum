/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Muted overrides of the default Tailwind palettes: same names, lower saturation.
        amber: {
          50: '#faf7f0', 100: '#f1ebdb', 200: '#e3d6b8', 300: '#d6c59f', 400: '#c4ad7c',
          500: '#b39a62', 600: '#a08650', 700: '#735e3b', 800: '#5a4a33', 900: '#483c2b', 950: '#292118',
        },
        red: {
          50: '#faf1f0', 100: '#f3dedd', 200: '#e8c3c1', 300: '#d9a3a0', 400: '#c47f7b',
          500: '#b06461', 600: '#96504e', 700: '#7c4140', 800: '#653536', 900: '#4f2b2c', 950: '#2e1a1b',
        },
        emerald: {
          50: '#f0f6f3', 100: '#dceae2', 200: '#bcd5c7', 300: '#a6c4b4', 400: '#82ad98',
          500: '#66937d', 600: '#527a65', 700: '#416152', 800: '#354e43', 900: '#2b3f37', 950: '#18241f',
        },
        purple: {
          50: '#f4f2f8', 100: '#e6e1ef', 200: '#d0c8e0', 300: '#c0b2d6', 400: '#a593c4',
          500: '#8975aa', 600: '#70608e', 700: '#5b4e74', 800: '#483f5c', 900: '#393249', 950: '#211d2b',
        },
        sky: {
          300: '#a5bfcf', 400: '#86a6ba', 500: '#6b8ea5', 600: '#577489', 700: '#475f70',
          800: '#394c59', 900: '#2f3e48', 950: '#1b242a',
        },
        blue: {
          300: '#a5bbd4', 400: '#859fc0', 500: '#6a85a8', 600: '#556d8c', 700: '#455873',
          800: '#384659', 900: '#2e3947',
        },
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
