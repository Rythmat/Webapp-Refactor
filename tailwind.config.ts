import { theme } from './src/constants/theme';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: theme,
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
};
