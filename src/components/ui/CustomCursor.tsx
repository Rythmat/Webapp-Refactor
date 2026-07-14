import { useEffect, useRef } from 'react';
import { useCustomCursorEnabled } from '@/hooks/useCustomCursorEnabled';
import './custom-cursor.css';

// Elements treated as "clickable" → trigger the inner-hexagon hover animation.
// `[class*="cursor-pointer"]` also catches Tailwind's `cursor-pointer` /
// `hover:cursor-pointer` styled divs on top of the semantic elements.
const INTERACTIVE_SELECTOR =
  'a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, label, summary, [data-clickable], [class*="cursor-pointer"]';

// Full-canvas experiences that own their pointer/contextual cursors.
const EXCLUDED_PREFIXES = ['/studio/editor', '/atlas', '/arcade'];
const isExcluded = (path: string) =>
  EXCLUDED_PREFIXES.some((p) => path.startsWith(p));

// Regular pointy-top hexagon in a 24×24 viewBox (centre 12,12).
const HEX_POINTS = '12,1 21.53,6.5 21.53,17.5 12,23 2.47,17.5 2.47,6.5';

/**
 * App-wide custom cursor: a white hexagon that follows the pointer, with inner
 * hexagons that recede toward the centre when hovering a clickable element.
 * Desktop/mouse only; disabled on the DAW editor, Atlas globe, and Arcade games
 * (which keep their native/contextual cursors).
 */
export const CustomCursor = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled] = useCustomCursorEnabled();

  useEffect(() => {
    // Off by default — opt in via the toggle on the profile page.
    if (!enabled) return;
    // Only meaningful with a real mouse; leave touch/coarse devices untouched.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    const el = ref.current;
    if (!el) return;

    const root = document.documentElement;
    let active = false;
    // Whether the pointer is currently within the window (drives scroll re-tests).
    let inside = false;
    // Last known viewport pointer position, so we can re-test what's under the
    // cursor on scroll (when no mousemove fires).
    let lastX = -1;
    let lastY = -1;
    let scrollRaf = 0;

    const setActive = (next: boolean) => {
      if (next === active) return;
      active = next;
      root.classList.toggle('has-custom-cursor', next);
      if (!next) el.classList.remove('is-visible', 'is-pointer', 'is-active');
    };

    // Toggle the hover (spin) state from whatever element is under the pointer.
    const applyInteractive = (target: Element | null) => {
      el.classList.toggle(
        'is-pointer',
        !!target?.closest?.(INTERACTIVE_SELECTOR),
      );
    };

    const onMove = (e: MouseEvent) => {
      inside = true;
      lastX = e.clientX;
      lastY = e.clientY;
      // Re-check the route here — React Router pushState doesn't fire popstate,
      // and the cursor only matters while the pointer is moving.
      const shouldBeActive = !isExcluded(window.location.pathname);
      setActive(shouldBeActive);
      if (!shouldBeActive) return;

      el.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`;
      el.classList.add('is-visible');
      applyInteractive(e.target as Element | null);
    };

    // On scroll the pointer stays put but the element beneath it changes, and no
    // mousemove fires — re-test the point (rAF-throttled) so the hover state (and
    // its spin animation) stays in sync with what's actually under the cursor.
    // Skip while the pointer is outside the window; re-check the route too, since
    // a scroll can land on an excluded route before the next mousemove.
    const onScroll = () => {
      if (!inside || lastX < 0 || scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const shouldBeActive = !isExcluded(window.location.pathname);
        setActive(shouldBeActive);
        if (!shouldBeActive) return;
        applyInteractive(document.elementFromPoint(lastX, lastY));
      });
    };

    const onLeave = () => {
      inside = false;
      // Drop the hover state too so the spin animation stops while hidden.
      el.classList.remove('is-visible', 'is-pointer');
    };
    const onEnter = () => {
      inside = true;
      if (active) el.classList.add('is-visible');
    };
    const onDown = () => {
      if (active) el.classList.add('is-active');
    };
    const onUp = () => el.classList.remove('is-active');

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    // Capture so scrolling inside any nested scroll container is caught (scroll
    // events don't bubble).
    window.addEventListener('scroll', onScroll, {
      passive: true,
      capture: true,
    });

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('scroll', onScroll, { capture: true });
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      root.classList.remove('has-custom-cursor');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={ref} className="custom-cursor" aria-hidden="true">
      <svg className="custom-cursor__svg" viewBox="0 0 24 24">
        <g className="custom-cursor__spin">
          <polygon className="custom-cursor__outer" points={HEX_POINTS} />
          <g className="custom-cursor__inner">
            <polygon points={HEX_POINTS} />
            <polygon points={HEX_POINTS} />
            <polygon points={HEX_POINTS} />
          </g>
        </g>
      </svg>
    </div>
  );
};
