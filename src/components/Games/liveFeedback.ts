/**
 * Live feedback while a student plays: which pitches are due right now (so a
 * press can be judged right or wrong the moment it happens) and which note
 * comes next (lit on the keyboard in Practice).
 */

/** Keyboard colour for a pitch that isn't due: dark enough to read on a white key,
 * and neutral, so it can't be mistaken for any mode's activity colour. */
export const WRONG_KEY_COLOR = '#71717a';

/** How long the "✕ F♯4" label stays up after a wrong note. */
export const WRONG_NOTE_FLASH_MS = 900;

// How far before a note's start it may be played early, as a fraction of the
// note's play window (its duration).
const EARLY_PLAY_WINDOW_RATIO = 1 / 8;

export interface TimedNote {
  id: string;
  startTicks: number;
  durationTicks: number;
}

/**
 * The ticks during which a note can be played: from a little before its start
 * (1/8 of its length — extend, don't shift) through to its natural end.
 */
export function activationWindow(note: TimedNote) {
  return {
    start: note.startTicks - note.durationTicks * EARLY_PLAY_WINDOW_RATIO,
    end: note.startTicks + note.durationTicks,
  };
}

/** Pitches whose window contains `tick`. */
export function dueMidisAt<T extends TimedNote>(
  notes: readonly T[],
  tick: number,
  midiOf: (note: T) => number | null,
): Set<number> {
  const due = new Set<number>();
  for (const note of notes) {
    const { start, end } = activationWindow(note);
    if (tick < start || tick >= end) continue;
    const midi = midiOf(note);
    if (midi != null) due.add(midi);
  }
  return due;
}

/**
 * The next thing to play: every note sharing the earliest start among notes
 * not yet played and not already over. A chord comes back whole.
 */
export function nextTargets<T extends TimedNote>(
  notes: readonly T[],
  played: (note: T) => boolean,
  tick: number,
): T[] {
  const pending = notes.filter(
    (note) => !played(note) && activationWindow(note).end > tick,
  );
  if (pending.length === 0) return [];
  const first = Math.min(...pending.map((note) => note.startTicks));
  return pending.filter((note) => note.startTicks === first);
}

const SHARP_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

/**
 * A pitch as a student reads it, e.g. "F♯4": the lesson's own spelling when
 * the pitch class is in its map, sharps otherwise.
 */
export function noteLabel(
  midi: number,
  spelling?: ReadonlyMap<number, string>,
): string {
  const pc = ((midi % 12) + 12) % 12;
  const name = spelling?.get(pc) ?? SHARP_NAMES[pc];
  const pretty = name.replace(/^([A-G])#/, '$1♯').replace(/^([A-G])b/, '$1♭');
  return `${pretty}${Math.floor(midi / 12) - 1}`;
}
