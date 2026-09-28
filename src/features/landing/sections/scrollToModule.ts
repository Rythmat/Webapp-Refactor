import type { MouseEvent } from 'react';

/**
 * Click handler for an in-page link to a module's section (the TOC, the bento
 * row's "See more"): smooth-scrolls to it (instant under reduced motion) and
 * records the hash without a history entry.
 */
export const scrollToModule = (id: string) => (e: MouseEvent) => {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const reduce = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
};
