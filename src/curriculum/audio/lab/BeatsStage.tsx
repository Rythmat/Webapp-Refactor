import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import { drawRestLine } from './drawWave';
import { beatEnvelope } from './physics/combine';
import { useLabCanvas } from './useLabCanvas';

/** How much time the stage shows: beats are slow enough to see at real speed. */
const WINDOW_SECONDS = 2;

/** Two close tones' sum over two seconds: how tall it is, at its true rate. */
export function BeatsStage({
  a,
  b,
  accent,
  caption,
}: {
  a: number;
  b: number;
  accent: string;
  caption: string;
}) {
  const tones = useRef({ a, b });
  tones.current = { a, b };
  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const band = { x: 0, y: 0, width, height };
      drawRestLine(ctx, band);
      const mid = height / 2;
      const reach = mid * 0.84;
      ctx.beginPath();
      const at = (x: number) =>
        beatEnvelope(
          time + (x / width - 1) * WINDOW_SECONDS,
          tones.current.a,
          tones.current.b,
        ) * reach;
      for (let x = 0; x <= width; x += 1) {
        if (x === 0) ctx.moveTo(x, mid - at(x));
        else ctx.lineTo(x, mid - at(x));
      }
      for (let x = width; x >= 0; x -= 1) ctx.lineTo(x, mid + at(x));
      ctx.closePath();
      ctx.fillStyle = accent;
      ctx.fill();
    },
  );
  useEffect(() => {
    if (reduced) redraw();
  }, [a, b, reduced, redraw]);
  return (
    <LabStage className="h-[clamp(6rem,16vh,9rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
