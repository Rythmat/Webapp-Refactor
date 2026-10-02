import { colord } from 'colord';
import type { Config } from 'tailwindcss';

export const SCREEN_SIZES = {
  sm: 520,
  md: 768,
  lg: 1024,
  xl: 1536,
};

/**
 * The brand steps, in the landing look: the white pill and its hover/active
 * greys. Brand yellow (#FFCC33 and its family) was retired from the UI on
 * 29 Sep 2026; yellow now appears only where it means something — A's key
 * colour below is the same hue, which is why it could not stay a UI accent.
 * These are fallbacks; src/styles/appTheme.css sets the live values.
 */
const COLORS = {
  'brand-darker': '#D1D1D3', // active, white/82
  'brand-dark': '#E6E6E8', // hover, white/90
  'brand-base': '#FFFFFF',
  'brand-light': '#FFFFFF',
  'brand-lighter': '#FFFFFF',
};

const SEMANTIC_COLORS = {
  'success-darker': '#1B6B1B',
  'success-dark': '#2C942C',
  'success-base': '#43BF43',
  'success-light': '#81E681',
  'success-lighter': '#D5F2D5',
  'danger-darker': '#99291F',
  'danger-dark': '#CC4033',
  'danger-base': '#F26255',
  'danger-light': '#FFA299',
  'danger-lighter': '#FFDCD9',
};

const COLOR_GREYS = {
  'grey-darkest': '#0D0B08',
  'grey-darker': '#3D3A35',
  'grey-dark': '#615D57',
  'grey-base': '#85807A',
  'grey-light': '#A8A49E',
  'grey-lighter': '#D6D3CE',
  'grey-lightest': '#F5F4F2',
};

const COLOR_SHADES = {
  'shade-1': '#0D0B08D9',
  'shade-2': '#0D0B08B2',
  'shade-3': '#0D0B088C',
  'shade-4': '#0D0B0866',
  'shade-5': '#0D0B0840',
  'shade-6': '#0D0B081F',
  'shade-7': '#26221D12',
};

const COLOR_SURFACES = {
  'surface-box': '#0D0B08',
};

export const KEY_OF_COLORS = {
  C: '#D2404A',
  G: '#FF7348',
  D: '#FEA92A',
  A: '#FFCB30',
  E: '#AED580',
  B: '#7FC783',
  'F#': '#28A69A',
  Db: '#62B4F7',
  Ab: '#7885CB',
  Eb: '#9D7FCE',
  Bb: '#C785D3',
  F: '#F8A8C5',
};

/**
 * A theme colour that a surface can re-skin by setting `--ui-<name>` (an HSL
 * triplet, e.g. `0 0% 100%`). Unset, the fallback is exactly `hex`.
 * `src/styles/appTheme.css` sets them on `:root` — the root rather than a
 * wrapper, so Radix portals pick them up too.
 */
const themed = (name: string, hex: string) => {
  const { h, s, l } = colord(hex).toHsl();
  return `hsl(var(--ui-${name}, ${h} ${s}% ${l}%) / <alpha-value>)`;
};

const BRAND_COLORS = Object.fromEntries(
  Object.entries(COLORS).map(([name, hex]) => [name, themed(name, hex)]),
);

