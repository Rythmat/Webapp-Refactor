import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import { canvasFont, drawRestLine, drawTag } from './drawWave';
import { aliasOf, quantize } from './physics/signal';
import { useLabCanvas } from './useLabCanvas';

/** How many of the tone's cycles to show. */
const CYCLES = 4;

/**
 * A tone, and what a converter keeps of it. The faint line is the tone, the dots
 * are its samples, held to the bits on offer. `alias` draws the slowest wave
 * through those same dots, which is what comes back out: nothing else fits them.
 * A still picture, because time isn't what's being looked at.
 */
export function SampleStage({
  hz,
  rate,
  bits = 16,
  alias = false,
  accent,
  caption,
}: {
  hz: number;
  rate: number;
  bits?: number;
  alias?: boolean;
  accent: string;
  caption: string;
}) {
  const now = useRef({ hz, rate, bits, alias });
  now.current = { hz, rate, bits, alias };
  const { canvasRef, redraw } = useLabCanvas(({ ctx, width, height }) => {
    const { hz: f, rate: sr, bits: b, alias: showAlias } = now.current;
    const band = { x: 0, y: 0, width, height };
    drawRestLine(ctx, band);
    const mid = height / 2;
    const reach = mid * 0.78;
    const seconds = CYCLES / f;
    const xAt = (t: number) => (t / seconds) * width;

    // The steps the bits allow, while there are few enough to see.
    if (b <= 4) {
      const levels = 2 ** b;
      ctx.strokeStyle = 'rgb(255 255 255 / 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= levels; i++) {
        const y = Math.round(mid - (i / (levels / 2) - 1) * reach) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    ctx.beginPath();
    for (let x = 0; x <= width; x += 0.5) {
      const t = (x / width) * seconds;
      const y = mid - Math.sin(2 * Math.PI * f * t) * reach;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgb(232 232 240 / 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const count = Math.floor(seconds * sr);
    const value = (i: number) =>
      quantize(Math.sin((2 * Math.PI * f * i) / sr), b);

    const out = aliasOf(f, sr);
    if (showAlias && Math.abs(out - f) > 1) {
      // Above half the rate, a sine at the folded frequency runs back the other
      // way through exactly these samples.
      const direction = f % sr > sr / 2 ? -1 : 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 0.5) {
        const t = (x / width) * seconds;
        const y = mid - direction * Math.sin(2 * Math.PI * out * t) * reach;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.fillStyle = showAlias ? '#ffffff' : accent;
    for (let i = 0; i <= count; i++) {
      ctx.beginPath();
      ctx.arc(xAt(i / sr), mid - value(i) * reach, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    const canvas = canvasRef.current;
    if (canvas && showAlias && width > 320 && Math.abs(out - f) > 1) {
      drawTag(
        ctx,
        'What comes back out',
        width - 84,
        16,
        canvasFont(canvas, 0.75),
        width,
      );
    }
  });
  useEffect(() => {
    redraw();
  }, [hz, rate, bits, alias, redraw]);
  return (
    <LabStage className="h-[clamp(9rem,28vh,15rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
