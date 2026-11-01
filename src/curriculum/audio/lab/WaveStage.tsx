import { useEffect, useRef, useState } from 'react';
import { LabSlider, LabStage } from './LabControls';
import {
  canvasFont,
  drawBandLabel,
  drawRestLine,
  drawWave,
  drawWavelengthMark,
} from './drawWave';
import { windowMsFor } from './physics/wave';
import { useLabCanvas } from './useLabCanvas';
import type { useLabTone } from './useLabTone';

/** The wave's slide across the stage, in cycles a second, for the eye only. */
const DRIFT = 0.35;

export type Tone = ReturnType<typeof useLabTone>;

/** The wave stage: one to two lines, a true time scale, honest about both. */
export function WaveStage({
  lines,
  tone,
  accent,
  compare = false,
}: {
  lines: readonly { hz: number; color: string; label?: string }[];
  tone: Tone;
  accent: string;
  /** Each line gets its own band, on the same time scale. */
  compare?: boolean;
}) {
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const [windowMs, setWindowMs] = useState(20);
  const [scrub, setScrub] = useState(0);
  const scrubRef = useRef(0);
  scrubRef.current = scrub;
  const soundingRef = useRef(false);
  soundingRef.current = tone.sounding.size > 0;
  const peakRef = useRef(tone.peak);
  peakRef.current = tone.peak;
  const windowMsRef = useRef(windowMs);

  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const current = linesRef.current;
      const fastest = Math.max(...current.map((line) => line.hz));
      const ms = windowMsFor(fastest, width);
      if (ms !== windowMsRef.current) {
        windowMsRef.current = ms;
        setWindowMs(ms);
      }
      // One slide in time for every line, so waves on one stage stay truly
      // aligned: in cycles, a line twice as fast slides twice as many.
      const slowest = Math.min(...current.map((line) => line.hz));
      const slide = time * DRIFT + scrubRef.current;
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.875) : '14px sans-serif';
      const bands = compare ? current.length : 1;
      const bandHeight = height / bands;
      current.forEach((line, i) => {
        const band = {
          x: 0,
          y: compare ? bandHeight * i : 0,
          width,
          height: bandHeight,
        };
        if (compare || i === 0) drawRestLine(ctx, band);
        const wave = {
          hz: line.hz,
          windowMs: ms,
          phase: slide * (line.hz / slowest),
          color: line.color,
        };
        drawWave(ctx, wave, band);
        if (compare || i === current.length - 1) {
          drawWavelengthMark(ctx, wave, band, font);
        }
        if (line.label) drawBandLabel(ctx, line.label, band, font);
      });
      // The real output's peak, for the page's own checks.
      if (canvas && soundingRef.current) {
        canvas.dataset.labPeak = peakRef.current().toFixed(4);
      }
    },
  );

  // Without a loop (reduced motion), a change has to ask for its own picture.
  const key = lines.map((line) => line.hz).join();
  useEffect(() => {
    if (reduced) redraw();
  }, [key, scrub, reduced, redraw]);

  return (
    <>
      <LabStage
        // To the window's height, so the wave and the slider under it fit
        // on one laptop screen: the point is to watch one while dragging the other.
        className={
          compare ? 'h-[clamp(13rem,42vh,22rem)]' : 'h-[clamp(9rem,26vh,16rem)]'
        }
        caption={
          <>
            Showing {windowMs} ms of the wave, to scale. Real sound moves far
            too fast to see, so it’s slowed right down here.
          </>
        }
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full"
          aria-hidden
        />
      </LabStage>
      {reduced && (
        <LabSlider
          label="Slide the wave along"
          value={scrub}
          accent={accent}
          valueText={`${Math.round(scrub * 100)} percent of a cycle`}
          onChange={setScrub}
        />
      )}
    </>
  );
}
