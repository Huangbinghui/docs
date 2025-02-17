// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.vue",
    "./docs/**/*.{vue,js,ts,jsx,tsx,md}",
    "./docs/.vitepress/**/*.{vue,js,ts,jsx,tsx,md}"
  ],
  options: {
    safelist: ["html", "body"],
  },
  theme: {
    extend: {
        invert: {
          25: '.25',
          50: '.5',
          75: '.75',
          80: '.8',
          85: '.85',
          90: '.',
          100: '1',
        }
    }
  }
};