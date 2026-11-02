import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import { canvasFont, drawTag } from './drawWave';
import { useLabCanvas } from './useLabCanvas';

const PAD = 34;
const DOTS = 36;
/** Most current the picture shows, and how fast its dots go then. */
const MAX_AMPS = 0.24;
const DOT_SPEED = 0.16;
/** 12 V across the smallest resistance on offer. */
const MAX_WATTS = 2.88;

/**
 * A battery and a lamp on a loop of wire. The dots are electrons, drifting from
 * the battery's − to its + and far faster than real ones: the arrow beside them
 * is conventional current, drawn the way school circuits draw it.
 */
export function CircuitStage({
  volts,
  amps,
  accent,
  caption,
}: {
  volts: number;
  amps: number;
  accent: string;
  caption: string;
}) {
  const now = useRef({ volts, amps, travelled: 0, last: 0 });
  now.current.volts = volts;
  now.current.amps = amps;

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const state = now.current;
      const share = Math.min(1, state.amps / MAX_AMPS);
      state.travelled += Math.max(0, time - state.last) * share * DOT_SPEED;
      state.last = time;
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.8125) : '13px sans-serif';
      const w = width - PAD * 2;
      const h = height - PAD * 2;
      const perimeter = 2 * (w + h);

      ctx.strokeStyle = 'rgb(255 255 255 / 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(PAD, PAD, w, h);

      // Around the loop, starting from the battery's − at the top of its side.
      const at = (distance: number): [number, number] => {
        let d = ((distance % perimeter) + perimeter) % perimeter;
        if (d < w) return [PAD + d, PAD];
        d -= w;
        if (d < h) return [PAD + w, PAD + d];
        d -= h;
        if (d < w) return [PAD + w - d, PAD + h];
        d -= w;
        return [PAD, PAD + h - d];
      };
      ctx.fillStyle = 'rgb(232 232 240 / 0.85)';
      for (let i = 0; i < DOTS; i++) {
        const [x, y] = at((i / DOTS + state.travelled) * perimeter);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // The battery, on the left side of the loop: long line +, short line −.
      const midY = PAD + h / 2;
      ctx.fillStyle = '#101012';
      ctx.fillRect(PAD - 14, midY - 16, 28, 32);
      ctx.strokeStyle = '#e8e8f0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(PAD - 14, midY + 8);
      ctx.lineTo(PAD + 14, midY + 8);
      ctx.moveTo(PAD - 7, midY - 8);
      ctx.lineTo(PAD + 7, midY - 8);
      ctx.stroke();
      if (width > 340) {
        drawTag(ctx, '−', PAD + 26, midY - 8, font, width);
        drawTag(ctx, '+', PAD + 26, midY + 8, font, width);
      }

      // The lamp, on the right: brighter with the power it's taking.
      const lampX = PAD + w;
      // By the square root of the power, as the eye takes brightness, reaching
      // full at the most this circuit can draw.
      const glow = Math.min(
        1,
        Math.sqrt((state.volts * state.amps) / MAX_WATTS),
      );
      if (glow > 0) {
        const radius = 18 + glow * 44;
        const halo = ctx.createRadialGradient(
          lampX,
          midY,
          4,
          lampX,
          midY,
          radius,
        );
        halo.addColorStop(0, accent);
        halo.addColorStop(1, 'transparent');
        ctx.globalAlpha = glow;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(lampX, midY, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#101012';
      ctx.beginPath();
      ctx.arc(lampX, midY, 13, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = glow;
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#e8e8f0';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (width > 420) {
        drawTag(ctx, 'Electrons drift this way →', width / 2, PAD, font, width);
        drawTag(
          ctx,
          '→ Conventional current, drawn the other way',
          width / 2,
          PAD + h,
          font,
          width,
        );
      }
    },
  );

  useEffect(() => {
    if (reduced) redraw();
  }, [volts, amps, reduced, redraw]);

  return (
    <LabStage className="h-[clamp(10rem,28vh,15rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
