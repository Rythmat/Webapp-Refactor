import { theme } from './src/constants/theme';
import {
  DAW_TAILWIND_COLORS,
  DAW_TAILWIND_DURATIONS,
  DAW_TAILWIND_EASING,
} from './src/daw/ui/tokens';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // The app's theme plus the Studio editor's token keys (bg-daw-surface-1,
  // text-daw-text-3, duration-daw-fast…; src/daw/ui/tokens.ts). New keys
  // only. They are added here, not in src/constants/theme.ts, because the
  // app imports theme.ts at run time and would carry the token module in its
  // boot chunk; this file only runs at build time.
  theme: {
    ...theme,
    extend: {
      ...theme?.extend,
      colors: {
        ...(theme?.extend?.colors as Record<string, unknown>),
        daw: DAW_TAILWIND_COLORS,
      },
      transitionDuration: DAW_TAILWIND_DURATIONS,
      transitionTimingFunction: DAW_TAILWIND_EASING,
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
    require('@tailwindcss/container-queries'),
  ],
};
