/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        'riwi-dark': '#181E4B',
        'riwi-purple': '#6B5CFF',
        'riwi-mint': '#5ACCA4',
        'riwi-red': '#FE654F',
        'riwi-gray': '#F9FAFC',
      },
      fontFamily: {
        'ubuntu': ['Ubuntu', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
