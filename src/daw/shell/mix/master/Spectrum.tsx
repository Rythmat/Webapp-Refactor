import { useRef } from 'react';
import { useSpectrumCanvas } from '@/daw/hooks/useSpectrumCanvas';
import { getDawPalette, TYPE } from '@/daw/ui/tokens';

// ── The master's spectrum (milestone 2.10) ─────────────────────────────────
//
// The Mix view's master column ends with the spectrum of what leaves the
// master: the left channel, from its own analyser tapped off the meter bus
// (useSpectrumCanvas never retunes the bus's metering analysers). 96 px
// tall and as wide as the column, sized by a ResizeObserver. It draws once
// per bus frame, so only while there is sound, and only once the engine is
// ready. Colours come from the DAW palette (a canvas can't read var());
// the frequency labels are the 12 px label size, and only the three that
// fit a narrow column (100, 1k, 10k).

export const SPECTRUM_PX = 96;

const FREQ_LABELS = [
  { freq: 100, label: '100' },
  { freq: 1000, label: '1k' },
  { freq: 10000, label: '10k' },
];

/** Grid lines at these levels, on a −60 to 0 dB scale. */
const DB_GRID = [-48, -36, -24, -12];

/** Room under the graph for the labels. */
const LABEL_ROOM = TYPE.label.line + 2;

interface SpectrumLayout {
  xs: Float32Array;
  first: number;
  fill: CanvasGradient;
  sampleRate: number;
}

export function Spectrum({ isReady }: { isReady: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<SpectrumLayout | null>(null);

  useSpectrumCanvas(isReady ? 'master' : null, canvasRef, containerRef, (f) => {
    const { ctx, width: w, height: h, data, sampleRate } = f;
    const p = getDawPalette();
    const graphH = h - LABEL_ROOM;
    const minLog = Math.log10(20);
    const maxLog = Math.log10(sampleRate / 2);
    const freqToX = (freq: number) =>
      ((Math.log10(freq) - minLog) / (maxLog - minLog)) * w;

    let layout = layoutRef.current;
    if (
      !layout ||
      f.resized ||
      layout.xs.length !== data.length ||
      layout.sampleRate !== sampleRate
    ) {
      const xs = new Float32Array(data.length);
      let first = -1;
      for (let i = 0; i < data.length; i++) {
        const freq = (i / data.length) * (sampleRate / 2);
        if (freq < 20) continue;
        if (first < 0) first = i;
        xs[i] = freqToX(freq);
      }
      const fill = ctx.createLinearGradient(0, graphH, 0, 0);
      fill.addColorStop(0, `rgba(${p.lineRgb}, 0.03)`);
      fill.addColorStop(1, `rgba(${p.lineRgb}, 0.22)`);
      layout = { xs, first, fill, sampleRate };
      layoutRef.current = layout;
    }

    ctx.clearRect(0, 0, w, h);

    // The level grid, and a line at each labelled frequency.
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const db of DB_GRID) {
      const y = Math.round(graphH * (1 - (db + 60) / 60)) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    for (const { freq } of FREQ_LABELS) {
      const x = Math.round(freqToX(freq)) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, graphH);
    }
    ctx.stroke();

    ctx.font = `${TYPE.label.size}px 'Glacial Indifference', system-ui, sans-serif`;
    ctx.fillStyle = p.text3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const { freq, label } of FREQ_LABELS) {
      const x = freqToX(freq);
      if (x > 12 && x < w - 12) ctx.fillText(label, x, h - 3);
    }

    const { xs, first } = layout;
    if (first < 0) return;
    const last = data.length - 1;
    const yAt = (i: number) => graphH - (data[i] / 255) * graphH;

    ctx.beginPath();
    ctx.moveTo(xs[first], graphH);
    for (let i = first; i <= last; i++) ctx.lineTo(xs[i], yAt(i));
    ctx.lineTo(xs[last], graphH);
    ctx.closePath();
    ctx.fillStyle = layout.fill;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(xs[first], yAt(first));
    for (let i = first + 1; i <= last; i++) ctx.lineTo(xs[i], yAt(i));
    ctx.strokeStyle = p.text2;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  return (
    <div
      ref={containerRef}
      data-testid="master-spectrum"
      className="w-full shrink-0 overflow-hidden rounded-[var(--daw-radius-sm)] border border-daw-hairline bg-daw-surface-2"
      style={{ height: SPECTRUM_PX }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Spectrum of the master output"
        className="block"
      />
    </div>
  );
}