export const theme: Config['theme'] = {
  container: {
    padding: '1rem',
    center: true,
  },
  screens: {
    sm: `${SCREEN_SIZES.sm}px`,
    md: `${SCREEN_SIZES.md}px`,
    lg: `${SCREEN_SIZES.lg}px`,
    xl: `${SCREEN_SIZES.xl}px`,
  },
  extend: {
    keyframes: {
      'piano-key-press': {
        '0%': { opacity: '0.8' },
        '50%': { opacity: '0.6' },
        '100%': { opacity: '1' },
      },
      highlight: {
        '0%': { backgroundColor: '#fff' },
        '50%': { backgroundColor: 'rgba(147, 197, 253, 0.3)' },
        '100%': { backgroundColor: '#fff' },
      },
      'caret-blink': {
        '0%,70%,100%': { opacity: '1' },
        '20%,50%': { opacity: '0' },
      },
      'fade-in-bottom': {
        from: {
          opacity: '0',
          transform: 'translate3d(0, 10px, 0)',
        },
        to: {
          opacity: '1',
          transform: 'translate3d(0, 0, 0)',
        },
      },
    },
    animation: {
      'piano-key-press': 'piano-key-press 48ms ease-in-out',
      highlight: 'highlight 1s ease-in-out',
      'caret-blink': 'caret-blink 1.25s ease-out infinite',
      'fade-in-bottom':
        'fade-in-bottom 0.4s cubic-bezier(0.39, 0.575, 0.565, 1)',
    },
    colors: {
      'surface-box': themed('surface-box', COLOR_SURFACES['surface-box']),
      ...COLOR_SHADES,
      ...BRAND_COLORS,
      ...COLOR_GREYS,
      ...SEMANTIC_COLORS,
      primary: {
        // Primary UI elements like buttons, active states.
        DEFAULT: themed('primary', COLORS['brand-base']),
        // Text/icon color on primary background.
        foreground: themed('primary-foreground', COLOR_GREYS['grey-darkest']),
      },
      secondary: {
        // Secondary UI elements like less prominent buttons or highlights.
        DEFAULT: themed('secondary', COLORS['brand-dark']),
        // Text/icon color on secondary background.
        foreground: themed(
          'secondary-foreground',
          COLOR_GREYS['grey-lightest'],
        ),
      },
      // Default page background.
      background: themed('background', COLOR_GREYS['grey-darkest']),
      // Default text/icon color on the page background.
      foreground: themed('foreground', COLOR_GREYS['grey-lightest']),
      card: {
        // Background color for card-like components.
        DEFAULT: themed('card', COLOR_GREYS['grey-dark']),
        // Text/icon color on card background.
        foreground: themed('card-foreground', COLOR_GREYS['grey-lightest']),
      },
      cream: {
        // Custom color for cream-like backgrounds.
        DEFAULT: themed('cream', COLORS['brand-lighter']),
        // Text/icon color on cream background.
        dark: themed('cream-dark', COLORS['brand-darker']),
      },
      // Background for popovers, tooltips, dropdown menus.
      popover: {
        DEFAULT: themed('popover', COLORS['brand-dark']),
        foreground: themed('popover-foreground', COLOR_GREYS['grey-lightest']),
      },
      // Muted backgrounds for subtle elements, often used for disabled states or secondary text.
      muted: {
        DEFAULT: themed('muted', COLOR_GREYS['grey-dark']),
        foreground: themed('muted-foreground', COLOR_GREYS['grey-lighter']),
      },
      // Accent color for elements like borders on focused inputs, highlights.
      accent: {
        DEFAULT: themed('accent', COLORS['brand-darker']),
        foreground: themed('accent-foreground', COLOR_GREYS['grey-lightest']),
      },
      // Destructive actions like delete buttons, error messages.
      destructive: {
        DEFAULT: themed('destructive', SEMANTIC_COLORS['danger-darker']),
        foreground: themed(
          'destructive-foreground',
          COLOR_GREYS['grey-lightest'],
        ),
      },
      // Borders for components like inputs, cards, dividers.
      border: themed('border', COLOR_GREYS['grey-dark']),
      // Border color specifically for input fields.
      input: themed('input', COLOR_GREYS['grey-dark']),
      // Focus rings for interactive elements.
      ring: themed('ring', COLOR_GREYS['grey-dark']),
      chart: {
        '1': 'hsl(var(--chart-1))',
        '2': 'hsl(var(--chart-2))',
        '3': 'hsl(var(--chart-3))',
        '4': 'hsl(var(--chart-4))',
        '5': 'hsl(var(--chart-5))',
      },
      sidebar: {
        DEFAULT: 'hsl(var(--sidebar-background))',
        foreground: 'hsl(var(--sidebar-foreground))',
        primary: 'hsl(var(--sidebar-primary))',
        'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
        accent: 'hsl(var(--sidebar-accent))',
        'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
        border: 'hsl(var(--sidebar-border))',
        ring: 'hsl(var(--sidebar-ring))',
      },
    },

    borderRadius: {
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)',
    },
  },
};
