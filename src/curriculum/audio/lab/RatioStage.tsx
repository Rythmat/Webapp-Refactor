import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import type { Tone } from './WaveStage';
import { canvasFont, drawTag } from './drawWave';
import { lissajousAt, type Interval } from './physics/intervals';
import { useLabCanvas } from './useLabCanvas';

/** The figure's slow turn, in radians a second, for the eye only. */
const TURN = 0.35;

/**
 * An interval two ways: its Lissajous figure, one tone sideways and the other
 * up, and the two waves over the time it takes them to line up, marked by ticks.
 */
export function RatioStage({
  interval,
  accent,
  tone,
  caption,
}: {
  interval: Interval;
  accent: string;
  tone: Tone;
  caption: string;
}) {
  const intervalRef = useRef(interval);
  intervalRef.current = interval;
  const soundingRef = useRef(false);
  soundingRef.current = tone.sounding.size > 0;
  const peakRef = useRef(tone.peak);
  peakRef.current = tone.peak;

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const now = intervalRef.current;
      const stacked = width < 520;
      const figureSize = stacked
        ? height * 0.5
        : Math.min(height, width * 0.34);
      const figure = stacked
        ? { x: (width - figureSize) / 2, y: 0 }
        : { x: 0, y: (height - figureSize) / 2 };
      const waves = stacked
        ? { x: 0, y: figureSize, width, height: height - figureSize }
        : {
            x: figureSize,
            y: 0,
            width: width - figureSize,
            height,
          };

      const cx = figure.x + figureSize / 2;
      const cy = figure.y + figureSize / 2;
      const reach = figureSize * 0.42;
      const steps = Math.max(600, (now.high + now.low) * 40);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const [x, y] = lissajousAt(i / steps, now, time * TURN);
        if (i === 0) ctx.moveTo(cx + x * reach, cy - y * reach);
        else ctx.lineTo(cx + x * reach, cy - y * reach);
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Up to two line-ups, or the one if its cycles would be too fine.
      const repeats = now.high > 8 ? 1 : 2;
      const pad = 16;
      const across = waves.width - pad * 2;
      const lane = waves.height / 2;
      const wave = (index: number, cycles: number, color: string) => {
        const mid = waves.y + lane * index + lane / 2;
        ctx.beginPath();
        for (let x = 0; x <= across; x += 0.5) {
          const y =
            mid -
            Math.sin(2 * Math.PI * (x / across) * cycles * repeats) *
              lane *
              0.36;
          if (x === 0) ctx.moveTo(waves.x + pad, y);
          else ctx.lineTo(waves.x + pad + x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.75;
        ctx.stroke();
      };
      for (let i = 0; i <= repeats; i++) {
        const x = Math.round(waves.x + pad + (across * i) / repeats) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, waves.y + 6);
        ctx.lineTo(x, waves.y + waves.height - 6);
        ctx.strokeStyle = 'rgb(255 255 255 / 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      wave(0, now.high, accent);
      wave(1, now.low, 'rgb(232 232 240 / 0.8)');
      const canvas = canvasRef.current;
      if (canvas && width > 420) {
        drawTag(
          ctx,
          `${now.high} : ${now.low}`,
          waves.x + waves.width / 2,
          waves.y + 16,
          canvasFont(canvas, 0.8125),
          width,
        );
      }
      if (canvas && soundingRef.current) {
        canvas.dataset.labPeak = peakRef.current().toFixed(4);
      }
    },
  );

  useEffect(() => {
    if (reduced) redraw();
  }, [interval, reduced, redraw]);

  return (
    <LabStage className="h-[clamp(11rem,32vh,18rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
