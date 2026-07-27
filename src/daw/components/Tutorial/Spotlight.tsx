import { useEffect, useState } from 'react';
import {
  type Rect,
  type Target,
  idsOf,
  resolveTargetRect,
  sameRect,
  scrollTargetIntoView,
} from './targetRect';

// ── Spotlight ───────────────────────────────────────────────────────────────
// Dims the Studio and cuts a glowing hole around the current step's target
// region (identified by [data-tutorial-id]). Purely visual — the whole layer
// is pointer-events:none so the user still interacts with the real control.
// The rect is re-measured every frame so it tracks scrolling, the channel
// strip's open/close animation, and targets that appear later (e.g. a modal).

const PAD = 6;

export function Spotlight({ target }: { target?: Target }) {
  const [rect, setRect] = useState<Rect | null>(null);
  const key = idsOf(target).join('|');

  useEffect(() => {
    if (!key) {
      setRect(null);
      return;
    }

    // Bring the (first resolvable) target into view once when the step opens.
    scrollTargetIntoView(target);

    let raf = 0;
    const loop = () => {
      const next = resolveTargetRect(target);
      setRect((prev) => (sameRect(prev, next) ? prev : next));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // `key` is the value-stable form of `target`; re-run only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || !rect) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: 8,
        pointerEvents: 'none',
        zIndex: 0,
        boxShadow:
          '0 0 0 9999px rgba(6, 8, 12, 0.4), 0 0 0 2px var(--color-accent, #7ecfcf), 0 0 16px 4px var(--color-accent, #7ecfcf)',
        transition:
          'top 120ms ease, left 120ms ease, width 120ms ease, height 120ms ease',
        animation: 'tutorialPulse 1.6s ease-in-out infinite',
      }}
    />
  );
}
