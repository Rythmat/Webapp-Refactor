/**
 * part.ts — instrumental parts: the Parts Library's one format for every
 * instrument (piano, bass, guitar, drums), from a basic two-bar bass line to a
 * pro comping figure.
 *
 * A part is real MIDI notes at PPQ 480 plus the key they are written in.
 * Transposing is a shift from that key, so nothing is lost — chromatic notes,
 * passing tones and MIDI imports survive exactly — and spelling comes from the
 * key. This is the note grid lesson steps (TargetNote), Studio clips
 * (MidiNoteEvent) and MIDI files already share, so moving a part between them
 * is a field rename, not a conversion.
 *
 * No audio and no React here.
 */

export const PPQ = 480;

export type PartInstrument = 'piano' | 'bass' | 'guitar' | 'drums';

export const PART_INSTRUMENTS: { id: PartInstrument; label: string }[] = [
  { id: 'piano', label: 'Piano' },
  { id: 'bass', label: 'Bass' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'drums', label: 'Drums' },
];

/** What the part does in a band. */
export type PartRole =
  | 'melody'
  | 'comping'
  | 'two-hand'
  | 'bassline'
  | 'riff'
  | 'groove'
  | 'fill';

export const PART_ROLES: { id: PartRole; label: string }[] = [
  { id: 'melody', label: 'Melody' },
  { id: 'comping', label: 'Comping / chords' },
  { id: 'two-hand', label: 'Two-hand' },
  { id: 'bassline', label: 'Bass line' },
  { id: 'riff', label: 'Riff' },
  { id: 'groove', label: 'Groove' },
  { id: 'fill', label: 'Fill' },
];

/** Basic → pro. Lessons' L1–L3 map onto 1–3. */
export type PartLevel = 1 | 2 | 3 | 4 | 5;

export const PART_LEVELS: { id: PartLevel; label: string }[] = [
  { id: 1, label: 'Basic' },
  { id: 2, label: 'Developing' },
  { id: 3, label: 'Intermediate' },
  { id: 4, label: 'Advanced' },
  { id: 5, label: 'Pro' },
];

/**
 * A note keeps where it is WRITTEN and how it was PLAYED as separate things.
 * `tick` is the written position — what notation, the piano roll's grid and a
 * beginner's grading read. `offset` is the played feel on top of it — what
 * playback and advanced grading use. A pro's lay-back survives without
 * turning the notation into unreadable 64ths.
 */
export interface PartNote {
  /** Written position: ticks from the start of the part, PPQ 480. */
  tick: number;
  /** Ticks. */
  duration: number;
  /** Sounding pitch. */
  midi: number;
  /** 1–127. */
  velocity: number;
  /** Piano: which hand plays it. */
  hand?: 'lh' | 'rh';
  /** Guitar/bass tab: string (1 = highest) and fret, when authored. */
  string?: number;
  fret?: number;
  /**
   * Played feel: ticks from `tick` to where it really sounds (negative =
   * ahead). Absent = played as written.
   */
  offset?: number;
  /**
   * A grace note: written at its main note's tick, played `offset` ticks
   * before it, drawn small. Graded as decoration until a level makes it the
   * point.
   */
  grace?: boolean;
  /** Fingering: 1–5 (thumb = 1). */
  finger?: number;
}

/** Where a note sounds: written position plus feel. */
export const playedTick = (n: Pick<PartNote, 'tick' | 'offset'>) =>
  n.tick + (n.offset ?? 0);

/**
 * A played position as written + feel: the nearest `grid` line within
 * `window` ticks, the difference kept as the offset. Further than that it is
 * written where it was played — a deliberate off-grid note, not feel.
 */
export function splitPlayed(
  played: number,
  grid: number,
  window = grid / 2,
): { tick: number; offset?: number } {
  if (grid <= 0) return { tick: Math.max(0, Math.round(played)) };
  const tick = Math.max(0, Math.round(played / grid) * grid);
  const offset = Math.round(played - tick);
  if (Math.abs(offset) > window)
    return { tick: Math.max(0, Math.round(played)) };
  return offset ? { tick, offset } : { tick };
}

