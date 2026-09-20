/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tron: {
          bg: '#090a0f',
          primary: '#00f3ff', // Cyan
          secondary: '#ff003c', // Red/Orange
        },
        matrix: {
          bg: '#000000',
          primary: '#00ff41', // Matrix Green
          secondary: '#008f11', // Darker Green
        }
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      }
    },
  },
  plugins: [],
}
