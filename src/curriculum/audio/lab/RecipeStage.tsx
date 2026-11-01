import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import type { Tone } from './WaveStage';
import { canvasFont, drawRestLine } from './drawWave';
import { recipeAt, recipePeak, type Recipe } from './physics/harmonics';
import { useLabCanvas } from './useLabCanvas';

const CYCLES = 2.5;
/** The slide across the stage, in cycles a second, for the eye only. */
const DRIFT = 0.12;
/** How many harmonics the bars always have room for. */
const BARS = 8;

/**
 * A recipe twice over, from the same numbers the sound is built from: its wave
 * scaled to the same peak as any other, and a bar for each harmonic.
 */
export function RecipeStage({
  harmonics,
  accent,
  tone,
  caption,
}: {
  harmonics: Recipe;
  accent: string;
  tone: Tone;
  caption: string;
}) {
  const drawn = useRef({ harmonics, peak: recipePeak(harmonics) });
  if (drawn.current.harmonics !== harmonics) {
    drawn.current = { harmonics, peak: recipePeak(harmonics) };
  }
  const soundingRef = useRef(false);
  soundingRef.current = tone.sounding.size > 0;
  const peakRef = useRef(tone.peak);
  peakRef.current = tone.peak;

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const { harmonics: recipe, peak } = drawn.current;
      // Side by side, or on a phone the bars under the wave.
      const stacked = width < 520;
      const barsSize = stacked ? height * 0.38 : width * 0.32;
      const wave = {
        x: 0,
        y: 0,
        width: stacked ? width : width - barsSize,
        height: stacked ? height - barsSize : height,
      };
      const bars = stacked
        ? { x: 0, y: wave.height, width, height: barsSize }
        : { x: wave.width, y: 0, width: barsSize, height };

      drawRestLine(ctx, wave);
      const mid = wave.y + wave.height / 2;
      const reach = (wave.height / 2) * 0.82;
      ctx.beginPath();
      for (let x = 0; x <= wave.width; x += 1) {
        const cycles = (x / wave.width) * CYCLES - time * DRIFT;
        const y = mid - (recipeAt(cycles, recipe) / peak) * reach;
        if (x === 0) ctx.moveTo(wave.x + x, y);
        else ctx.lineTo(wave.x + x, y);
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // The bars: how much of each harmonic, the first the note itself.
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.75) : '12px sans-serif';
      const pad = 16;
      const foot = 22;
      const slot = (bars.width - pad * 2) / BARS;
      const tallest = bars.height - foot - pad;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < BARS; i++) {
        const amount = recipe[i] ?? 0;
        const x = bars.x + pad + slot * i;
        const barHeight = Math.max(amount * tallest, amount > 0 ? 2 : 0);
        const bottom = bars.y + bars.height - foot;
        ctx.fillStyle = 'rgb(255 255 255 / 0.08)';
        ctx.fillRect(x + slot * 0.18, bottom - 1, slot * 0.64, 1);
        ctx.fillStyle = i === 0 ? accent : 'rgb(232 232 240 / 0.8)';
        ctx.fillRect(
          x + slot * 0.18,
          bottom - barHeight,
          slot * 0.64,
          barHeight,
        );
        ctx.fillStyle = 'rgb(255 255 255 / 0.55)';
        ctx.fillText(String(i + 1), x + slot / 2, bottom + 11);
      }
      if (canvas && soundingRef.current) {
        canvas.dataset.labPeak = peakRef.current().toFixed(4);
      }
    },
  );

  useEffect(() => {
    if (reduced) redraw();
  }, [harmonics, reduced, redraw]);

  return (
    <LabStage className="h-[clamp(11rem,30vh,17rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
