// ── Note editor ────────────────────────────────────────────────────────────
// Durations and articulations for selected notes. Durations are written to the
// clip events themselves; articulations are marks the score keeps beside them,
// since a MIDI note has nowhere to put a staccato dot.

/** Note values, numbered as MuseScore numbers them on the top row. */
export interface DurationChoice {
  /** The digit that picks it. */
  key: string;
  name: string;
  /** Quarters the plain (undotted) value lasts. */
  quarters: number;
  /** SMuFL glyph for the toolbar cell. */
  glyph: string;
}

/**
 * Shortest first, as MuseScore orders them, and every stemmed value drawn
 * stem up so the row reads as one sequence.
 *
 * SMuFL lays the individual notes out in (up, down) pairs from U+E1D3, so the
 * stem-up glyph of each value sits on the odd codepoint: half E1D3, quarter
 * E1D5, eighth E1D7, sixteenth E1D9, thirty-second E1DB. Taking the even one
 * by mistake gives the *previous* value's stem-down glyph — E1DA drew the
 * thirty-second as a stem-down sixteenth, which is why the first two cells
 * looked like duplicates.
 */
export const DURATIONS: DurationChoice[] = [
  { key: '2', name: '32nd', quarters: 1 / 8, glyph: '\uE1DB' },
  { key: '3', name: '16th', quarters: 1 / 4, glyph: '\uE1D9' },
  { key: '4', name: 'Eighth', quarters: 1 / 2, glyph: '\uE1D7' },
  { key: '5', name: 'Quarter', quarters: 1, glyph: '\uE1D5' },
  { key: '6', name: 'Half', quarters: 2, glyph: '\uE1D3' },
  { key: '7', name: 'Whole', quarters: 4, glyph: '\uE1D2' },
];

/** Ticks for a choice, with the augmentation dot when asked for. */
export function durationTicks(
  choice: DurationChoice,
  ticksPerQuarter: number,
  dotted: boolean,
): number {
  const plain = choice.quarters * ticksPerQuarter;
  return Math.round(dotted ? plain * 1.5 : plain);
}

/** Which row of the editor is being written into. */
export type NoteLayer = 'notes' | 'rests' | 'slashes';

/** Rest glyphs matching each duration, keyed by its number. */
export const REST_GLYPHS: Record<string, string> = {
  '2': '\uE4E8', // 32nd
  '3': '\uE4E7', // 16th
  '4': '\uE4E6', // eighth
  '5': '\uE4E5', // quarter
  '6': '\uE4F5', // half, on its ledger line (sitting above it)
  '7': '\uE4F4', // whole, on its ledger line (hanging below it)
};

export type ArticulationKind =
  | 'staccato'
  | 'accent'
  | 'marcato'
  | 'tenuto'
  | 'fermata';

export interface ArticulationChoice {
  kind: ArticulationKind;
  name: string;
  /** The key that toggles it on the selection. */
  key: string;
  keyLabel: string;
  /** SMuFL glyph above the notehead. */
  glyph: string;
  /** The same mark drawn below the notehead; several are mirrored. */
  glyphBelow: string;
}

export const ARTICULATIONS: ArticulationChoice[] = [
  {
    kind: 'staccato',
    name: 'Staccato',
    key: '.',
    keyLabel: '.',
    glyph: '\uE4A2',
    glyphBelow: '\uE4A3',
  },
  {
    kind: 'accent',
    name: 'Accent',
    key: '>',
    keyLabel: '>',
    glyph: '\uE4A0',
    glyphBelow: '\uE4A1',
  },
  {
    kind: 'marcato',
    name: 'Marcato',
    key: '-',
    keyLabel: '-',
    glyph: '\uE4AC',
    glyphBelow: '\uE4AD',
  },
  {
    kind: 'tenuto',
    name: 'Tenuto',
    key: '_',
    keyLabel: '_',
    glyph: '\uE4A4',
    glyphBelow: '\uE4A5',
  },
  // A fermata belongs over the note it holds, not over the bar around it.
  {
    kind: 'fermata',
    name: 'Fermata',
    key: ';',
    keyLabel: ';',
    glyph: '\uE4C0',
    glyphBelow: '\uE4C1',
  },
];

/** The middle (third) line of a staff, in VexFlow's line numbering. */
const MIDDLE_LINE = 2;

/**
 * Which side of the notehead a mark belongs on.
 *
 * A stemmed note takes its mark on the side away from the stem: above when
 * the stem points down, below when it points up. A note drawn without a stem
 * — a whole note, a rhythmic slash — takes it above when the notehead is on
 * the middle line or higher, and below when it sits under that line. Ledger
 * lines keep counting, so the rule holds off the staff too.
 */
