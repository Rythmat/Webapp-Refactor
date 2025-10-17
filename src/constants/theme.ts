import { colord } from 'colord';
import type { Config } from 'tailwindcss';

export const SCREEN_SIZES = {
  sm: 520,
  md: 768,
  lg: 1024,
  xl: 1536,
};

const COLORS = {
  'brand-darker': '#F2920C',
  'brand-dark': '#FFB219',
  'brand-base': '#FFCC33',
  'brand-light': '#FFE873',
  'brand-lighter': '#FFF9B2',
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
  'surface-box': '#3D3A35',
};

export const KEY_OF_COLORS = {
  C: '#D2404A',
  G: '#FF7348',
  D: '#FEA93A',
  A: '#FFCB30',
  E: '#AED580',
  B: '#7FC783',
  F_SHARP: '#28A69A',
  D_FLAT: '#62B4F7',
  A_FLAT: '#7885CB',
  E_FLAT: '#9D7FCE',
  B_FLAT: '#C783D3',
  F: '#F8C8C5',
};

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
      ...COLOR_SURFACES,
      ...COLOR_SHADES,
      ...COLORS,
      ...COLOR_GREYS,
      ...SEMANTIC_COLORS,
      primary: {
        // Primary UI elements like buttons, active states.
        DEFAULT: colord(COLORS['brand-base']).toHslString(),
        // Text/icon color on primary background.
        foreground: colord(COLOR_GREYS['grey-darkest']).toHslString(),
      },
      secondary: {
        // Secondary UI elements like less prominent buttons or highlights.
        DEFAULT: colord(COLORS['brand-dark']).toHslString(),
        // Text/icon color on secondary background.
        foreground: colord(COLOR_GREYS['grey-lightest']).toHslString(),
      },
      // Default page background.
      background: colord(COLOR_GREYS['grey-darkest']).toHslString(),
      // Default text/icon color on the page background.
      foreground: colord(COLOR_GREYS['grey-lightest']).toHslString(),
      card: {
        // Background color for card-like components.
        DEFAULT: colord(COLOR_GREYS['grey-dark']).toHslString(),
        // Text/icon color on card background.
        foreground: colord(COLOR_GREYS['grey-lightest']).toHslString(),
      },
      cream: {
        // Custom color for cream-like backgrounds.
        DEFAULT: colord(COLORS['brand-lighter']).toHslString(),
        // Text/icon color on cream background.
        dark: colord(COLORS['brand-darker']).toHslString(),
      },
      // Background for popovers, tooltips, dropdown menus.
      popover: {
        DEFAULT: colord(COLORS['brand-dark']).toHslString(),
        foreground: colord(COLOR_GREYS['grey-lightest']).toHslString(),
      },
      // Muted backgrounds for subtle elements, often used for disabled states or secondary text.
      muted: {
        DEFAULT: colord(COLOR_GREYS['grey-dark']).toHslString(),
        foreground: colord(COLOR_GREYS['grey-lighter']).toHslString(),
      },
      // Accent color for elements like borders on focused inputs, highlights.
      accent: {
        DEFAULT: colord(COLORS['brand-darker']).toHslString(),
        foreground: colord(COLOR_GREYS['grey-lightest']).toHslString(),
      },
      // Destructive actions like delete buttons, error messages.
      destructive: {
        DEFAULT: colord(SEMANTIC_COLORS['danger-darker']).toHslString(),
        foreground: colord(COLOR_GREYS['grey-lightest']).toHslString(),
      },
      // Borders for components like inputs, cards, dividers.
      border: colord(COLOR_GREYS['grey-dark']).toHslString(),
      // Border color specifically for input fields.
      input: colord(COLOR_GREYS['grey-dark']).toHslString(),
      // Focus rings for interactive elements.
      ring: colord(COLOR_GREYS['grey-dark']).toHslString(),
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
