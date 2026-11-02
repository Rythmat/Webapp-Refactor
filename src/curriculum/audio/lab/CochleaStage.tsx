import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import type { Tone } from './WaveStage';
import { canvasFont, drawTag } from './drawWave';
import { membraneReach, placeOf } from './physics/hearing';
import { useLabCanvas } from './useLabCanvas';

export type EarPart = 'outer' | 'middle' | 'inner';

/** The ripple along the membrane, for the eye only: real ones are far quicker. */
const RIPPLES = 16;
const DRIFT = 0.5;
const TICKS = [100, 1000, 8000];

/**
 * The ear, uncoiled so the cochlea can be seen along its length: eardrum, three
 * bones, then the membrane, moving most at each tone's own place. With `onMark`,
 * a press on the cochlea marks a place.
 */
export function CochleaStage({
  tones,
  part,
  ticks = true,
  mark,
  onMark,
  accent,
  tone,
  caption,
}: {
  /** The frequencies sounding on it. */
  tones: readonly number[];
  part?: EarPart;
  /** Marks where a few frequencies answer. */
  ticks?: boolean;
  mark?: number | null;
  onMark?: (along: number) => void;
  accent: string;
  tone: Tone;
  caption: string;
}) {
  const props = useRef({ tones, part, ticks, mark });
  props.current = { tones, part, ticks, mark };
  const soundingRef = useRef(false);
  soundingRef.current = tone.sounding.size > 0;
  const peakRef = useRef(tone.peak);
  peakRef.current = tone.peak;
  /** Where the cochlea starts, for turning a press into a place. */
  const tube = useRef({ left: 0, width: 1 });

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const now = props.current;
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.75) : '12px sans-serif';
      const mid = height / 2 + 8;
      const dim = 'rgb(255 255 255 / 0.4)';
      const lit = (on: boolean) => (on ? '#ffffff' : dim);

      const canal = Math.min(width * 0.16, 110);
      const drumX = canal;
      const bonesEnd = canal + Math.min(width * 0.08, 56);
      const left = bonesEnd + 6;
      const across = width - left - 16;
      tube.current = { left, width: across };
      const tall = Math.min(height * 0.3, 54);

      // Outer ear: the pinna's curve and the canal to the drum.
      ctx.strokeStyle = lit(now.part === 'outer');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(14, mid - tall);
      ctx.quadraticCurveTo(drumX * 0.3, mid - 12, drumX, mid - 12);
      ctx.moveTo(14, mid + tall);
      ctx.quadraticCurveTo(drumX * 0.3, mid + 12, drumX, mid + 12);
      ctx.stroke();

      // Middle ear: the drum, and the three bones against it.
      const shiver = Math.sin(time * 6) * (now.tones.length ? 1.5 : 0);
      ctx.strokeStyle = lit(now.part === 'middle');
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(drumX + shiver, mid - 18);
      ctx.lineTo(drumX + shiver, mid + 18);
      ctx.stroke();
      ctx.fillStyle = lit(now.part === 'middle');
      for (let i = 0; i < 3; i++) {
        const x = drumX + ((bonesEnd - drumX) * (i + 0.6)) / 3.2 + shiver;
        ctx.beginPath();
        ctx.arc(x, mid, 3.5 - i * 0.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Inner ear: the cochlea, drawn straight, narrowing away from its entrance.
      ctx.strokeStyle = lit(now.part === 'inner');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, mid - tall);
      ctx.lineTo(left + across, mid - tall * 0.55);
      ctx.lineTo(left + across, mid + tall * 0.55);
      ctx.lineTo(left, mid + tall);
      ctx.closePath();
      ctx.stroke();

      // The membrane, moving by the sum of what's sounding.
      const reachAt = (along: number) =>
        Math.min(
          1,
          now.tones.reduce((sum, hz) => sum + membraneReach(along, hz), 0),
        );
      ctx.beginPath();
      for (let x = 0; x <= across; x += 1) {
        const along = x / across;
        const ripple = Math.sin(2 * Math.PI * (along * RIPPLES - time * DRIFT));
        const y = mid - reachAt(along) * ripple * tall * 0.46;
        if (x === 0) ctx.moveTo(left + x, y);
        else ctx.lineTo(left + x, y);
      }
      ctx.strokeStyle = now.tones.length ? accent : 'rgb(255 255 255 / 0.3)';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      if (now.ticks && across > 150) {
        ctx.font = font;
        for (const hz of TICKS) {
          const x = left + placeOf(hz) * across;
          ctx.fillStyle = 'rgb(255 255 255 / 0.6)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`,
            x,
            mid + tall + 14,
          );
        }
      }
      if (now.mark != null) {
        const x = left + now.mark * across;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, mid - tall - 6);
        ctx.lineTo(x + 0.5, mid + tall + 6);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (across > 150) {
        drawTag(ctx, 'Entrance', left + 34, 16, font, width);
        drawTag(ctx, 'Far end', left + across - 30, 16, font, width);
      }
      if (canvas && soundingRef.current) {
        canvas.dataset.labPeak = peakRef.current().toFixed(4);
      }
    },
  );

  useEffect(() => {
    if (reduced) redraw();
  }, [tones, part, ticks, mark, reduced, redraw]);

  return (
    <LabStage className="h-[clamp(10rem,28vh,15rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
        onPointerDown={
          onMark &&
          ((event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const along =
              (event.clientX - rect.left - tube.current.left) /
              tube.current.width;
            onMark(Math.min(1, Math.max(0, along)));
          })
        }
        style={
          onMark ? { cursor: 'crosshair', touchAction: 'none' } : undefined
        }
      />
    </LabStage>
  );
}