export function articulationSide(note: {
  stem: 'up' | 'down' | null;
  line: number;
}): 'above' | 'below' {
  if (note.stem === 'down') return 'above';
  if (note.stem === 'up') return 'below';
  return note.line >= MIDDLE_LINE ? 'above' : 'below';
}

/**
 * One mark per chord, not per notehead. A chord is a single rhythmic event,
 * so a staccato belongs to the chord — repeating it beside every notehead is
 * both wrong and unreadable. The mark hangs off the outermost notehead on
 * whichever side `articulationSide` chose, and a chord with no stem decides
 * that side from where it sits as a whole.
 */
export function groupChordArticulations<
  T extends {
    id: string;
    partIndex: number;
    tick: number;
    y: number;
    stem: 'up' | 'down' | null;
    line: number;
  },
>(
  notes: readonly T[],
  marksFor: (noteId: string) => readonly ArticulationKind[],
): Array<{
  key: string;
  note: T;
  side: 'above' | 'below';
  kinds: ArticulationKind[];
}> {
  const chords = new Map<string, T[]>();
  for (const note of notes) {
    const key = `${note.partIndex}:${note.tick}`;
    chords.set(key, [...(chords.get(key) ?? []), note]);
  }
  const out: Array<{
    key: string;
    note: T;
    side: 'above' | 'below';
    kinds: ArticulationKind[];
  }> = [];
  for (const [key, chord] of chords) {
    const kinds: ArticulationKind[] = [];
    for (const note of chord) {
      for (const kind of marksFor(note.id)) {
        if (!kinds.includes(kind)) kinds.push(kind);
      }
    }
    if (kinds.length === 0) continue;
    const meanLine =
      chord.reduce((sum, note) => sum + note.line, 0) / chord.length;
    const side = articulationSide({ stem: chord[0].stem, line: meanLine });
    // Above hangs off the highest notehead, below off the lowest.
    const anchor = chord.reduce((best, note) =>
      side === 'above'
        ? note.y < best.y
          ? note
          : best
        : note.y > best.y
          ? note
          : best,
    );
    out.push({ key, note: anchor, side, kinds });
  }
  return out;
}

/** `noteId|kind`, the way a mark is stored. */
export const articulationKey = (
  noteId: string,
  kind: ArticulationKind,
): string => `${noteId}|${kind}`;

export function parseArticulation(
  entry: string,
): { noteId: string; kind: ArticulationKind } | null {
  const index = entry.lastIndexOf('|');
  if (index < 0) return null;
  return {
    noteId: entry.slice(0, index),
    kind: entry.slice(index + 1) as ArticulationKind,
  };
}

/**
 * Turn a mark on for every selected note, or off when they all have it —
 * the way a toggle behaves in an editor.
 */
export function toggleArticulation(
  current: readonly string[],
  noteIds: Iterable<string>,
  kind: ArticulationKind,
): string[] {
  const ids = [...noteIds];
  if (ids.length === 0) return [...current];
  const set = new Set(current);
  const allOn = ids.every((id) => set.has(articulationKey(id, kind)));
  for (const id of ids) {
    const key = articulationKey(id, kind);
    if (allOn) set.delete(key);
    else set.add(key);
  }
  return [...set];
}

/** The marks on one note. */
export function articulationsFor(
  current: readonly string[],
  noteId: string,
): ArticulationKind[] {
  const kinds: ArticulationKind[] = [];
  for (const entry of current) {
    const parsed = parseArticulation(entry);
    if (parsed?.noteId === noteId) kinds.push(parsed.kind);
  }
  return kinds;
}

/** A note as the tie logic needs to see it. */
export interface TieCandidate {
  id: string;
  partIndex: number;
  tick: number;
  midi: number;
  durationTicks: number;
}

/**
 * The plan for a tie, from whatever is selected: several notes of one pitch
 * join into one, and a single note reaches forward to whatever follows it.
 */
export function planTie(
  selected: readonly TieCandidate[],
  notes: readonly TieCandidate[],
  rests: readonly RestCandidate[],
): TiePlan | null {
  if (selected.length === 1) return tieFromNote(selected[0], notes, rests);
  return tieSpan(selected);
}

/** A written rest, as the tie logic needs to see it. */
export interface RestCandidate {
  partIndex: number;
  tick: number;
  durationTicks: number;
}

export interface TiePlan {
  /** The note that ends up holding the whole span. */
  holdId: string;
  /** Notes absorbed into it; a rest leaves nothing to remove. */
  removeIds: string[];
  durationTicks: number;
}

