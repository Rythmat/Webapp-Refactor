import { useRef } from 'react';
import { canvasFont } from '../../../lab/drawWave';
import { useLabCanvas } from '../../../lab/useLabCanvas';
import type { MeterPoint } from '../../../mix/mixEngine';
import type { Mix } from '../../../mix/useMixEngine';
import { useHeldPeak } from '../ChannelStrip';

/** How long a clip light stays lit after the last over, as real ones hold. */
const CLIP_HOLD = 0.45;
/** How long the highest light of a hit stays on, so that it can be read. */
const PEAK_HOLD = 1.2;

export interface LedStep {
  /** Lit from this level up, in decibels below the clip. */
  db: number;
  text: string;
}

/**
 * A column of lights, as a desk channel or a power amp has: green, amber near the
 * top, and a red one that flashes on every peak that goes over. It reads the real
 * signal at one point in the mix, so what's lit is what's playing.
 */
export function LedLadder({
  mix,
  point,
  trackDb,
  resetKey,
  steps,
  target,
  accent,
  label,
}: {
  mix: Mix;
  point: MeterPoint;
  trackDb?: number;
  resetKey?: string;
  /** Quietest first. The clip light is added on top. */
  steps: readonly LedStep[];
  /** A band to aim for, marked beside the lights. */
  target?: readonly [number, number];
  accent: string;
  label: string;
}) {
  const read = useHeldPeak({ mix, point, trackDb, resetKey });
  const last = useRef(0);
  const clipUntil = useRef(-1);
  const hold = useRef({ db: -Infinity, until: -1 });
  const props = useRef({ steps, target, accent });
  props.current = { steps, target, accent };

  const { canvasRef } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const seconds = Math.max(0, time - last.current);
      last.current = time;
      const { levelDb, playing } = read(seconds);
      const { steps: lights, target: band, accent: tint } = props.current;
      const canvas = canvasRef.current as HTMLCanvasElement;
      if (playing && levelDb > 0) clipUntil.current = time + CLIP_HOLD;
      if (!playing) clipUntil.current = -1;
      const clipping = time < clipUntil.current;
      if (!playing) hold.current = { db: -Infinity, until: -1 };
      else if (levelDb >= hold.current.db || time > hold.current.until) {
        hold.current = { db: levelDb, until: time + PEAK_HOLD };
      }
      // The one light that a peak-hold keeps on: the highest the last hit lit.
      const held = lights.reduce(
        (top, step, i) => (hold.current.db >= step.db ? i : top),
        -1,
      );

      const rows = lights.length + 1;
      const pitch = height / rows;
      const r = Math.min(pitch * 0.32, 6);
      const cx = r + 4;
      ctx.font = canvasFont(canvas, 0.6875);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      const at = (i: number) => height - pitch * (i + 0.5);
      if (band) {
        const inBand = lights
          .map((step, i) => ({ step, i }))
          .filter(({ step }) => step.db >= band[0] && step.db <= band[1]);
        if (inBand.length) {
          const top = at(inBand[inBand.length - 1].i) - pitch / 2;
          const bottom = at(inBand[0].i) + pitch / 2;
          ctx.fillStyle = `${tint}40`;
          ctx.fillRect(0, top, width, bottom - top);
        }
      }
      lights.forEach((step, i) => {
        const on = playing && (levelDb >= step.db || i === held);
        const color = step.db >= -6 ? '#f59e0b' : '#34d399';
        ctx.beginPath();
        ctx.arc(cx, at(i), r, 0, Math.PI * 2);
        ctx.fillStyle = on ? color : 'rgb(255 255 255 / 0.1)';
        ctx.fill();
        ctx.fillStyle = 'rgb(255 255 255 / 0.55)';
        ctx.fillText(step.text, cx + r + 5, at(i));
      });
      const top = at(lights.length);
      ctx.beginPath();
      ctx.arc(cx, top, r, 0, Math.PI * 2);
      ctx.fillStyle = clipping ? '#ef4444' : 'rgb(239 68 68 / 0.16)';
      ctx.fill();
      ctx.fillStyle = clipping ? '#fca5a5' : 'rgb(255 255 255 / 0.55)';
      ctx.fillText('CLIP', cx + r + 5, top);

      canvas.dataset.clip = String(clipping);
      canvas.dataset.levelDb = Number.isFinite(levelDb)
        ? levelDb.toFixed(1)
        : '-inf';
    },
    { live: true },
  );

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className="h-full min-h-28 w-14"
      data-led-ladder={label}
    />
  );
}
