import { useEffect } from 'react';
import { useStore } from '@/daw/store';
import { THEMES, type ThemeId } from '@/daw/constants/themes';

const STORAGE_KEY = 'prism-daw-theme';

export function useTheme() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (saved && saved in THEMES) {
      setTheme(saved);
    }
  }, [setTheme]);

  // Apply CSS variables + persist whenever theme changes
  useEffect(() => {
    const root = document.querySelector('.daw-root') as HTMLElement | null;
    if (!root) return;
    const palette = THEMES[theme];
    for (const [prop, value] of Object.entries(palette)) {
      root.style.setProperty(prop, value);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);
}
