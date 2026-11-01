import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import type { Tone } from './WaveStage';
import { canvasFont, drawTag } from './drawWave';
import { nodesOf, standingAt, type SoundSource } from './physics/standing';
import { useLabCanvas } from './useLabCanvas';

/** Swings a second, for the eye: the real ones would be a blur. */
const SWINGS = 0.8;
const INSET = 28;

/**
 * A string or a pipe ringing in one pattern: the faint lines are its reach, the
 * bright one where it is now, the dots the places that never move. `length`
 * (0..1) stops a string short, as a finger on a fret does.
 */
export function StandingStage({
  source,
  mode,
  length = 1,
  ghostLength,
  accent,
  tone,
  caption,
}: {
  source: SoundSource;
  mode: number;
  length?: number;
  /** A place to aim for, marked on the string. */
  ghostLength?: number;
  accent: string;
  tone: Tone;
  caption: string;
}) {
  const drawn = useRef({ source, mode, length, ghostLength });
  drawn.current = { source, mode, length, ghostLength };
  const soundingRef = useRef(false);
  soundingRef.current = tone.sounding.size > 0;
  const peakRef = useRef(tone.peak);
  peakRef.current = tone.peak;

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const {
        source: from,
        mode: n,
        length: len,
        ghostLength: ghost,
      } = drawn.current;
      const mid = height / 2;
      const left = INSET;
      const full = width - INSET * 2;
      const span = from === 'string' ? full * len : full;
      const reach = height * (from === 'string' ? 0.32 : 0.26);
      const swing = Math.cos(2 * Math.PI * SWINGS * time);
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.8125) : '13px sans-serif';

      const trace = (scale: number, color: string, lineWidth: number) => {
        ctx.beginPath();
        for (let x = 0; x <= span; x += 1) {
          const y = mid - standingAt(from, n, x / span) * reach * scale;
          if (x === 0) ctx.moveTo(left, y);
          else ctx.lineTo(left + x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.stroke();
      };

      if (from === 'string') {
        // The rest of the string, past the finger: it doesn't sound.
        ctx.beginPath();
        ctx.moveTo(left + span, mid);
        ctx.lineTo(left + full, mid);
        ctx.strokeStyle = 'rgb(255 255 255 / 0.18)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        for (const x of [left, left + full]) {
          ctx.fillStyle = 'rgb(255 255 255 / 0.55)';
          ctx.fillRect(x - 2, mid - reach * 1.2, 4, reach * 2.4);
        }
        if (len < 0.999) {
          ctx.beginPath();
          ctx.arc(left + span, mid, 7, 0, 2 * Math.PI);
          ctx.fillStyle = '#e8e8f0';
          ctx.fill();
        }
        if (ghost != null) {
          ctx.beginPath();
          ctx.arc(left + full * ghost, mid, 7, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgb(255 255 255 / 0.55)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        // The pipe's walls; a clarinet's mouthpiece closes its left end.
        const wall = reach * 1.3;
        ctx.strokeStyle = 'rgb(255 255 255 / 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left, mid - wall);
        ctx.lineTo(left + span, mid - wall);
        ctx.moveTo(left, mid + wall);
        ctx.lineTo(left + span, mid + wall);
        if (from === 'clarinet') {
          ctx.moveTo(left, mid - wall);
          ctx.lineTo(left, mid + wall);
        }
        ctx.stroke();
      }

      trace(1, 'rgb(255 255 255 / 0.16)', 1);
      trace(-1, 'rgb(255 255 255 / 0.16)', 1);
      trace(swing, accent, 2.5);

      for (const u of nodesOf(from, n)) {
        ctx.beginPath();
        ctx.arc(left + span * u, mid, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      if (from !== 'string') {
        drawTag(
          ctx,
          from === 'flute' ? 'Open at both ends' : 'Closed at the left',
          width / 2,
          height - 14,
          font,
          width,
        );
      }
      if (canvas && soundingRef.current) {
        canvas.dataset.labPeak = peakRef.current().toFixed(4);
      }
    },
  );

  useEffect(() => {
    if (reduced) redraw();
  }, [source, mode, length, ghostLength, reduced, redraw]);

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
