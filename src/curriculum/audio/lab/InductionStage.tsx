import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import { canvasFont, drawTag } from './drawWave';
import { inducedVoltage } from './physics/electric';
import { useLabCanvas } from './useLabCanvas';

/** The induced voltage the meter reads full at, in the model's units. Past it,
 *  the needle hits its stop, as a real meter's would. */
const FULL_SCALE = 3000;
/** How quickly the needle settles: only enough to take the jitter off, since
 *  any more would read fast swings low and contradict the doubling it shows. */
const SETTLE = 90;

/**
 * A magnet and a coil of wire, with a meter on the coil. The needle reads the
 * voltage Faraday's law gives for the magnet's real movement on the stage, so it
 * falls to nothing when the magnet stops. Give `place` to drag the magnet, or
 * `swings` to have it move by itself.
 */
export function InductionStage({
  place,
  swings = 0,
  turns,
  accent,
  caption,
}: {
  /** Where the magnet is, 0..1; left out, it swings by itself. */
  place?: number;
  /** Swings a second, when it moves by itself. */
  swings?: number;
  turns: number;
  accent: string;
  caption: string;
}) {
  const props = useRef({ place, swings, turns });
  props.current = { place, swings, turns };
  const motion = useRef({ x: 0.5, needle: 0, last: 0, phase: 0 });

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const now = props.current;
      const m = motion.current;
      const dt = Math.max(0.001, time - m.last);
      m.last = time;
      m.phase += dt * now.swings;
      const x = now.place ?? 0.5 + 0.34 * Math.sin(2 * Math.PI * m.phase);
      const velocity = (x - m.x) / dt;
      m.x = x;
      const volts = inducedVoltage(now.turns, x, velocity) / FULL_SCALE;
      m.needle +=
        (Math.max(-1.2, Math.min(1.2, volts)) - m.needle) *
        Math.min(1, dt * SETTLE);

      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.75) : '12px sans-serif';
      const meterRoom = Math.min(width * 0.26, 150);
      const across = width - meterRoom;
      const mid = height / 2 + 6;
      const reach = (x2: number) => 24 + x2 * (across - 48);

      // The coil, more loops for more turns.
      const loops = Math.round(4 + Math.log2(now.turns / 50) * 2.5);
      const coilWidth = across * 0.22;
      const coilLeft = reach(0.5) - coilWidth / 2;
      ctx.strokeStyle = 'rgb(255 255 255 / 0.3)';
      ctx.lineWidth = 2;
      const backs = () => {
        for (let i = 0; i < loops; i++) {
          const cx = coilLeft + (coilWidth * (i + 0.5)) / loops;
          ctx.beginPath();
          ctx.ellipse(cx, mid, 6, 32, 0, Math.PI / 2, (3 * Math.PI) / 2);
          ctx.stroke();
        }
      };
      backs();

      // The magnet, its field lines going with it.
      const mx = reach(x);
      const barW = Math.min(across * 0.2, 96);
      for (const lift of [1, 2]) {
        ctx.beginPath();
        ctx.ellipse(
          mx,
          mid,
          barW * 0.5 + lift * 22,
          16 + lift * 15,
          0,
          0,
          2 * Math.PI,
        );
        ctx.strokeStyle = 'rgb(255 255 255 / 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = accent;
      ctx.fillRect(mx - barW / 2, mid - 10, barW / 2, 20);
      ctx.fillStyle = '#e8e8f0';
      ctx.fillRect(mx, mid - 10, barW / 2, 20);
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#101012';
      ctx.fillText('N', mx - barW / 4, mid);
      ctx.fillText('S', mx + barW / 4, mid);

      // The loops' fronts pass in front of the magnet.
      ctx.strokeStyle = 'rgb(232 232 240 / 0.8)';
      ctx.lineWidth = 2;
      for (let i = 0; i < loops; i++) {
        const cx = coilLeft + (coilWidth * (i + 0.5)) / loops;
        ctx.beginPath();
        ctx.ellipse(cx, mid, 6, 32, 0, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }

      // The meter.
      const cx = across + meterRoom / 2;
      const cy = mid + 24;
      const r = Math.min(meterRoom * 0.42, height * 0.36);
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = 'rgb(255 255 255 / 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const angle = -Math.PI / 2 + m.needle * (Math.PI / 2.4);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(angle) * r * 0.92,
        cy + Math.sin(angle) * r * 0.92,
      );
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      drawTag(ctx, 'Voltage', cx, cy + 16, font, width);
      if (canvas) canvas.dataset.needle = m.needle.toFixed(3);
    },
  );

  // Without a loop (reduced motion), the magnet's movement draws one change, and
  // a moment later the picture of it at rest.
  useEffect(() => {
    if (!reduced) return;
    redraw();
    const timer = window.setTimeout(redraw, 200);
    return () => window.clearTimeout(timer);
  }, [place, swings, turns, reduced, redraw]);

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
