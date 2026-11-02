import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import { LabSlider, LabStage } from './LabControls';
import { canvasFont, drawRestLine, drawTag } from './drawWave';
import {
  compressionsAt,
  seededField,
  toneParticleX,
  tonePressure,
  toneReach,
  wavesAcross,
} from './physics/particles';
import { useLabCanvas } from './useLabCanvas';

// ── A speaker pushing on the air in front of it ────────────────────────────
// Particles over a width of real air, each swinging about its own place, with
// the pressure curve under them on the same scale: where the curve peaks, they
// bunch, because it's drawn from the same equation. The motion is slowed
// hundreds of times, in proportion to the frequency.

/** Cycles a second on screen for A4; other notes in proportion. */
const SLOWED_A4 = 0.6;
/** Width of the speaker, in rem. */
const SPEAKER_REM = 3.5;
/** The field's rest places run past both edges, so none empties as they swing. */
const FIELD_OVERHANG = 0.12;

export const AIR_CAPTION =
  'About 2.3 metres of air, slowed hundreds of times. Real air particles are far smaller, far more numerous and move much less.';

export function AirStage({
  hz,
  squeeze = 1,
  accent,
  pressure = false,
  labels = false,
  frozenPhase,
  marker,
  onMark,
  className,
}: {
  hz: number;
  /** How hard the speaker pushes, 0..1. */
  squeeze?: number;
  accent: string;
  /** Draw the pressure curve under the particles. */
  pressure?: boolean;
  /** Name a compression and a rarefaction. */
  labels?: boolean;
  /** Hold still at this moment, in cycles. */
  frozenPhase?: number;
  /** A student's mark, 0..1 across the air. */
  marker?: number | null;
  /** Pressing the picture marks that place, 0..1 across the air. */
  onMark?: (x: number) => void;
  className?: string;
}) {
  const propsRef = useRef({ hz, squeeze, pressure, labels, marker, accent });
  propsRef.current = { hz, squeeze, pressure, labels, marker, accent };
  const frozenRef = useRef(frozenPhase);
  frozenRef.current = frozenPhase;
  const phaseRef = useRef(0);
  const lastRef = useRef(0);
  const [scrub, setScrub] = useState(0);
  const scrubRef = useRef(0);
  scrubRef.current = scrub;
  const field = useMemo(() => seededField(1500, 5), []);

  const speakerWidth = (canvas: HTMLCanvasElement | null) =>
    SPEAKER_REM *
    parseFloat(
      canvas ? getComputedStyle(document.documentElement).fontSize : '16',
    );

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const now = propsRef.current;
      const dt = Math.min(0.1, time - lastRef.current);
      lastRef.current = time;
      phaseRef.current += dt * SLOWED_A4 * (now.hz / 440);
      const phase = frozenRef.current ?? phaseRef.current + scrubRef.current;
      const canvas = canvasRef.current;
      const left = speakerWidth(canvas);
      const air = width - left;
      const waves = wavesAcross(now.hz);
      const curveHeight = now.pressure ? Math.min(height * 0.32, 84) : 0;
      const fieldHeight = height - curveHeight;
      const font = canvas ? canvasFont(canvas, 0.8125) : '13px sans-serif';
      const toPx = (x: number) => left + x * air;

      // The particles: only as many as the stage can show without a fog.
      const shown = Math.min(
        field.length,
        Math.round((width * fieldHeight) / 110),
      );
      ctx.fillStyle = 'rgb(232 232 240 / 0.8)';
      ctx.beginPath();
      for (let i = 0; i < shown; i++) {
        const rest = field[i].x * (1 + 2 * FIELD_OVERHANG) - FIELD_OVERHANG;
        const x = toPx(toneParticleX(rest, phase, waves, now.squeeze));
        if (x < left) continue;
        const y = 6 + field[i].y * (fieldHeight - 12);
        ctx.moveTo(x + 1.5, y);
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      }
      ctx.fill();

      // The speaker: its cone moves as the air touching it does.
      const push =
        toneReach(waves, now.squeeze) * air * Math.sin(2 * Math.PI * phase);
      const mid = fieldHeight / 2;
      const coneFront = left - 8 + push;
      ctx.strokeStyle = 'rgb(255 255 255 / 0.85)';
      ctx.lineWidth = 1.25;
      ctx.lineJoin = 'round';
      ctx.strokeRect(6, mid - 12, 12, 24);
      ctx.beginPath();
      ctx.moveTo(18, mid - 9);
      ctx.lineTo(coneFront, mid - fieldHeight * 0.34);
      ctx.lineTo(coneFront, mid + fieldHeight * 0.34);
      ctx.lineTo(18, mid + 9);
      ctx.stroke();

      if (now.pressure) {
        const band = {
          x: left,
          y: fieldHeight,
          width: air,
          height: curveHeight,
        };
        drawRestLine(ctx, band);
        const centre = band.y + band.height / 2;
        const reach = (band.height / 2) * 0.82;
        ctx.beginPath();
        for (let px = 0; px <= air; px += 1) {
          const y =
            centre - tonePressure(px / air, phase, waves, now.squeeze) * reach;
          if (px === 0) ctx.moveTo(left, y);
          else ctx.lineTo(left + px, y);
        }
        ctx.strokeStyle = now.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgb(255 255 255 / 0.55)';
        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(left - 16, centre);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Pressure', 0, 0);
        ctx.restore();
      }

      if (now.labels) {
        // The ones nearest the middle, so they stay on stage as they travel.
        const peaks = compressionsAt(phase, waves);
        const peak = peaks.reduce(
          (best, x) => (Math.abs(x - 0.4) < Math.abs(best - 0.4) ? x : best),
          peaks[0] ?? 0.4,
        );
        const trough = peak + 0.5 / waves;
        const mark = (x: number, text: string) => {
          if (x < 0 || x > 1) return;
          const px = toPx(x);
          ctx.beginPath();
          ctx.moveTo(px, 28);
          ctx.lineTo(px, height);
          ctx.strokeStyle = 'rgb(255 255 255 / 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
          drawTag(ctx, text, px, 16, font, width);
        };
        mark(peak, 'Compression');
        mark(trough, 'Rarefaction');
      }

      if (now.marker != null) {
        const px = toPx(now.marker);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.strokeStyle = now.accent;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    },
  );

  // Without a loop (reduced motion), a change has to ask for its own picture.
  useEffect(() => {
    if (reduced || frozenPhase != null) redraw();
  }, [
    hz,
    squeeze,
    pressure,
    labels,
    marker,
    scrub,
    frozenPhase,
    reduced,
    redraw,
  ]);

  return (
    <>
      <LabStage
        caption={AIR_CAPTION}
        className={cn(
          pressure
            ? 'h-[clamp(11rem,34vh,20rem)]'
            : 'h-[clamp(9rem,26vh,16rem)]',
          onMark && 'cursor-crosshair touch-none',
          className,
        )}
      >
        <canvas
          ref={canvasRef}
          aria-hidden
          className="absolute inset-0 size-full"
          onPointerDown={
            onMark
              ? (event) => {
                  const box = event.currentTarget.getBoundingClientRect();
                  const left = speakerWidth(event.currentTarget);
                  const x =
                    (event.clientX - box.left - left) / (box.width - left);
                  onMark(Math.min(1, Math.max(0, x)));
                }
              : undefined
          }
        />
      </LabStage>
      {reduced && frozenPhase == null && (
        <LabSlider
          label="Move the wave along"
          value={scrub}
          accent={accent}
          valueText={`${Math.round(scrub * 100)} percent of a cycle`}
          onChange={setScrub}
        />
      )}
    </>
  );
}
