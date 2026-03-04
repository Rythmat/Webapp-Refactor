export type ThemeId = 'dark' | 'balanced' | 'light';

export interface ThemePalette {
  [key: string]: string;
}

export const THEMES: Record<ThemeId, ThemePalette> = {
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
  balanced: {
    '--color-bg': '#2a2a2e',
    '--color-surface': '#303035',
    '--color-surface-2': '#37373d',
    '--color-surface-3': '#3e3e45',
    '--color-border': 'rgba(255, 255, 255, 0.10)',
    '--color-text': '#e4e4ec',
    '--color-text-dim': '#8888a0',
    '--color-accent': '#7ecfcf',
    '--color-grid-line': 'rgba(255, 255, 255, 0.05)',
    '--color-grid-rgb': '255, 255, 255',
    '--color-ruler-text': 'rgba(255, 255, 255, 0.30)',
    '--color-scrollbar-thumb': 'rgba(255, 255, 255, 0.10)',
    '--glass-border': '1px solid rgba(255, 255, 255, 0.10)',
    '--glass-border-light': '1px solid rgba(255, 255, 255, 0.12)',
    '--glass-shadow': '0 4px 24px rgba(0, 0, 0, 0.2)',
    '--glass-shadow-deep': '0 8px 32px rgba(0, 0, 0, 0.3)',
    '--glass-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    '--glass-highlight': 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
  },
  light: {
    '--color-bg': '#D3D3D3',
    '--color-surface': '#DADADE',
    '--color-surface-2': '#E0E0E4',
    '--color-surface-3': '#E6E6EA',
    '--color-border': 'rgba(0, 0, 0, 0.10)',
    '--color-text': '#1a1a2e',
    '--color-text-dim': '#6b6b80',
    '--color-accent': '#4ca8a8',
    '--color-grid-line': 'rgba(0, 0, 0, 0.06)',
    '--color-grid-rgb': '0, 0, 0',
    '--color-ruler-text': 'rgba(0, 0, 0, 0.35)',
    '--color-scrollbar-thumb': 'rgba(0, 0, 0, 0.12)',
    '--glass-border': '1px solid rgba(0, 0, 0, 0.08)',
    '--glass-border-light': '1px solid rgba(0, 0, 0, 0.10)',
    '--glass-shadow': '0 4px 24px rgba(0, 0, 0, 0.08)',
    '--glass-shadow-deep': '0 8px 32px rgba(0, 0, 0, 0.12)',
    '--glass-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',
    '--glass-highlight': 'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
  },
};

export const THEME_LABELS: Record<ThemeId, string> = {
  dark: 'Dark',
  balanced: 'Balanced',
  light: 'Light',
};

export const THEME_ORDER: ThemeId[] = ['dark', 'balanced', 'light'];
