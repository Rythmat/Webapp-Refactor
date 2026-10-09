// ── Song chords: qualities ─────────────────────────────────────────────────
// The chords songs are written in (G, F♯min7, E7(♯9), D/F♯), as a vocabulary
// of their own: the Songs page shows them on guitar, and the Theory lessons'
// BookChordQuality stays as it is. Each quality lists its tones by semitones
// above the root, which tones a guitar shape must sound, and how each tone is
// labelled on a chord box ('R', never '1', so it can't read as finger 1).

export type SongChordQuality =
  | 'maj'
  | 'min'
  | 'dim'
  | 'aug'
  | 'power'
  | 'sus2'
  | 'sus4'
  | 'add9'
  | 'maj6'
  | 'min6'
  | 'maj7'
  | 'dom7'
  | 'min7'
  | 'min7b5'
  | 'dim7'
  | 'dom7sus4'
  | 'dom7#5'
  | 'dom7#9'
  | 'dom7b9'
  | 'dom7alt'
  | 'dom7no3'
  | 'dom9'
  | 'dom13'
  | 'maj9'
  | 'maj7#11';

export interface SongQualitySpec {
  /** Semitones above the root → the tone's label. */
  tones: Readonly<Record<number, string>>;
  /** Tones a shape must sound; the others (a 5th, a 9th) may be left out. */
  required: readonly number[];
}

const R = { 0: 'R' } as const;

/** Every song quality: its tones and the ones a guitar shape can't leave out. */
export const SONG_QUALITIES: Readonly<
  Record<SongChordQuality, SongQualitySpec>
> = {
  maj: { tones: { ...R, 4: '3', 7: '5' }, required: [0, 4, 7] },
  min: { tones: { ...R, 3: '♭3', 7: '5' }, required: [0, 3, 7] },
  dim: { tones: { ...R, 3: '♭3', 6: '♭5' }, required: [0, 3, 6] },
  aug: { tones: { ...R, 4: '3', 8: '♯5' }, required: [0, 4, 8] },
  power: { tones: { ...R, 7: '5' }, required: [0, 7] },
  sus2: { tones: { ...R, 2: '2', 7: '5' }, required: [0, 2, 7] },
  sus4: { tones: { ...R, 5: '4', 7: '5' }, required: [0, 5, 7] },
  add9: { tones: { ...R, 2: '9', 4: '3', 7: '5' }, required: [0, 2, 4] },
  maj6: { tones: { ...R, 4: '3', 7: '5', 9: '6' }, required: [0, 4, 9] },
  min6: { tones: { ...R, 3: '♭3', 7: '5', 9: '6' }, required: [0, 3, 9] },
  maj7: { tones: { ...R, 4: '3', 7: '5', 11: '7' }, required: [0, 4, 11] },
  dom7: { tones: { ...R, 4: '3', 7: '5', 10: '♭7' }, required: [0, 4, 10] },
  min7: { tones: { ...R, 3: '♭3', 7: '5', 10: '♭7' }, required: [0, 3, 10] },
  min7b5: {
    tones: { ...R, 3: '♭3', 6: '♭5', 10: '♭7' },
    required: [0, 3, 6, 10],
  },
  dim7: {
    tones: { ...R, 3: '♭3', 6: '♭5', 9: '𝄫7' },
    required: [0, 3, 6, 9],
  },
  dom7sus4: {
    tones: { ...R, 5: '4', 7: '5', 10: '♭7' },
    required: [0, 5, 10],
  },
  'dom7#5': {
    tones: { ...R, 4: '3', 8: '♯5', 10: '♭7' },
    required: [0, 4, 8, 10],
  },
  'dom7#9': {
    tones: { ...R, 3: '♯9', 4: '3', 7: '5', 10: '♭7' },
    required: [0, 3, 4, 10],
  },
  dom7b9: {
    tones: { ...R, 1: '♭9', 4: '3', 7: '5', 10: '♭7' },
    required: [0, 1, 4, 10],
  },
  // Altered: any of the dominant's altered tensions over R 3 ♭7.
  dom7alt: {
    tones: { ...R, 1: '♭9', 3: '♯9', 4: '3', 6: '♭5', 8: '♯5', 10: '♭7' },
    required: [0, 4, 10],
  },
  dom7no3: { tones: { ...R, 7: '5', 10: '♭7' }, required: [0, 7, 10] },
  dom9: {
    tones: { ...R, 2: '9', 4: '3', 7: '5', 10: '♭7' },
    required: [0, 2, 4, 10],
  },
  dom13: {
    tones: { ...R, 2: '9', 4: '3', 7: '5', 9: '13', 10: '♭7' },
    required: [0, 4, 9, 10],
  },
  maj9: {
    tones: { ...R, 2: '9', 4: '3', 7: '5', 11: '7' },
    required: [0, 2, 4, 11],
  },
  'maj7#11': {
    tones: { ...R, 4: '3', 6: '♯11', 7: '5', 11: '7' },
    required: [0, 4, 6, 11],
  },
};

/** A slash bass outside the chord, by its distance from the root: D/E's E is '9'. */
const INTERVAL_LABEL: readonly string[] = [
  'R',
  '♭9',
  '9',
  '♯9',
  '3',
  '11',
  '♯11',
  '5',
  '♭13',
  '13',
  '♭7',
  '7',
];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The label of a pitch class in a chord on `rootPc`: its tone, or its interval. */
export function songToneLabel(
  quality: SongChordQuality,
  rootPc: number,
  pc: number,
): string {
  const semitones = mod12(pc - rootPc);
  return SONG_QUALITIES[quality].tones[semitones] ?? INTERVAL_LABEL[semitones];
}

/** The chord's pitch classes. */
export function songChordPcs(
  quality: SongChordQuality,
  rootPc: number,
): number[] {
  return Object.keys(SONG_QUALITIES[quality].tones).map((s) =>
    mod12(rootPc + Number(s)),
  );
}
