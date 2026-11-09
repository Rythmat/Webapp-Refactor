import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import { FxCardRow } from '@/daw/components/Effects/FxCards';
import { DEMO_PERIOD_MS, demoEffects, previewEffects } from './effectDemo';

// ── One effect's device, small (the Add effect picker's cards) ─────────────
//
// The effect's real card from the dock (FxCardRow in preview mode) at its
// own size, scaled down into the picker card's window, as Suno's plugin
// cards show theirs [s40]: at most PREVIEW_SCALE, smaller for a wide device
// (the EQ) down to a floor, centred; past the floor it crops at the right. It's a picture: inert, hidden from screen
// readers, and no lesson anchor resolves inside it (anchorRegistry). While
// `playing`, it runs the effect's demo (effectDemo.ts); when that stops it
// finishes the cycle back to rest rather than freezing mid-sweep. With
// reduced motion it stays at rest.

/** The device's height at its own size: the floating frame's row. */
const ROW_PX = 224;
/** Wide enough that the card keeps its graph (FxCards drops it under 640). */
const ROW_W_PX = 720;
/** The row's padding around the card (FxCardRow's p-2). */
const ROW_PAD_PX = 8;
/** The largest scale into the picker's window. */
export const PREVIEW_SCALE = 0.55;
/** The smallest: a wider device crops rather than shrink past it. */
const PREVIEW_MIN_SCALE = 0.42;
/** The window's height in the picker card. */
export const PREVIEW_H_PX = Math.round(ROW_PX * PREVIEW_SCALE);

const noop = () => {};
const setInert = (el: HTMLElement | null) => el?.setAttribute('inert', '');

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function EffectPreview({
  type,
  playing,
  effects: given,
}: {
  type: EffectSlotType;
  playing: boolean;
  /** What the device shows at rest: a preset's values; else the defaults. */
  effects?: TrackEffectState;
}) {
  const defaults = useMemo(() => previewEffects(type), [type]);
  const base = given ?? defaults;
  const [phase, setPhase] = useState(0);
  // Whether a cycle is under way: it outlives `playing` to land at rest.
  const [running, setRunning] = useState(false);
  const playingRef = useRef(playing);

  useEffect(() => {
    playingRef.current = playing;
    if (playing && !reducedMotion()) setRunning(true);
  }, [playing]);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let start: number | null = null;
    // The cycle count to land on once asked to stop: the next whole one.
    let endAt: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const cycles = (now - start) / DEMO_PERIOD_MS;
      if (playingRef.current) endAt = null;
      else endAt ??= Math.ceil(cycles);
      if (endAt !== null && cycles >= endAt) {
        setPhase(0);
        setRunning(false);
        return;
      }
      setPhase(cycles % 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  // Fit the device to the window, centred: measured from the card itself.
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState({ scale: PREVIEW_SCALE, x: 0, y: 0 });
  useLayoutEffect(() => {
    const win = windowRef.current;
    if (!win) return;
    const measure = () => {
      const card = win.querySelector<HTMLElement>('[data-fx-card]');
      const winW = win.clientWidth;
      if (!card || winW <= 0) return;
      const boxW = card.offsetWidth + 2 * ROW_PAD_PX;
      // A wide device (the EQ) shrinks only so far, then crops at the right
      // as Suno's do: below that it can't be read.
      const scale = Math.max(
        PREVIEW_MIN_SCALE,
        Math.min(PREVIEW_SCALE, winW / boxW),
      );
      setFit({
        scale,
        x: Math.max(0, (winW - boxW * scale) / 2),
        y: Math.max(0, (PREVIEW_H_PX - ROW_PX * scale) / 2),
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(win);
    return () => observer.disconnect();
  }, [type]);

  const effects = phase === 0 ? base : demoEffects(type, base, phase);

  return (
    <div
      aria-hidden
      // React 18 has no inert prop: no focus or clicks reach the picture.
      ref={(el) => {
        windowRef.current = el;
        setInert(el);
      }}
      data-fx-preview=""
      className="pointer-events-none relative w-full overflow-hidden rounded-[var(--daw-radius-sm)] bg-daw-surface-2"
      style={{ height: PREVIEW_H_PX }}
    >
      <div
        className="absolute left-0 top-0 flex origin-top-left"
        style={{
          width: ROW_W_PX,
          height: ROW_PX,
          transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})`,
        }}
      >
        <FxCardRow
          preview
          fxId={`preview-${type}`}
          chain={[type]}
          effects={effects}
          onUpdate={noop}
          onPreview={noop}
          onRemove={noop}
          meterTarget={null}
          shown={null}
          onShow={noop}
          addSlot={null}
        />
      </div>
    </div>
  );
}
