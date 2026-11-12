import { useMemo, useRef } from 'react';
import { canvasFont, drawTag } from '../../lab/drawWave';
import { useLabCanvas } from '../../lab/useLabCanvas';
import { farTake, firstHit, lowpassed, type FarTake } from './takes';

const FROM_MS = -12;
const TO_MS = 40;
const RULER = 22;
/** Peak level that fills a lane. */
const FULL_SCALE = 1;
const MARKS = [-10, 0, 10, 20, 30];

/**
 * One hit on separate tracks, zoomed in as far as you would in a DAW to line them
 * up, with their real samples and the sum you'd hear. Its clock is the close take:
 * 0 ms is when the hit reaches that mic.
 */
export function TakesStage({
  samples,
  sampleRate,
  far,
  names,
  showSum,
  accent,
}: {
  samples: Float32Array | null;
  sampleRate: number;
  far: FarTake | null;
  names: readonly [string, string];
  showSum: boolean;
  accent: string;
}) {
  const start = useMemo(() => (samples ? firstHit(samples) : 0), [samples]);
  const lowpassHz = far?.lowpassHz;
  const farSource = useMemo(
    () =>
      samples && lowpassHz
        ? lowpassed(samples, sampleRate, lowpassHz)
        : samples,
    [lowpassHz, samples, sampleRate],
  );
  const props = useRef({ samples, far, showSum, names, accent, farSource });
  props.current = { samples, far, showSum, names, accent, farSource };

  const { canvasRef } = useLabCanvas(
    ({ ctx, width, height }) => {
      const now = props.current;
      const canvas = canvasRef.current as HTMLCanvasElement;
      const lanes = now.showSum ? 3 : 2;
      const plot = height - RULER;
      const laneHeight = plot / lanes;
      const xOf = (ms: number) => ((ms - FROM_MS) / (TO_MS - FROM_MS)) * width;
      const font = canvasFont(canvas, 0.75);

      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const ms of MARKS) {
        const x = xOf(ms);
        ctx.fillStyle =
          ms === 0 ? 'rgb(255 255 255 / 0.35)' : 'rgb(255 255 255 / 0.08)';
        ctx.fillRect(Math.round(x), 0, 1, plot);
        ctx.fillStyle = 'rgb(255 255 255 / 0.55)';
        const label = `${ms < 0 ? '−' : ''}${Math.abs(ms)} ms`;
        const half = ctx.measureText(label).width / 2;
        if (x - half >= 2 && x + half <= width - 2) {
          ctx.fillText(label, x, plot + RULER / 2);
        }
      }

      if (!now.samples || !now.farSource) return;
      const from = start + Math.round((FROM_MS / 1000) * sampleRate);
      const to = start + Math.round((TO_MS / 1000) * sampleRate);
      const close = now.samples;
      const far = now.far
        ? farTake(now.farSource, sampleRate, now.far)
        : () => 0;

      const lane = (
        index: number,
        read: (i: number) => number,
        color: string,
        label: string,
      ) => {
        const mid = laneHeight * (index + 0.5);
        const reach = (laneHeight / 2) * 0.9;
        ctx.fillStyle = 'rgb(255 255 255 / 0.1)';
        ctx.fillRect(0, Math.round(mid), width, 1);
        ctx.beginPath();
        for (let i = from; i <= to; i++) {
          const x = ((i - from) / (to - from)) * width;
          const v = Math.max(-1, Math.min(1, read(i) / FULL_SCALE));
          const y = mid - v * reach;
          if (i === from) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.25;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.textAlign = 'left';
        drawTag(ctx, label, 48, laneHeight * index + 13, font, width);
        ctx.textAlign = 'center';
      };

      lane(0, (i) => close[i] ?? 0, now.accent, now.names[0]);
      if (now.far) lane(1, far, 'rgb(255 255 255 / 0.8)', now.names[1]);
      if (now.showSum) {
        lane(2, (i) => (close[i] ?? 0) + far(i), '#ffffff', 'What you hear');
      }
    },
    { live: true },
  );

  return (
    <div
      className="relative h-[clamp(11rem,30dvh,18rem)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.02]"
      data-takes-stage
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        role="img"
        aria-label={`One snare hit on two tracks, ${names[0]} and ${names[1]}, zoomed in to milliseconds.`}
      />
    </div>
  );
}
