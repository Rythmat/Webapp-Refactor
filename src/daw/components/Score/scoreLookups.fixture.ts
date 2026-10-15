import type { MidiNoteEvent } from '@prism/engine';
import type { NoteInfo, StaffLayout } from '@/components/notation/StaffView';
import type { ScoreTextMark } from './scoreText';

// ── A page of marked-up music, for the Score's lookup tests ────────────────
// Two parts over two systems, with what the overlay looks things up for: a
// chord whose notes share a staccato, a note held over two barlines (drawn
// three times, listed out of order), slurs that reach a note not on the page
// or are not slurs at all, a note whose clip event is gone, two rehearsal
// marks on one bar, and text marks stacked on a bar.

export const TRACK = 'trk';
export const BASS = 'bss';

export const noteKey = (track: string, startTick: number, midi: number) =>
  `${track}:clip:${startTick}:${midi}`;

export const A = noteKey(TRACK, 0, 72);
export const B = noteKey(TRACK, 0, 76);
export const C = noteKey(TRACK, 480, 74);
export const D = noteKey(TRACK, 960, 72);
export const E = noteKey(BASS, 0, 48);
export const F = noteKey(BASS, 480, 48);
/** Drawn, but its clip event is gone. */
export const STALE = noteKey(TRACK, 3840, 60);
export const G = noteKey(TRACK, 4320, 74);

const event = (
  note: number,
  startTick: number,
  durationTicks = 480,
): MidiNoteEvent => ({
  note,
  startTick,
  durationTicks,
  velocity: 90,
  channel: 0,
});

export const melodyEvents = [
  event(72, 0),
  event(76, 0),
  event(74, 480),
  event(72, 960, 2400),
  event(74, 4320),
  // A second event with the same start and pitch: the first one counts.
  event(74, 4320, 960),
];
export const bassEvents = [event(48, 0), event(48, 480)];

export const articulations = [
  `${A}|staccato`,
  `${B}|staccato`,
  `${A}|accent`,
  `${C}|tenuto`,
  `${E}|staccato`,
  `${D}|fermata`,
  `${STALE}|marcato`,
  'not-a-mark',
  `${noteKey(TRACK, 9999, 61)}|accent`,
];

export const slurs = [
  `${A}|${C}`,
  `${C}|${D}`,
  `${E}|${F}`,
  `${noteKey(TRACK, 9999, 61)}|${A}`,
  `${D}|${G}`,
  'not-a-slur',
];

export const sections = [
  { measureIdx: 0, label: 'A' },
  { measureIdx: 3, label: 'B' },
  // A second mark on the same bar never shows; the first one does.
  { measureIdx: 3, label: 'C' },
];

export const textMarks: ScoreTextMark[] = [
  { id: 't1', measureIdx: 1, kind: 'text', text: 'rit.' },
  { id: 't2', measureIdx: 3, kind: 'segno' },
  { id: 't3', measureIdx: 1, kind: 'coda' },
  { id: 't4', measureIdx: 5, kind: 'dc' },
];

function note(
  id: string,
  partIndex: number,
  measureIndex: number,
  tick: number,
  y: number,
  extra: Partial<NoteInfo> = {},
): NoteInfo {
  return {
    id,
    partIndex,
    measureIndex,
    tick,
    x: 40 + tick / 8 + partIndex,
    y: y + partIndex * 120,
    space: 5,
    stem: 'up',
    letter: 'c',
    octave: 5,
    alteration: 0,
    line: 3,
    ...extra,
  };
}

const notes: NoteInfo[] = [
  note(A, 0, 0, 0, 40),
  note(B, 0, 0, 0, 30, { stem: 'down', line: 5 }),
  note(C, 0, 0, 480, 35),
  // Drawn three times across two barlines, and not listed in time order.
  note(D, 0, 1, 1920, 40),
  note(D, 0, 0, 960, 40),
  note(D, 0, 2, 2880, 40, { stem: null, line: 1 }),
  note(STALE, 0, 2, 3840, 45),
  note(G, 0, 3, 4320, 35),
  note(E, 1, 0, 0, 60),
  note(F, 1, 0, 480, 60, { stem: 'down' }),
];

const barline = (
  system: number,
  measureIndex: number,
  x: number,
  atSystemEnd = false,
) => ({
  system,
  measureIndex,
  x,
  y: 20 + system * 300,
  height: 200,
  atSystemEnd,
});

export const layout: StaffLayout = {
  // Listed out of order, so a system's first barline is not simply the first
  // one listed for it.
  barlines: [
    barline(0, 1, 260),
    barline(0, 0, 20),
    barline(0, 2, 500),
    barline(0, 3, 740, true),
    barline(1, 4, 260),
    barline(1, 3, 20),
    barline(1, 5, 500, true),
  ],
  measures: [0, 1, 2, 3, 4].flatMap((measureIndex) =>
    [0, 1].map((partIndex) => ({
      measureIndex,
      partIndex,
      system: measureIndex < 3 ? 0 : 1,
      x: 20 + (measureIndex % 3) * 240,
      y: 20 + (measureIndex < 3 ? 0 : 300) + partIndex * 120,
      width: 240,
      height: 100,
      startTick: measureIndex * 1920,
      endTick: (measureIndex + 1) * 1920,
    })),
  ),
  notes,
  rests: [],
  scale: 1,
  systemHeight: 260,
  stepPx: 5,
  topLineDrop: 30,
};
