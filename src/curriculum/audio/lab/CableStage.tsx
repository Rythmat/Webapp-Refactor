import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import { canvasFont, drawBandLabel, drawRestLine } from './drawWave';
import { cableAt, type CableKind } from './physics/signal';
import { useLabCanvas } from './useLabCanvas';

/** Seconds across the stage: long enough to show the hum. */
const WINDOW = 1 / 30;
const SIGNAL_HZ = 440;
/** Slowed, for the eye only. */
const DRIFT = 0.004;

/**
 * Two wires and what the far end makes of them, from the same function the
 * sound is rendered with. On a balanced cable, the same hum is on both wires and
 * the signal is flipped on one, so subtracting one from the other leaves it clean.
 */
export function CableStage({
  kind,
  metres,
  accent,
  caption,
}: {
  kind: CableKind;
  metres: number;
  accent: string;
  caption: string;
}) {
  const now = useRef({ kind, metres });
  now.current = { kind, metres };
  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const { kind: k, metres: m } = now.current;
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.8125) : '13px sans-serif';
      const bandH = height / 3;
      const lane = (
        index: number,
        pick: (at: ReturnType<typeof cableAt>) => number,
        color: string,
        label: string,
      ) => {
        const band = { x: 0, y: bandH * index, width, height: bandH };
        drawRestLine(ctx, band);
        const mid = band.y + bandH / 2;
        const reach = (bandH / 2) * 0.62;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 1) {
          const seconds = (x / width) * WINDOW + time * DRIFT;
          const signal = 0.5 * Math.sin(2 * Math.PI * SIGNAL_HZ * seconds);
          const y =
            mid -
            Math.max(
              -1.5,
              Math.min(1.5, pick(cableAt(signal, seconds, m, k))),
            ) *
              reach;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();
        drawBandLabel(ctx, label, band, font);
      };
      const dim = 'rgb(232 232 240 / 0.8)';
      lane(0, (at) => at.hot, dim, k === 'balanced' ? 'Wire 1' : 'Signal wire');
      lane(
        1,
        (at) => at.cold,
        dim,
        k === 'balanced' ? 'Wire 2, flipped' : 'Ground: no signal',
      );
      lane(2, (at) => at.out, accent, 'What comes out');
    },
  );
  useEffect(() => {
    if (reduced) redraw();
  }, [kind, metres, reduced, redraw]);
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
