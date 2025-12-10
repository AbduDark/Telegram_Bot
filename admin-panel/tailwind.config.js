/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FBF7E4',
          100: '#F7EECC',
          200: '#EFDD99',
          300: '#E7CC66',
          400: '#DFBB33',
          500: '#D4AF37',
          600: '#B8962E',
          700: '#8C7223',
          800: '#604E18',
          900: '#342A0D',
        },
        dark: {
          50: '#4A4A4A',
          100: '#3D3D3D',
          200: '#303030',
          300: '#242424',
          400: '#1A1A1A',
          500: '#121212',
          600: '#0D0D0D',
          700: '#080808',
          800: '#050505',
          900: '#000000',
        }
      },
      fontFamily: {
        arabic: ['Tajawal', 'Cairo', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}