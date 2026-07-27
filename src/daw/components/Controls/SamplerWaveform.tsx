import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computePeaks } from '@/daw/audio/AudioBufferStore';

// ── SamplerWaveform ─────────────────────────────────────────────────────
// Simpler-style sample display: the full waveform with the active trim
// window highlighted and draggable Start / End markers. Dragging previews
// locally and commits (one store write → one engine re-slice) on release.

const PEAK_COUNT = 600;
const HANDLE_HIT_PX = 10;

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
  // Uncommitted marker positions while a drag is live.
  const [drag, setDrag] = useState<{
    marker: 'start' | 'end';
    startPct: number;
    endPct: number;
  } | null>(null);

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

  // Redraw on any change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cs = getComputedStyle(canvas);
    const accent = cs.getPropertyValue('--color-accent').trim() || '#7ecfcf';
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = pctAtEvent(e);
      const hitPct = (HANDLE_HIT_PX / rect.width) * 100;
      const endPct = Math.min(100, startPct + lengthPct);
      // Nearest marker within the hit zone wins; ties go to the closer one.
      const dStart = Math.abs(pct - startPct);
      const dEnd = Math.abs(pct - endPct);
      let marker: 'start' | 'end' | null = null;
      if (dStart <= hitPct || dEnd <= hitPct) {
        marker = dStart <= dEnd ? 'start' : 'end';
      }
      if (!marker) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ marker, startPct, endPct });
    },
    [pctAtEvent, startPct, lengthPct],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drag) return;
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
    [drag, pctAtEvent],
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
      style={{ cursor: drag ? 'ew-resize' : 'col-resize', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    />
  );
}
