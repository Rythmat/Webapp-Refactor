import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import type { Tone } from './WaveStage';
import { canvasFont, drawTag } from './drawWave';
import { MAX_HZ } from './labAudio';
import { BANDS, HEARING_HIGH, hearingPosition } from './physics/spectrum';
import { useLabCanvas } from './useLabCanvas';

const FLOOR_DB = -90;
const TOP_DB = -10;
const FOOT = 26;
const TICKS = [100, 1000, 10_000];

/**
 * The range of hearing, low to high, with what's really leaving the page drawn
 * on it, measured live after the limiter: the labs' sound ends at MAX_HZ, and
 * the shaded part above it says so.
 */
export function SpectrumStage({
  hz,
  accent,
  tone,
  caption,
}: {
  /** The tone being asked for, marked with a line. */
  hz: number;
  accent: string;
  tone: Tone;
  caption: string;
}) {
  const hzRef = useRef(hz);
  hzRef.current = hz;
  const toneRef = useRef(tone);
  toneRef.current = tone;

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height }) => {
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.75) : '12px sans-serif';
      const tall = height - FOOT;
      const xAt = (f: number) => hearingPosition(f) * width;

      BANDS.forEach((band, i) => {
        if (i % 2 === 1) {
          ctx.fillStyle = 'rgb(255 255 255 / 0.03)';
          ctx.fillRect(xAt(band.low), 0, xAt(band.high) - xAt(band.low), tall);
        }
      });
      ctx.fillStyle = 'rgb(0 0 0 / 0.35)';
      ctx.fillRect(xAt(MAX_HZ), 0, width - xAt(MAX_HZ), tall);

      const live = toneRef.current.sounding.size
        ? toneRef.current.spectrum()
        : null;
      if (live) {
        const binHz = live.sampleRate / 2 / live.data.length;
        // One height a pixel: the loudest band it covers.
        ctx.beginPath();
        ctx.moveTo(0, tall);
        for (let x = 0; x <= width; x += 1) {
          const from = 20 * (HEARING_HIGH / 20) ** (x / width);
          const to = 20 * (HEARING_HIGH / 20) ** ((x + 1) / width);
          const start = Math.max(1, Math.round(from / binHz));
          const end = Math.min(
            live.data.length - 1,
            Math.max(start, Math.round(to / binHz)),
          );
          let db = -Infinity;
          for (let i = start; i <= end; i++) db = Math.max(db, live.data[i]);
          const level = Math.max(
            0,
            Math.min(1, (db - FLOOR_DB) / (TOP_DB - FLOOR_DB)),
          );
          ctx.lineTo(x, tall - level * tall);
        }
        ctx.lineTo(width, tall);
        ctx.closePath();
        ctx.fillStyle = accent;
        ctx.fill();
      }

      const marked = xAt(hzRef.current);
      ctx.beginPath();
      ctx.moveTo(marked + 0.5, 0);
      ctx.lineTo(marked + 0.5, tall);
      ctx.strokeStyle = 'rgb(255 255 255 / 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgb(255 255 255 / 0.55)';
      for (const tick of TICKS) {
        ctx.fillText(
          tick >= 1000 ? `${tick / 1000} kHz` : `${tick} Hz`,
          xAt(tick),
          height - 13,
        );
      }
      if (width > 420) {
        drawTag(
          ctx,
          'Past here, the lab stays silent',
          xAt(13_000),
          16,
          font,
          width,
        );
      }
      if (canvas && toneRef.current.sounding.size) {
        canvas.dataset.labPeak = toneRef.current.peak().toFixed(4);
      }
    },
  );

  useEffect(() => {
    if (reduced) redraw();
  }, [hz, reduced, redraw]);

  return (
    <LabStage className="h-[clamp(9rem,26vh,15rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
