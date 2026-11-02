import { useEffect, useMemo, useRef, useState } from 'react';
import { LabSlider, LabStage } from './LabControls';
import { canvasFont, drawBandLabel } from './drawWave';
import {
  crossingSeconds,
  medium as mediumOf,
  pulseDisplacement,
  PULSE_WIDTH,
  seededField,
  type Medium,
} from './physics/particles';
import { useLabCanvas } from './useLabCanvas';

// ── A pulse crossing a medium ──────────────────────────────────────────────
// Each lane: rows of particles, a tap at the left sending a pulse to the right.
// Every lane's clock is slowed by the same amount, so a race between them is to
// scale. One particle is marked, with a tick where it rests, to show it comes
// straight back: the energy crossed the stage, the particle didn't.

const ROWS = 5;
const MARK_ROW = 2;

/** Where a pulse's front starts, just off stage, so a crossing is clean. */
const START_FRONT = -PULSE_WIDTH * 3;

export const PULSE_CAPTION =
  'Slowed right down, all by the same amount, so the speeds are to scale.';

export interface PulseLane {
  medium: Medium;
  /** Its name, drawn in the lane; left out for a mystery. */
  label?: string;
}

export function PulseStage({
  lanes,
  fire,
  accent,
  particles,
  onArrive,
  className,
}: {
  lanes: readonly PulseLane[];
  /** Change it to send a pulse down every lane. 0 sends none. */
  fire: number;
  accent: string;
  /** Draw this many in a row on every lane, to hide which medium it is. */
  particles?: number;
  /** A lane's pulse reached the far side. */
  onArrive?: (id: Medium['id']) => void;
  className?: string;
}) {
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;
  const arriveRef = useRef(onArrive);
  arriveRef.current = onArrive;
  const startRef = useRef<number | null>(null);
  const arrivedRef = useRef(new Set<Medium['id']>());
  const [scrub, setScrub] = useState(0);
  const scrubRef = useRef(0);
  scrubRef.current = scrub;
  const jitter = useMemo(() => seededField(2000, 11), []);

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height }) => {
      const reducedNow = reducedRef.current;
      const elapsed = reducedNow
        ? scrubRef.current * crossingSeconds(mediumOf('air').speed) * 1.3
        : startRef.current == null
          ? null
          : (performance.now() - startRef.current) / 1000;
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.8125) : '13px sans-serif';
      const current = lanesRef.current;
      const laneHeight = height / current.length;
      const inset = 14;
      const track = width - inset * 2;

      current.forEach((lane, index) => {
        const top = index * laneHeight;
        const crossing = crossingSeconds(lane.medium.speed);
        const front =
          elapsed == null || !Number.isFinite(crossing)
            ? null
            : START_FRONT + (elapsed / crossing) * (1 - START_FRONT);
        const count =
          lane.medium.particles === 0
            ? 0
            : (particles ?? lane.medium.particles);
        const reach = count ? 1.3 / count : 0;
        const arrived = front != null && front >= 1;
        if (arrived && !arrivedRef.current.has(lane.medium.id)) {
          arrivedRef.current.add(lane.medium.id);
          arriveRef.current?.(lane.medium.id);
        }

        // The particles.
        ctx.fillStyle = 'rgb(232 232 240 / 0.75)';
        ctx.beginPath();
        for (let row = 0; row < ROWS && count; row++) {
          const y = top + (laneHeight * (row + 1)) / (ROWS + 1);
          for (let i = 0; i < count; i++) {
            const rest =
              (i + 0.5 + (row % 2) * 0.5) / count +
              (jitter[(row * 97 + i) % jitter.length].x - 0.5) * (0.3 / count);
            const moved =
              rest +
              (front == null ? 0 : pulseDisplacement(rest, front, reach));
            if (row === MARK_ROW && i === Math.floor(count / 2)) continue;
            const x = inset + moved * track;
            ctx.moveTo(x + 2.75, y);
            ctx.arc(x, y, 2.75, 0, Math.PI * 2);
          }
        }
        ctx.fill();

        // The marked particle, and where it rests.
        if (count) {
          const i = Math.floor(count / 2);
          const y = top + (laneHeight * (MARK_ROW + 1)) / (ROWS + 1);
          const rest = (i + 0.5) / count;
          const restX = inset + rest * track;
          const x =
            inset +
            (rest +
              (front == null ? 0 : pulseDisplacement(rest, front, reach))) *
              track;
          ctx.beginPath();
          ctx.moveTo(restX + 0.5, y - 11);
          ctx.lineTo(restX + 0.5, y + 11);
          ctx.strokeStyle = 'rgb(255 255 255 / 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = accent;
          ctx.fill();
        }

        // The far wall lights as the pulse gets there.
        ctx.beginPath();
        ctx.moveTo(width - 5, top + laneHeight * 0.14);
        ctx.lineTo(width - 5, top + laneHeight * 0.86);
        ctx.strokeStyle = arrived ? accent : 'rgb(255 255 255 / 0.2)';
        ctx.lineWidth = arrived ? 3 : 1;
        ctx.stroke();

        if (lane.label) {
          drawBandLabel(
            ctx,
            lane.label,
            { x: 0, y: top, width, height: laneHeight },
            font,
          );
        }
        if (index > 0) {
          ctx.beginPath();
          ctx.moveTo(0, Math.round(top) + 0.5);
          ctx.lineTo(width, Math.round(top) + 0.5);
          ctx.strokeStyle = 'rgb(255 255 255 / 0.1)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    },
  );
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    if (fire === 0) return;
    startRef.current = performance.now();
    arrivedRef.current = new Set();
  }, [fire]);

  // Without a loop (reduced motion), a change has to ask for its own picture.
  const key = lanes.map((lane) => lane.medium.id).join();
  useEffect(() => {
    if (reduced) {
      arrivedRef.current = new Set();
      redraw();
    }
  }, [key, fire, scrub, reduced, redraw]);

  return (
    <>
      <LabStage
        caption={PULSE_CAPTION}
        className={
          className ??
          (lanes.length > 1
            ? 'h-[clamp(14rem,44vh,22rem)]'
            : 'h-[clamp(8rem,22vh,12rem)]')
        }
      >
        <canvas
          ref={canvasRef}
          aria-hidden
          className="absolute inset-0 size-full"
        />
      </LabStage>
      {reduced && (
        <LabSlider
          label="Move the pulse along"
          value={scrub}
          accent={accent}
          valueText={`${Math.round(scrub * 100)} percent of the way`}
          onChange={setScrub}
        />
      )}
    </>
  );
}