export interface PartKey {
  /** Tonic pitch class, 0–11 (C = 0). */
  tonic: number;
  /** Prism mode name — 'dorian', 'ionian'… (what the Studio colours in). */
  mode: string;
}

export type PartSource =
  | {
      kind: 'lesson';
      genre: string;
      level: number;
      section: string;
      stepNumber: number;
      title?: string;
      /** The step's tag, to check it is still the same step. */
      tag?: string;
      /** Which variant's notes, when not the step's own. */
      variant?: number;
      /** Which hand(s) were taken; writing back replaces only these. */
      hands?: 'both' | 'rh' | 'lh';
      /** Ticks the notes were moved back by (the lesson's count-in bar). */
      tickOffset?: number;
    }
  | { kind: 'midi'; fileName: string; track?: string }
  | { kind: 'scratch' };

export interface InstrumentPart {
  /** File name and Cortex slug: kebab-case (`part:funk-l2-b3-am9`). */
  id: string;
  name: string;
  description?: string;
  instrument: PartInstrument;
  role: PartRole;
  /** Genre id as lessons use them: 'funk', 'hip-hop'… */
  genre?: string;
  /** Finer style inside the genre: 'Meters', 'boom bap'. */
  style?: string;
  level: PartLevel;
  tags: string[];
  /** Studio and lessons only ever see 'live' parts. */
  status: 'draft' | 'live';
  key: PartKey;
  timeSignature: [number, number];
  /** Length in bars; the part loops at this length. */
  bars: number;
  /** Quarter-note bpm it was written at. */
  tempo: number;
  /** 16th swing, 50 straight … 75 (engine/genreGeneration/swing.ts). */
  swing: number;
  /**
   * A feel profile (parts/feel.ts) applied on top of the written notes —
   * "this bass line, in Bahia feel". Notes' own offsets win over it.
   */
  feel?: string;
  /** The harmony it was written over, one symbol per bar — context only. */
  chordSymbols?: string[];
  /**
   * The Studio sound it plays on: an InstrumentType, optionally with a bass
   * voice ('bass-electric:finger').
   */
  sound: string;
  notes: PartNote[];
  source: PartSource;
}

// ── Lengths ────────────────────────────────────────────────────────────────

export function barTicks([top, bottom]: [number, number]): number {
  return Math.round((top * PPQ * 4) / bottom);
}

export function partTicks(
  part: Pick<InstrumentPart, 'timeSignature' | 'bars'>,
) {
  return barTicks(part.timeSignature) * part.bars;
}

/** Bars a set of notes needs, rounded up to a whole bar (at least one). */
export function barsSpanned(
  notes: readonly Pick<PartNote, 'tick' | 'duration'>[],
  timeSignature: [number, number] = [4, 4],
): number {
  const end = notes.reduce((m, n) => Math.max(m, n.tick + n.duration), 0);
  return Math.max(1, Math.ceil((end - 1) / barTicks(timeSignature)));
}

// ── Keys and transposition ─────────────────────────────────────────────────

export const PITCH_NAMES = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'G♭',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];

export const MODES = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
];

export function keyLabel(key: PartKey): string {
  return `${PITCH_NAMES[((key.tonic % 12) + 12) % 12]} ${key.mode}`;
}

/**
 * The shift from one tonic to another that moves the part least: −6 … +5
 * semitones, so a part never jumps most of an octave to change key.
 */
export function shiftBetween(fromTonic: number, toTonic: number): number {
  const up = (((toTonic - fromTonic) % 12) + 12) % 12;
  return up > 5 ? up - 12 : up;
}

