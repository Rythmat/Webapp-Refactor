import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import { canvasFont, drawRestLine, drawTag } from './drawWave';
import { useLabCanvas } from './useLabCanvas';

const CYCLES = 3;
const DRIFT = 0.15;

/**
 * A wave and the ceiling it can't pass. The faint line is what it would be with
 * nowhere to stop; the bright one is what comes out, from the same shaping the
 * sound uses.
 */
export function ClipStage({
  amount,
  shape,
  accent,
  caption,
}: {
  /** How tall the wave wants to be, with the ceiling at 1. */
  amount: number;
  shape: (x: number) => number;
  accent: string;
  caption: string;
}) {
  const now = useRef({ amount, shape });
  now.current = { amount, shape };
  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const { amount: tall, shape: through } = now.current;
      drawRestLine(ctx, { x: 0, y: 0, width, height });
      const mid = height / 2;
      const ceiling = mid * 0.5;
      const yAt = (v: number) => mid - v * ceiling;

      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgb(255 255 255 / 0.4)';
      ctx.lineWidth = 1;
      for (const v of [1, -1]) {
        ctx.beginPath();
        ctx.moveTo(0, yAt(v) + 0.5);
        ctx.lineTo(width, yAt(v) + 0.5);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const trace = (
        at: (x: number) => number,
        color: string,
        line: number,
      ) => {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 1) {
          const sine = Math.sin(
            2 * Math.PI * ((x / width) * CYCLES - time * DRIFT),
          );
          const y = Math.max(0, Math.min(height, yAt(at(sine))));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = line;
        ctx.lineJoin = 'round';
        ctx.stroke();
      };
      if (Math.abs(through(tall) - tall) > 0.01) {
        trace((sine) => sine * tall, 'rgb(255 255 255 / 0.22)', 1);
      }
      trace((sine) => through(sine * tall), accent, 2.5);

      const canvas = canvasRef.current;
      if (canvas && width > 280) {
        drawTag(
          ctx,
          'The ceiling',
          width - 52,
          yAt(1),
          canvasFont(canvas, 0.75),
          width,
        );
      }
    },
  );
  useEffect(() => {
    if (reduced) redraw();
  }, [amount, shape, reduced, redraw]);
  return (
    <LabStage className="h-[clamp(9rem,26vh,14rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
