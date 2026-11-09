/**
 * A panel that appears below the mini-Studio's tracks (a take's review,
 * the pop-up), brought into view: as little scrolling as shows it whole,
 * smooth unless reduced motion is asked for.
 */
export function scrollIntoViewGently(element: Element | null): void {
  if (!element || typeof element.scrollIntoView !== 'function') return;
  const still =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({
    block: 'nearest',
    behavior: still ? 'auto' : 'smooth',
  });
}
