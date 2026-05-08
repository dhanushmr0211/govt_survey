/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E53E3E',
          dark: '#C53030',
          light: '#FEB2B2',
        },
        background: '#F7FAFC',
      },
    },
  },
  plugins: [],
}