/**
 * What a tie does from a single selected note, decided by whatever sits
 * immediately after it in the same part:
 *
 *   - the same pitch again → the two become one held note
 *   - a rest → the rest gives way to that pitch for exactly its own length
 *   - anything else (a different pitch, or nothing) → no tie
 *
 * Extending the note is how both are written: the notation engine splits a
 * long note back across the beat and ties the pieces, so filling a rest and
 * tying to a neighbour produce the same picture as well as the same sound.
 */
export function tieFromNote(
  note: TieCandidate,
  notes: readonly TieCandidate[],
  rests: readonly RestCandidate[],
): TiePlan | null {
  const end = note.tick + note.durationTicks;

  const restAfter = rests.find(
    (rest) => rest.partIndex === note.partIndex && rest.tick === end,
  );
  if (restAfter) {
    return {
      holdId: note.id,
      removeIds: [],
      durationTicks: note.durationTicks + restAfter.durationTicks,
    };
  }

  const nextAfter = notes
    .filter((other) => other.partIndex === note.partIndex && other.tick === end)
    .sort(
      (a, b) => Math.abs(a.midi - note.midi) - Math.abs(b.midi - note.midi),
    )[0];
  if (nextAfter && nextAfter.midi === note.midi) {
    return {
      holdId: note.id,
      removeIds: [nextAfter.id],
      durationTicks: note.durationTicks + nextAfter.durationTicks,
    };
  }

  return null;
}

/**
 * A tie joins notes of the same pitch into one sound, so it changes the music
 * rather than marking it: the first note is held through the last, and the
 * ones it swallows go away. (A slur only says how notes are played, so it
 * leaves them alone.) Notes of different pitches cannot be tied.
 */
export function tieSpan(
  notes: readonly TieCandidate[],
): { holdId: string; removeIds: string[]; durationTicks: number } | null {
  if (notes.length < 2) return null;
  const ordered = [...notes].sort((a, b) => a.tick - b.tick);
  const [first, ...rest] = ordered;
  if (
    rest.some((n) => n.midi !== first.midi || n.partIndex !== first.partIndex)
  ) {
    return null;
  }
  const last = ordered[ordered.length - 1];
  const end = last.tick + last.durationTicks;
  if (end <= first.tick) return null;
  return {
    holdId: first.id,
    removeIds: rest.map((n) => n.id),
    durationTicks: end - first.tick,
  };
}

/** `fromId|toId`, the way a slur is stored. */
export const slurKey = (fromId: string, toId: string): string =>
  `${fromId}|${toId}`;

export function parseSlur(
  entry: string,
): { fromId: string; toId: string } | null {
  const index = entry.lastIndexOf('|');
  if (index < 0) return null;
  return { fromId: entry.slice(0, index), toId: entry.slice(index + 1) };
}

/** Slur the selection from its first note to its last, or remove that slur. */
export function toggleSlur(
  current: readonly string[],
  fromId: string,
  toId: string,
): string[] {
  if (fromId === toId) return [...current];
  const key = slurKey(fromId, toId);
  return current.includes(key)
    ? current.filter((entry) => entry !== key)
    : [...current, key];
}

/**
 * Follow marks onto the notes' new ids after an edit moved them. Without
 * this a staccato would fall off the moment its note was dragged.
 */
export function remapNoteIds(
  entries: readonly string[],
  rename: ReadonlyMap<string, string>,
): string[] {
  if (rename.size === 0) return [...entries];
  const moved = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    const index = entry.lastIndexOf('|');
    if (index < 0) continue;
    const head = entry.slice(0, index);
    const tail = entry.slice(index + 1);
    const nextHead = rename.get(head) ?? head;
    const nextTail = rename.get(tail) ?? tail;
    const next = `${nextHead}|${nextTail}`;
    if (moved.has(next)) continue;
    moved.add(next);
    out.push(next);
  }
  return out;
}

/** Drop every mark belonging to notes that are gone. */
export function dropNoteIds(
  entries: readonly string[],
  removed: ReadonlySet<string>,
): string[] {
  return entries.filter((entry) => {
    const index = entry.lastIndexOf('|');
    if (index < 0) return false;
    return (
      !removed.has(entry.slice(0, index)) &&
      !removed.has(entry.slice(index + 1))
    );
  });
}

// ── Accidentals ────────────────────────────────────────────────────────────
// An accidental is not decoration: writing a sharp on a C means the note now
// sounds a semitone higher. So applying one moves the pitch and pins the
// spelling, and the engraver draws the symbol itself — sized to the notehead,
// set just left of it, and kept clear of its neighbours — because the note
// genuinely carries that alteration.

