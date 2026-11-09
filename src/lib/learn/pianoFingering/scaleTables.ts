import type { Hand, PianoFinger } from './types';

/**
 * Scale fingerings, one octave ascending from the tonic to the tonic: the
 * major and minor scales as ABRSM publishes them, and Peter's right-hand
 * pentatonic and blues fingerings (2026-10-17). Descending uses the same
 * finger on each note.
 *
 * Read by degree. Right hand: degree d takes the d-th finger, and the last
 * finger is for the top tonic when a run ends there (C major: 5, but 1 when
 * the run goes on up). Left hand, the mirror: the first finger is for the
 * bottom tonic when a run ends there (C major: 5), and the last is the
 * tonic's finger everywhere else (1).
 */
export type ScaleKind =
  | 'major'
  | 'minor'
  | 'majorPentatonic'
  | 'minorPentatonic'
  | 'majorBlues'
  | 'minorBlues';

/** The scale kinds a step's scale is read as, by its intervals from the tonic. */
const SCALE_INTERVALS: [ScaleKind, readonly number[]][] = [
  ['major', [0, 2, 4, 5, 7, 9, 11]],
  ['minor', [0, 2, 3, 5, 7, 8, 10]], // natural
  ['minor', [0, 2, 3, 5, 7, 8, 11]], // harmonic
  ['minor', [0, 2, 3, 5, 7, 9, 11]], // melodic, ascending
  ['majorPentatonic', [0, 2, 4, 7, 9]],
  ['minorPentatonic', [0, 3, 5, 7, 10]],
  ['majorBlues', [0, 2, 3, 4, 7, 9]],
  ['minorBlues', [0, 3, 5, 6, 7, 10]],
];

/** Pitch classes C = 0 … B = 11, by key name. */
const PC: Record<string, number> = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

/** "C G D A E" → { 0: f, 7: f, … }. */
const keys = (names: string, fingers: string) =>
  Object.fromEntries(names.split(' ').map((k) => [PC[k], fingers]));

const TABLES: Record<
  ScaleKind,
  Partial<Record<Hand, Record<number, string>>>
> = {
  major: {
    rh: {
      ...keys('C G D A E B', '12312345'),
      ...keys('Gb', '23412312'),
      ...keys('Db', '23123412'),
      ...keys('Ab', '34123123'),
      ...keys('Eb', '31234123'),
      ...keys('Bb', '41231234'),
      ...keys('F', '12341234'),
    },
    lh: {
      ...keys('C G D A E F', '54321321'),
      ...keys('B', '43214321'),
      ...keys('Gb', '43213214'),
      ...keys('Db Ab Eb Bb', '32143213'),
    },
  },
  minor: {
    rh: {
      ...keys('A E B D G C', '12312345'),
      ...keys('F', '12341234'),
      ...keys('Gb Db Ab', '34123123'), // F♯, C♯, G♯ minor
      ...keys('Eb', '31234123'), // D♯ / E♭ minor
      ...keys('Bb', '21231234'),
    },
    lh: {
      ...keys('A E D G C F', '54321321'),
      ...keys('B', '43214321'),
      ...keys('Gb', '43213214'), // F♯ minor
      ...keys('Db', '32143213'), // C♯ minor
      ...keys('Ab', '32132143'), // G♯ minor
      ...keys('Eb', '21432132'), // D♯ minor
      ...keys('Bb', '21321432'),
    },
  },
  // Peter: "123 12(3) for all white note keys and Bb min, Eb min, and
  // F# maj"; A♭ and D♭ major 2 3 1 2 3 (4).
  majorPentatonic: {
    rh: {
      ...keys('C D E F G A B Gb', '123123'),
      ...keys('Bb Eb', '212312'),
      ...keys('Ab Db', '231234'),
    },
  },
  minorPentatonic: {
    rh: {
      ...keys('C D E F G A B Bb Eb', '123123'),
      ...keys('Db Ab Gb', '212312'), // C♯, G♯, F♯ minor
    },
  },
  minorBlues: {
    rh: {
      ...keys('C F Bb Eb B', '1231234'),
      ...keys('G D A E', '1234123'),
      ...keys('Gb Db Ab', '2121234'),
    },
  },
  majorBlues: {
    rh: {
      ...keys('C F G', '1231234'),
      ...keys('D E A', '1234123'),
      ...keys('B', '1212345'),
      ...keys('Bb Eb', '2121234'),
      ...keys('Ab Db', '2312312'),
      ...keys('Gb', '2312345'),
    },
  },
};

export interface ScaleTable {
  kind: ScaleKind;
  /** The scale's pitch classes, ascending from the tonic. */
  pcs: number[];
  /** One finger per degree plus the octave (see the file note). */
  fingers: PianoFinger[];
}

/** The scale the step's pitch classes make on the tonic, if it is one we read. */
export function scaleKindOf(
  tonicPc: number,
  scalePcs: readonly number[],
): ScaleKind | null {
  const rel = [
    ...new Set(scalePcs.map((pc) => (((pc - tonicPc) % 12) + 12) % 12)),
  ]
    .sort((a, b) => a - b)
    .join(',');
  for (const [kind, intervals] of SCALE_INTERVALS)
    if (intervals.join(',') === rel) return kind;
  return null;
}

/** The fingering table for this scale, key and hand, if there is one. */
export function scaleTable(
  tonicPc: number,
  scalePcs: readonly number[],
  hand: Hand,
): ScaleTable | null {
  const tonic = ((tonicPc % 12) + 12) % 12;
  const kind = scaleKindOf(tonic, scalePcs);
  if (!kind) return null;
  const digits = TABLES[kind][hand]?.[tonic];
  if (!digits) return null;
  const pcs = [
    ...new Set(scalePcs.map((pc) => (((pc - tonic) % 12) + 12) % 12)),
  ]
    .sort((a, b) => a - b)
    .map((i) => (tonic + i) % 12);
  return {
    kind,
    pcs,
    fingers: [...digits].map((d) => Number(d) as PianoFinger),
  };
}

/**
 * The table's finger for one note of a run. `end` says the note is where the
 * run starts or stops at its top (right hand) or bottom (left hand).
 */
export function tableFinger(
  table: ScaleTable,
  pc: number,
  hand: Hand,
  end: boolean,
): PianoFinger | null {
  const degree = table.pcs.indexOf(((pc % 12) + 12) % 12);
  if (degree < 0) return null;
  const last = table.fingers.length - 1;
  if (hand === 'rh')
    return degree === 0 && end ? table.fingers[last] : table.fingers[degree];
  if (degree > 0) return table.fingers[degree];
  return end ? table.fingers[0] : table.fingers[last];
}