/**
 * Where an instrument's figure may sit, as MIDI notes. A transposed figure
 * that leaves it moves by octaves as one unit — never note by note — so voice
 * leading survives (the chord/bass register rule: chords ≤ C5, bass ≤ C4).
 */
const REGISTER: Partial<Record<PartInstrument, { low: number; high: number }>> =
  {
    bass: { low: 28, high: 60 }, // E1 … C4
    guitar: { low: 40, high: 88 }, // E2 … E6
  };

function fitRegister(notes: PartNote[], instrument: PartInstrument) {
  const range = REGISTER[instrument];
  if (!range || notes.length === 0) return notes;
  const lo = Math.min(...notes.map((n) => n.midi));
  const hi = Math.max(...notes.map((n) => n.midi));
  let shift = 0;
  while (hi + shift > range.high && lo + shift - 12 >= range.low) shift -= 12;
  while (lo + shift < range.low && hi + shift + 12 <= range.high) shift += 12;
  return shift === 0
    ? notes
    : notes.map((n) => ({ ...n, midi: n.midi + shift }));
}

/**
 * The part in another key: every note moved by the nearest shift, the figure
 * kept in its instrument's register, the mode carried over unless given.
 * Drums don't transpose. Tab positions are dropped — a fingering for one key
 * is not a fingering for another; the tab view re-derives them.
 */
export function transposePart(
  part: InstrumentPart,
  toTonic: number,
  toMode: string = part.key.mode,
): InstrumentPart {
  if (part.instrument === 'drums') return part;
  const shift = shiftBetween(part.key.tonic, toTonic);
  const moved = part.notes.map(({ string: _s, fret: _f, ...n }) => ({
    ...n,
    midi: n.midi + shift,
  }));
  return {
    ...part,
    key: { tonic: ((toTonic % 12) + 12) % 12, mode: toMode },
    notes: fitRegister(shift === 0 ? part.notes : moved, part.instrument),
  };
}

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_SOUND: Record<PartInstrument, string> = {
  piano: 'piano-sampler',
  bass: 'bass-electric:finger',
  guitar: 'soundfont:27',
  drums: 'drum-machine:natural',
};

export function blankPart(
  id: string,
  name: string,
  instrument: PartInstrument = 'piano',
): InstrumentPart {
  return {
    id,
    name,
    instrument,
    role: instrument === 'bass' ? 'bassline' : 'comping',
    level: 1,
    tags: [],
    status: 'draft',
    key: { tonic: 0, mode: 'ionian' },
    timeSignature: [4, 4],
    bars: 2,
    tempo: 100,
    swing: 50,
    sound: DEFAULT_SOUND[instrument],
    notes: [],
    source: { kind: 'scratch' },
  };
}

/** Ids are file names and Cortex slugs: kebab-case (`ids.ts`). */
export function partIdFrom(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `part-${Date.now().toString(36)}`
  );
}

/** A free id derived from `name`, numbered past any already taken. */
export function uniquePartId(name: string, taken: ReadonlySet<string>) {
  const base = partIdFrom(name);
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

/**
 * The part at a new loop length. Shrinking keeps the notes past the new end
 * (reported, not deleted) so growing back restores them; growing fills each
 * empty new bar by repeating the part.
 */
export function resizePart(part: InstrumentPart, bars: number): InstrumentPart {
  const n = Math.max(1, Math.round(bars));
  if (n <= part.bars) return { ...part, bars: n };
  const barT = barTicks(part.timeSignature);
  const barOf = (tick: number) => Math.floor(tick / barT);
  const filled = new Set(part.notes.map((x) => barOf(x.tick)));
  const notes = [...part.notes];
  for (let bar = part.bars; bar < n; bar++) {
    if (filled.has(bar)) continue;
    const source = bar % part.bars;
    for (const x of part.notes) {
      if (barOf(x.tick) === source)
        notes.push({ ...x, tick: x.tick + (bar - source) * barT });
    }
  }
  return { ...part, bars: n, notes };
}
