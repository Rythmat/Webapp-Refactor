import { type RefObject, useEffect, useRef, useState } from 'react';
import {
  analyserSource,
  meterSource,
  subscribeMeter,
  type BusLevels,
} from '@/daw/engine/meterBus';
import type { MeterSource } from '@/daw/ui/Meter';
import { cellWidth } from '@/components/common/FixedDigits';

// ── Meter hooks ──────────────────────────────────────────────────────────
// React's side of the meter bus (src/daw/engine/meterBus.ts): ONE loop
// reads every level, only while there is something to show, and publishes a
// source's reading only when it changes. These hooks subscribe a component
// to a source by its key ('track:<id>', 'master', …) or, for older callers,
// by an AnalyserNode.
//
// Prefer the paint hooks (useMeterPaint, useMeterFill): they write straight
// to the DOM through a ref, so the component around the meter never
// re-renders for a level. useMeterLevel sets React state and re-renders on
// every whole-percent change: keep it for small leaves.

/** A source from a key, an analyser the caller holds, or nothing. */
type SourceLike = MeterSource | string | AnalyserNode | null | undefined;

function toSource(from: SourceLike): MeterSource | null {
  if (!from) return null;
  if (typeof from === 'string') return meterSource(from);
  if ('subscribe' in from) return from;
  return analyserSource(from);
}

/** A reading's channels as a 0–100 level (whole percent of full scale). */
function percent(levels: BusLevels, channel: number): number {
  return Math.round(Math.min(1, levels.peak[channel] ?? 0) * 100);
}

/**
 * Meter `analyser` on the shared bus. `emit` gets the 0–100 level each
 * time its whole-percent value changes. Returns the unregister function.
 */
export function registerMeter(
  analyser: AnalyserNode,
  emit: (level: number) => void,
): () => void {
  let last = 0;
  return subscribeMeter(analyserSource(analyser), (levels) => {
    const level = percent(levels, 0);
    if (level === last) return;
    last = level;
    emit(level);
  });
}

/**
 * Calls `paint` with each reading of `from` (a key, a MeterSource or an
 * AnalyserNode) and with null when it unsubscribes, so the painter can put
 * its element to rest. `paint` may change between renders; the latest one
 * runs. Nothing re-renders.
 */
export function useMeterPaint(
  from: SourceLike,
  paint: (levels: BusLevels | null) => void,
): void {
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const source = toSource(from);
  useEffect(() => {
    paintRef.current(null);
    if (!source) return;
    const off = subscribeMeter(source, (levels) => paintRef.current(levels));
    return () => {
      off();
      paintRef.current(null);
    };
  }, [source]);
}

/**
 * The 0–100 peak level of `from` (an AnalyserNode, a key or a source; the
 * first channel). The component re-renders when the whole-percent level
 * changes. Pass null when there is nothing to meter; the hook returns 0.
 */
export function useMeterLevel(from: SourceLike): number {
  const [level, setLevel] = useState(0);
  useMeterPaint(from, (levels) => setLevel(levels ? percent(levels, 0) : 0));
  return level;
}

/** The meter colour for a 0–100 level. */
export function meterColor(level: number): string {
  if (level > 90) return 'var(--color-meter-red)';
  if (level > 75) return 'var(--color-meter-yellow)';
  return 'var(--color-meter-green)';
}

/**
 * Paints a horizontal level fill (width + colour) straight onto `ref`'s
 * element from the meter bus, with no React state: the component that owns
 * the bar never re-renders for the meter. `from` is a key ('master' shows
 * the mean of its two channels) or an AnalyserNode; with `analyserR` the
 * fill shows the mean of the two analysers.
 */
export function useMeterFill(
  ref: RefObject<HTMLElement | null>,
  from: SourceLike,
  analyserR: AnalyserNode | null = null,
): void {
  const right = useRef(0);
  const left = useRef(0);
  const paint = () => {
    const el = ref.current;
    if (!el) return;
    const level = analyserR ? (left.current + right.current) / 2 : left.current;
    el.style.width = `${level}%`;
    el.style.backgroundColor = meterColor(level);
  };
  useMeterPaint(from, (levels) => {
    if (!levels) left.current = 0;
    else if (levels.peak.length > 1) {
      // A stereo source: the mean of its channels.
      let sum = 0;
      for (let ch = 0; ch < levels.peak.length; ch++) {
        sum += percent(levels, ch);
      }
      left.current = sum / levels.peak.length;
    } else left.current = percent(levels, 0);
    paint();
  });
  useMeterPaint(analyserR, (levels) => {
    right.current = levels ? percent(levels, 0) : 0;
    paint();
  });
}

/**
 * Paints a live input's level bar (Vocal, Guitar/Bass views): the peak in
 * dBFS across −60…0, red while the input has clipped (a sample at full
 * scale, held for a moment). Null puts the bar to rest.
 */
export function paintInputBar(
  el: HTMLElement | null,
  levels: BusLevels | null,
): void {
  if (!el) return;
  const peak = levels?.peak[0] ?? 0;
  const db = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  el.style.width = `${Math.round(pct)}%`;
  el.style.backgroundColor = levels?.clipped
    ? 'var(--color-meter-red)'
    : 'var(--color-accent)';
}

// ── Fixed-digit readouts ─────────────────────────────────────────────────
// FixedDigits (src/components/common/FixedDigits.tsx) holds digits still in
// cells as wide as Glacial's widest; a live readout writes the same cells
// through a ref instead of re-rendering. The widths are FixedDigits'.

/**
 * Writes `text` into `el` as FixedDigits would render it. The element must
 * have no React children. Only the characters that changed are touched.
 */
export function paintFixedDigits(el: HTMLElement | null, text: string): void {
  if (!el || el.dataset.text === text) return;
  const chars = Array.from(text);
  const cells = el.children;
  // Same shape (each cell the same width): change the characters only.
  const sameShape =
    cells.length === chars.length &&
    chars.every(
      (ch, i) =>
        (cells[i] as HTMLElement).dataset.cell === String(cellWidth(ch) ?? ''),
    );
  if (!sameShape) {
    el.textContent = '';
    for (const ch of chars) {
      const span = document.createElement('span');
      const width = cellWidth(ch);
      span.dataset.cell = String(width ?? '');
      if (width) {
        span.style.display = 'inline-block';
        span.style.width = `${width}em`;
        span.style.textAlign = 'center';
        span.style.letterSpacing = '0';
      }
      el.appendChild(span);
    }
  }
  chars.forEach((ch, i) => {
    const cell = cells[i] as HTMLElement;
    if (cell.textContent !== ch) cell.textContent = ch;
  });
  el.dataset.text = text;
}
