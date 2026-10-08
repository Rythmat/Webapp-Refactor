import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computePeaks } from '@/daw/audio/AudioBufferStore';

// ── SamplerWaveform ─────────────────────────────────────────────────────
// Simpler-style sample display: the full waveform with the active trim
// window highlighted and draggable Start / End markers. Dragging previews
// locally and commits (one store write → one engine re-slice) on release.

const PEAK_COUNT = 600;
const HANDLE_HIT_PX = 10;
const FALLBACK_ACCENT = '#7ecfcf';

interface SamplerWaveformProps {
  buffer: AudioBuffer;
  startPct: number;
  lengthPct: number;
  onTrimCommit: (startPct: number, lengthPct: number) => void;
}

export function SamplerWaveform({
  buffer,
  startPct,
  lengthPct,
  onTrimCommit,
}: SamplerWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // The backing-store scale and the accent colour, set when the canvas is
  // sized: a trim drag redraws on every pointer move and must not reallocate
  // the canvas or recompute styles each time (live-input-22).
  const dprRef = useRef(1);
  const accentRef = useRef(FALLBACK_ACCENT);
  // Uncommitted marker positions while a drag is live.
  const [drag, setDrag] = useState<{
    marker: 'start' | 'end';
    startPct: number;
    endPct: number;
  } | null>(null);
  // Whether the pointer is over a marker, the only place a drag can start.
  const [overMarker, setOverMarker] = useState(false);

  const peaks = useMemo(() => computePeaks(buffer, PEAK_COUNT), [buffer]);

  const shownStart = drag ? drag.startPct : startPct;
  const shownEnd = drag ? drag.endPct : Math.min(100, startPct + lengthPct);

  // Track the container size (the panel is resizable / responsive).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  // Size the backing store and read the accent only when the size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    accentRef.current =
      getComputedStyle(canvas).getPropertyValue('--color-accent').trim() ||
      FALLBACK_ACCENT;
  }, [size]);

  // Redraw on any change, onto the canvas as sized above.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const accent = accentRef.current;
    const dim = 'rgba(255,255,255,0.22)';

    const { w, h } = size;
    const mid = h / 2;
    const startX = (shownStart / 100) * w;
    const endX = (shownEnd / 100) * w;

    ctx.clearRect(0, 0, w, h);

    // Waveform bars: accent inside the trim window, dim outside.
    const barW = w / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW;
      const inWindow = x + barW > startX && x < endX;
      ctx.fillStyle = inWindow ? accent : dim;
      const amp = Math.max(peaks[i] * (mid - 4), 1);
      ctx.fillRect(x, mid - amp, Math.max(barW - 0.5, 0.5), amp * 2);
    }

    // Shade the trimmed-out regions.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    if (startX > 0) ctx.fillRect(0, 0, startX, h);
    if (endX < w) ctx.fillRect(endX, 0, w - endX, h);

    // Start / End markers with square top handles (Simpler-style flags).
    for (const x of [startX, endX]) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(x - 4, 0, 8, 8);
    }
  }, [peaks, size, shownStart, shownEnd]);

  const pctAtEvent = useCallback((e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(
      100,
      Math.max(0, ((e.clientX - rect.left) / rect.width) * 100),
    );
  }, []);

  /** The marker within reach of the pointer, the closer one on a tie. */
  const markerAt = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): 'start' | 'end' | null => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = pctAtEvent(e);
      const hitPct = (HANDLE_HIT_PX / rect.width) * 100;
      const endPct = Math.min(100, startPct + lengthPct);
      const dStart = Math.abs(pct - startPct);
      const dEnd = Math.abs(pct - endPct);
      if (dStart > hitPct && dEnd > hitPct) return null;
      return dStart <= dEnd ? 'start' : 'end';
    },
    [pctAtEvent, startPct, lengthPct],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const marker = markerAt(e);
      if (!marker) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({
        marker,
        startPct,
        endPct: Math.min(100, startPct + lengthPct),
      });
    },
    [markerAt, startPct, lengthPct],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drag) {
        // The resize cursor shows only where a drag would take a marker.
        setOverMarker(markerAt(e) !== null);
        return;
      }
      const pct = pctAtEvent(e);
      setDrag((d) => {
        if (!d) return d;
        if (d.marker === 'start') {
          // Keep at least 1% of window; the end stays put while trimming in.
          return { ...d, startPct: Math.min(pct, d.endPct - 1) };
        }
        return { ...d, endPct: Math.max(pct, d.startPct + 1) };
      });
    },
    [drag, markerAt, pctAtEvent],
  );

  const onPointerUp = useCallback(() => {
    if (!drag) return;
    onTrimCommit(
      Math.round(drag.startPct * 100) / 100,
      Math.round((drag.endPct - drag.startPct) * 100) / 100,
    );
    setDrag(null);
  }, [drag, onTrimCommit]);

  return (
    <canvas
      ref={canvasRef}
      data-tutorial-id="sampler-waveform"
      className="absolute inset-0 h-full w-full"
      style={{
        cursor: drag || overMarker ? 'ew-resize' : 'default',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setOverMarker(false)}
      onPointerCancel={() => setDrag(null)}
    />
  );
}
