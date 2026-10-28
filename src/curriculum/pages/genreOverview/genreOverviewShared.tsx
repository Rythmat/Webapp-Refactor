import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Tone from 'tone';
import { startEpSampler, triggerEpAttackRelease } from '@/audio/epSampler';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';
import type {
  GenreLevelProfile,
  LevelScale,
} from '@/curriculum/types/genreProfile';
import { scaleColorMode } from '@/curriculum/utils/flowKey';
import { colorForKeyMode } from '@/lib/modeColorShift';

// ── What the genre Overview's panels share ─────────────────────────────────
// The course page's About / Theory / Technique, moved into the lesson as its
// Overview (owner, 2026-10-27), in the lesson's look: the prompt box's cards,
// quiet eyebrows, the key colour only for what's lit.

/** A card's small heading. */
export const EYEBROW = 'text-xs uppercase tracking-[0.14em] text-white/45';

/** Ms between a scale's notes when it plays. */
export const SCALE_STEP_MS = 600;

export async function playChord(midis: number[]) {
  await startEpSampler();
  midis.forEach((midi, i) => {
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    setTimeout(() => {
      triggerEpAttackRelease(noteName, 0.8, 0.8);
    }, i * 30);
  });
}

export async function playScaleAscending(midis: number[]) {
  await startEpSampler();
  midis.forEach((midi, i) => {
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    setTimeout(() => {
      triggerEpAttackRelease(noteName, 0.4, 0.8);
    }, i * SCALE_STEP_MS);
  });
}

export function midisToEvents(
  midis: number[],
  prefix: string,
): PlaybackEvent[] {
  return midis.map((midi, i) => ({
    id: `${prefix}-${midi}-${i}`,
    type: 'note' as const,
    midi,
    time: 0,
    duration: 0,
    velocity: 1,
  }));
}

/** A keyboard drawn at its own width, scaled to fit its box. */
export function ScaledPiano({
  children,
  pointerEventsNone,
}: {
  children: ReactNode;
  pointerEventsNone?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    let prevWidth = 0;
    const update = () => {
      const cw = container.clientWidth;
      if (cw === prevWidth) return;
      prevWidth = cw;
      const iw = inner.scrollWidth;
      const ih = inner.scrollHeight;
      if (iw > 0) {
        setScale(cw / iw);
        setInnerHeight(ih);
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden${pointerEventsNone ? ' pointer-events-none' : ''}`}
      style={{ height: innerHeight ? `${innerHeight * scale}px` : undefined }}
    >
      <div
        ref={innerRef}
        style={{
          width: 'fit-content',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── A level's scales and their colours ─────────────────────────────────────

export type ShownScale = Omit<LevelScale, 'scaleId'> & { scaleId?: string };

/** The scales a level shows: its own list, else the one its mode names. */
export function levelScales(level: GenreLevelProfile): ShownScale[] {
  return (
    level.scales ?? [
      {
        name: level.mode,
        intervals: level.scaleIntervals,
        notes: level.scaleNotes,
      },
    ]
  );
}

/**
 * The color one of a level's scales is shown in, as its lesson steps are:
 * its mode's color in the level's key, the harmonic minor its own. Without a
 * scale id, the color the level's mode reads as.
 */
export function scaleColor(level: GenreLevelProfile, scaleId?: string): string {
  const root = level.keyCenter.split(' ')[0];
  if (scaleId)
    return colorForKeyMode(
      root,
      scaleColorMode(scaleId) as Parameters<typeof colorForKeyMode>[1],
    );
  const rawMode = level.mode.toLowerCase();
  // Minor Pentatonic → treat as Dorian for color (same relative-major relationship).
  // Major Pentatonic shares its color with Ionian, so it falls through unchanged.
  const modeSlug = rawMode.includes('minor pentatonic') ? 'dorian' : rawMode;
  return colorForKeyMode(
    root,
    modeSlug as Parameters<typeof colorForKeyMode>[1],
  );
}

/** A scale's notes from the level's key note, up to its octave. */
export function scaleMidis(level: GenreLevelProfile, scale: ShownScale) {
  const midis = scale.intervals.map((i) => i + level.keyMidi);
  const octave = level.keyMidi + 12;
  if (!midis.includes(octave)) midis.push(octave);
  return midis;
}
