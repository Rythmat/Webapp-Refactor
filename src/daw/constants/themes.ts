export interface ThemePalette {
  [key: string]: string;
}

export const THEMES: { dark: ThemePalette } = {
  dark: {
    '--color-bg': '#191919',
    '--color-surface': '#1a1a1a',
    '--color-surface-2': '#1e1e1e',
    '--color-surface-3': '#222222',
    '--color-border': 'rgba(255, 255, 255, 0.08)',
    '--color-text': '#e8e8f0',
    '--color-text-dim': '#6b6b80',
    '--color-accent': '#7ecfcf',
    '--color-grid-line': 'rgba(255, 255, 255, 0.04)',
    '--color-grid-rgb': '255, 255, 255',
    '--color-ruler-text': 'rgba(255, 255, 255, 0.25)',
    '--color-scrollbar-thumb': 'rgba(255, 255, 255, 0.08)',
    '--glass-border': '1px solid rgba(255, 255, 255, 0.08)',
    '--glass-border-light': '1px solid rgba(255, 255, 255, 0.1)',
    '--glass-shadow': '0 4px 24px rgba(0, 0, 0, 0.3)',
    '--glass-shadow-deep': '0 8px 32px rgba(0, 0, 0, 0.4)',
    '--glass-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
    '--glass-highlight': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
};

export type ThemeId = keyof typeof THEMES;
