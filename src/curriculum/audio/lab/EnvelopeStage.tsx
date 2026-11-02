import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import type { Tone } from './WaveStage';
import { canvasFont, drawTag } from './drawWave';
import { envelopeLevel, TAP_HOLD, type Envelope } from './physics/envelope';
import { useLabCanvas } from './useLabCanvas';

const PAD = 18;

/** A note being played: when it started, and when it was let go. */
export interface PlayedNote {
  startedAt: number;
  /** Seconds after the start; null while it's held. */
  letGoAfter: number | null;
}

/**
 * A note's shape: level up, time along, the same straight lines LabAudio ramps.
 * A dot rides it while the note sounds, at the note's true level. A note still
 * held waits on the sustain.
 */
export function EnvelopeStage({
  envelope,
  played,
  named = false,
  accent,
  tone,
  caption,
}: {
  envelope: Envelope;
  played: React.RefObject<PlayedNote | null>;
  /** Names the four stages along the top. */
  named?: boolean;
  accent: string;
  tone: Tone;
  caption: string;
}) {
  const envRef = useRef(envelope);
  envRef.current = envelope;
  const soundingRef = useRef(false);
  soundingRef.current = tone.sounding.size > 0;
  const peakRef = useRef(tone.peak);
  peakRef.current = tone.peak;

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height }) => {
      const env = envRef.current;
      const hold = Math.max(TAP_HOLD, env.attack + env.decay + 0.4);
      const total = hold + env.release;
      const top = named ? 36 : PAD;
      const inner = width - PAD * 2;
      const tall = height - top - PAD;
      const xAt = (t: number) => PAD + (t / total) * inner;
      const yAt = (level: number) => top + (1 - level) * tall;

      ctx.beginPath();
      ctx.moveTo(PAD, yAt(0) + 0.5);
      ctx.lineTo(width - PAD, yAt(0) + 0.5);
      ctx.strokeStyle = 'rgb(255 255 255 / 0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const corners = [
        0,
        env.attack,
        env.attack + env.decay,
        hold,
        hold + env.release,
      ];
      ctx.beginPath();
      corners.forEach((t, i) => {
        const y = yAt(envelopeLevel(t, env, hold));
        if (i === 0) ctx.moveTo(xAt(t), y);
        else ctx.lineTo(xAt(t), y);
      });
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      const canvas = canvasRef.current;
      if (named && canvas) {
        const font = canvasFont(canvas, 0.75);
        const stages: readonly [string, number, number][] = [
          ['A', 0, env.attack],
          ['D', env.attack, env.attack + env.decay],
          ['S', env.attack + env.decay, hold],
          ['R', hold, hold + env.release],
        ];
        for (const [name, from, to] of stages) {
          // A stage too short to see has no room for its letter either.
          if (xAt(to) - xAt(from) < 18) continue;
          drawTag(ctx, name, xAt((from + to) / 2), 16, font, width);
        }
      }

      const note = played.current;
      // Let go, it rides the release out; held, for as long as it sounds.
      if (note && (soundingRef.current || note.letGoAfter != null)) {
        const elapsed = (performance.now() - note.startedAt) / 1000;
        const letGo = note.letGoAfter;
        const level = envelopeLevel(elapsed, env, letGo ?? Infinity);
        // Held past the picture's sustain: waits there until it's let go.
        const along =
          letGo == null
            ? Math.min(elapsed, hold)
            : elapsed < letGo
              ? Math.min(elapsed, hold)
              : hold + (elapsed - letGo);
        ctx.beginPath();
        ctx.arc(xAt(Math.min(along, total)), yAt(level), 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        if (canvas) canvas.dataset.labPeak = peakRef.current().toFixed(4);
      }
    },
  );

  useEffect(() => {
    if (reduced) redraw();
  }, [envelope, reduced, redraw]);

  return (
    <LabStage className="h-[clamp(9rem,26vh,14rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