export type AccidentalKind =
  | 'sharp'
  | 'flat'
  | 'natural'
  | 'doubleSharp'
  | 'doubleFlat';

export interface AccidentalChoice {
  kind: AccidentalKind;
  name: string;
  /** Semitones away from the plain letter. */
  alteration: -2 | -1 | 0 | 1 | 2;
  /** SMuFL glyph for the toolbar cell. */
  glyph: string;
}

export const ACCIDENTALS: AccidentalChoice[] = [
  { kind: 'sharp', name: 'Sharp', alteration: 1, glyph: '' },
  { kind: 'flat', name: 'Flat', alteration: -1, glyph: '' },
  { kind: 'natural', name: 'Natural', alteration: 0, glyph: '' },
  { kind: 'doubleSharp', name: 'Double sharp', alteration: 2, glyph: '' },
  { kind: 'doubleFlat', name: 'Double flat', alteration: -2, glyph: '' },
];

/** Semitones above C for each letter. */
const LETTER_SEMITONES: Record<string, number> = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
};

const ALTERATION_SIGN: Record<number, string> = {
  [-2]: '𝄫',
  [-1]: '♭',
  0: '',
  1: '♯',
  2: '𝄪',
};

/** A note as the accidental logic needs to see it: how it is written. */
export interface SpelledNote {
  /** 'c' … 'b' — the letter the notehead sits on, which never changes. */
  letter: string;
  /** Octave of the written letter; C♭5 sounds as MIDI 71. */
  octave: number;
  /** Semitones the note currently carries, from the key or a written sign. */
  alteration: number;
}

/**
 * Where the note lands when its letter takes `alteration`. The notehead stays
 * on its line — an accidental never moves a note up or down the staff — so the
 * letter and octave are kept and only the pitch moves.
 */
export function accidentalPitch(note: SpelledNote, alteration: number): number {
  const semitone = LETTER_SEMITONES[note.letter.toLowerCase()] ?? 0;
  return (note.octave + 1) * 12 + semitone + alteration;
}

/** How the note is written once it takes `alteration` — "C♯4", "E𝄫3". */
export function accidentalSpelling(
  note: SpelledNote,
  alteration: number,
): string {
  const letter = note.letter.toUpperCase();
  return `${letter}${ALTERATION_SIGN[alteration] ?? ''}${note.octave}`;
}

/**
 * Nothing to do when the note already carries this alteration, so the cell
 * reads as pressed rather than rewriting the same pitch.
 */
export const hasAccidental = (note: SpelledNote, alteration: number): boolean =>
  note.alteration === alteration;

/** `noteId|name`, the way a pinned spelling is stored. */
export const spellingKey = (noteId: string, name: string): string =>
  `${noteId}|${name}`;

/** Pinned spellings as a map, newest entry winning. */
export function spellingMap(entries: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    const index = entry.lastIndexOf('|');
    if (index < 0) continue;
    map.set(entry.slice(0, index), entry.slice(index + 1));
  }
  return map;
}

/** Replace the pinned spelling for one note, dropping any it had. */
export function withSpelling(
  entries: readonly string[],
  noteId: string,
  name: string,
): string[] {
  const kept = entries.filter((entry) => {
    const index = entry.lastIndexOf('|');
    return index < 0 || entry.slice(0, index) !== noteId;
  });
  return [...kept, spellingKey(noteId, name)];
}

/** Letter index, 'c' … 'b' → 0 … 6, the order a key signature is stored in. */
export const letterIndex = (letter: string): number =>
  'cdefgab'.indexOf(letter.toLowerCase());

/**
 * What a note goes back to when its accidental is taken off: whatever the key
 * signature says that letter is. In C major a sharpened C returns to C; in D
 * major it returns to C♯, because that is what the key already writes and no
 * sign is printed for it.
 */
export function keyAlterationFor(
  letter: string,
  signature: readonly number[],
): number {
  const index = letterIndex(letter);
  return index < 0 ? 0 : (signature[index] ?? 0);
}

/**
 * The alteration a click on `alteration` should write: the accidental itself,
 * or — when every selected note already carries it — the key's own, which
 * takes the accidental back off.
 */
export function toggledAlteration(
  notes: readonly SpelledNote[],
  alteration: number,
  signature: readonly number[],
): Map<string, number> {
  const allCarry =
    notes.length > 0 && notes.every((note) => note.alteration === alteration);
  const next = new Map<string, number>();
  for (const note of notes) {
    next.set(
      note.letter,
      allCarry ? keyAlterationFor(note.letter, signature) : alteration,
    );
  }
  return next;
}
