import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import type { Tone } from './WaveStage';
import { canvasFont, drawBandLabel, drawRestLine } from './drawWave';
import { sumAt } from './physics/combine';
import { useLabCanvas } from './useLabCanvas';

const CYCLES = 3;
/** The slide across the stage, in cycles a second, for the eye only. */
const DRIFT = 0.15;

/**
 * Two equal tones, and what they add up to, from the same phase the sound uses.
 * Each is half a full tone tall, so the bottom band's height is the true sum.
 */
export function SumStage({
  phase,
  accent,
  tone,
  caption,
}: {
  phase: number;
  accent: string;
  tone: Tone;
  caption: string;
}) {
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const soundingRef = useRef(false);
  soundingRef.current = tone.sounding.size > 0;
  const peakRef = useRef(tone.peak);
  peakRef.current = tone.peak;

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const shift = phaseRef.current;
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.8125) : '13px sans-serif';
      const bandHeight = height / 3;
      const line = (
        index: number,
        at: (cycles: number) => number,
        color: string,
        label: string,
      ) => {
        const band = { x: 0, y: bandHeight * index, width, height: bandHeight };
        drawRestLine(ctx, band);
        const mid = band.y + bandHeight / 2;
        const reach = (bandHeight / 2) * 0.86;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 1) {
          const cycles = (x / width) * CYCLES - time * DRIFT;
          const y = mid - at(cycles) * reach;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();
        drawBandLabel(ctx, label, band, font);
      };
      const half = (cycles: number, behind: number) =>
        0.5 * Math.sin(2 * Math.PI * cycles - (behind * Math.PI) / 180);
      line(0, (c) => half(c, 0), 'rgb(232 232 240 / 0.8)', 'Tone 1');
      line(1, (c) => half(c, shift), 'rgb(232 232 240 / 0.8)', 'Tone 2');
      line(2, (c) => sumAt(c, shift), accent, 'What you hear');
      if (canvas && soundingRef.current) {
        canvas.dataset.labPeak = peakRef.current().toFixed(4);
      }
    },
  );

  useEffect(() => {
    if (reduced) redraw();
  }, [phase, reduced, redraw]);

  return (
    <LabStage className="h-[clamp(13rem,38vh,20rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
