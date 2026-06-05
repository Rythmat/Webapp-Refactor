import { useEffect } from 'react';
import { THEMES } from '@/daw/constants/themes';

export function useTheme() {
  useEffect(() => {
    const root = document.querySelector('.daw-root') as HTMLElement | null;
    if (!root) return;
    for (const [prop, value] of Object.entries(THEMES.dark)) {
      root.style.setProperty(prop, value);
    }
  }, []);
}
