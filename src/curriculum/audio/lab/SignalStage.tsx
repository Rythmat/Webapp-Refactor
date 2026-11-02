import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import { canvasFont, drawRestLine, drawTag } from './drawWave';
import { useLabCanvas } from './useLabCanvas';

const CYCLES = 3;
/** Slowed right down: how many cycles pass in a second, for the eye. */
const SWINGS = 0.5;
const CONE_ROOM = 96;

export type SignalShape = 'off' | 'steady' | 'changing';

/**
 * A voltage over time, and a speaker's cone following it: a steady voltage holds
 * the cone still, so only a changing one can move air.
 */
export function SignalStage({
  shape,
  accent,
  caption,
}: {
  shape: SignalShape;
  accent: string;
  caption: string;
}) {
  const shapeRef = useRef(shape);
  shapeRef.current = shape;
  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const now = shapeRef.current;
      const band = { x: 0, y: 0, width: width - CONE_ROOM, height };
      drawRestLine(ctx, band);
      const mid = height / 2;
      const reach = mid * 0.72;
      // The wave enters at the right, so the cone follows what's arriving there.
      const level = (x: number) =>
        now === 'off'
          ? 0
          : now === 'steady'
            ? 0.7
            : Math.sin(
                2 * Math.PI * ((x / band.width) * CYCLES - time * SWINGS),
              );
      ctx.beginPath();
      for (let x = 0; x <= band.width; x += 1) {
        const y = mid - level(x) * reach;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      const push = level(band.width) * 12;
      const coneX = band.width + 26 + push;
      ctx.strokeStyle = '#e8e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(band.width + 6, mid - 14, 20, 28);
      ctx.moveTo(band.width + 26, mid - 14);
      ctx.lineTo(coneX + 26, mid - 40);
      ctx.lineTo(coneX + 26, mid + 40);
      ctx.lineTo(band.width + 26, mid + 14);
      ctx.stroke();

      const canvas = canvasRef.current;
      if (canvas && band.width > 240) {
        const font = canvasFont(canvas, 0.8125);
        drawTag(ctx, 'Voltage', 44, 16, font, width);
      }
    },
  );
  useEffect(() => {
    if (reduced) redraw();
  }, [shape, reduced, redraw]);
  return (
    <LabStage className="h-[clamp(8rem,22vh,12rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
