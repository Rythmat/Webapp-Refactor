/**
 * The Music Literacy editor's two ways of writing a segment, as chips: the
 * words (one chip per syllable, typed as a line of text) and a figure (a
 * row of notes and rests). Both are views of the stored notes, which are
 * ticks from the segment's start with rests as the gaps, and each turns
 * back into exactly the notes it came from. Chips are dragged into a new
 * order (`moveItem`, `moveSyllable`), and a rest goes before or after a
 * note as the gap on that side of it (`insertRest`, `withRestBefore`).
 *
 * No React here.
 */

import {
  LITERACY_TPQ,
  type LiteracyDegree,
  type LiteracyNote,
  type LiteracyWord,
} from '@/content/musicLiteracy/schemas';
import { barTicks } from '@/curriculum/engine/musicLiteracy/literacy';

// ── Lengths ────────────────────────────────────────────────────────────────

export type NoteShape = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export interface NoteLength {
  ticks: number;
  label: string;
  shape: NoteShape;
  dotted: boolean;
}

const Q = LITERACY_TPQ;

/** The lengths a chip offers, shortest first. */
export const NOTE_LENGTHS: readonly NoteLength[] = [
  { ticks: Q / 4, label: '16th', shape: 'sixteenth', dotted: false },
  { ticks: Q / 2, label: 'Eighth', shape: 'eighth', dotted: false },
  { ticks: (Q * 3) / 4, label: 'Dotted eighth', shape: 'eighth', dotted: true },
  { ticks: Q, label: 'Quarter', shape: 'quarter', dotted: false },
  {
    ticks: (Q * 3) / 2,
    label: 'Dotted quarter',
    shape: 'quarter',
    dotted: true,
  },
  { ticks: Q * 2, label: 'Half', shape: 'half', dotted: false },
  { ticks: Q * 3, label: 'Dotted half', shape: 'half', dotted: true },
  { ticks: Q * 4, label: 'Whole', shape: 'whole', dotted: false },
];

/** Lengths the piano roll can make that no chip offers, named all the same. */
const OTHER_LENGTHS: Record<number, string> = {
  [Q / 6]: '16th triplet',
  [Q / 3]: 'Eighth triplet',
  [(Q * 2) / 3]: 'Quarter triplet',
};

export const lengthOf = (ticks: number): NoteLength | undefined =>
  NOTE_LENGTHS.find((length) => length.ticks === ticks);

/**
 * "Quarter", "Eighth triplet", a length two chips' worth ("Quarter + 16th",
 * as two rests in a row read back), or else the ticks.
 */
export function lengthLabel(ticks: number): string {
  const named = lengthOf(ticks)?.label ?? OTHER_LENGTHS[ticks];
  if (named) return named;
  const longest = [...NOTE_LENGTHS]
    .reverse()
    .find((length) => length.ticks < ticks);
  const rest = longest && lengthOf(ticks - longest.ticks);
  return longest && rest
    ? `${longest.label} + ${rest.label.toLowerCase()}`
    : `${ticks} ticks`;
}

/** A span in words a teacher counts in: "2 beats", "1 bar and an eighth". */
export function spanWords(
  ticks: number,
  timeSignature: readonly [number, number],
): string {
  const bar = barTicks(timeSignature);
  const beat = (Q * 4) / timeSignature[1];
  const bars = Math.floor(ticks / bar);
  const rest = ticks - bars * bar;
  const beats = Math.floor(rest / beat);
  const part = rest - beats * beat;
  const words: string[] = [];
  if (bars) words.push(`${bars} bar${bars === 1 ? '' : 's'}`);
  if (beats) words.push(`${beats} beat${beats === 1 ? '' : 's'}`);
  if (part) {
    const label = lengthLabel(part).toLowerCase();
    words.push(`${/^[aeiou]/.test(label) ? 'an' : 'a'} ${label}`);
  }
  return words.length ? words.join(' and ') : 'nothing';
}

// ── Positions ──────────────────────────────────────────────────────────────

/**
 * Where a tick falls, as a teacher counts it: "1·1" is the first beat of the
 * first bar, "2·3&" the "and" of beat 3 in bar 2 ("1 e & a"; triplets are
 * "trip" and "let").
 */
export function barBeat(
  tick: number,
  timeSignature: readonly [number, number],
): string {
  const bar = barTicks(timeSignature);
  const beat = (Q * 4) / timeSignature[1];
  const inBar = tick % bar;
  const sub = (inBar % beat) / beat;
  const suffix =
    sub === 0
      ? ''
      : sub === 0.25
        ? 'e'
        : sub === 0.5
          ? '&'
          : sub === 0.75
            ? 'a'
            : Math.abs(sub - 1 / 3) < 1e-9
              ? 'trip'
              : Math.abs(sub - 2 / 3) < 1e-9
                ? 'let'
                : '+';
  return `${Math.floor(tick / bar) + 1}·${Math.floor(inBar / beat) + 1}${suffix}`;
}

/** Where a segment's last note ends, in ticks from its start. */
export const notesEnd = (
  notes: readonly Pick<LiteracyNote, 'tick' | 'duration'>[],
): number => notes.reduce((end, n) => Math.max(end, n.tick + n.duration), 0);

/** How far the notes run past the segment's bars; 0 when they fit. */
export function overrun(
  notes: readonly Pick<LiteracyNote, 'tick' | 'duration'>[],
  bars: number,
  timeSignature: readonly [number, number],
): number {
  return Math.max(0, notesEnd(notes) - bars * barTicks(timeSignature));
}

/** Whether a note starts before the one ahead of it ends (a chord, say). */
export function overlaps(
  notes: readonly Pick<LiteracyNote, 'tick' | 'duration'>[],
): boolean {
  const sorted = byTick(notes);
  return sorted.some(
    (n, i) => i > 0 && n.tick < sorted[i - 1].tick + sorted[i - 1].duration,
  );
}

/** In time order; notes at one tick keep their order. */
const byTick = <T extends { tick: number }>(notes: readonly T[]): T[] =>
  [...notes].sort((a, b) => a.tick - b.tick);

// ── Reordering ─────────────────────────────────────────────────────────────

/** The items with the one at `from` taken out and put back in at `to`. */
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

/**
 * Where an item ends up when it is dropped in the gap before `slot` (the
 * item count: after the last), so `moveItem(items, from, dropIndex(...))`.
 */
export const dropIndex = (from: number, slot: number): number =>
  slot > from ? slot - 1 : slot;

/** A note as stored: the octave left out when it is the tonic's own. */
function stored(degree: LiteracyDegree, octave: number) {
  return octave ? { degree, octave } : { degree };
}

// ── Figures: notes and rests ───────────────────────────────────────────────

export type FigureChip =
  | { kind: 'note'; degree: LiteracyDegree; octave: number; duration: number }
  | { kind: 'rest'; duration: number };

/**
 * A figure's notes as a row of chips: a rest for every gap, then each note.
 * Trailing rests are the figure's bars, so none is made after the last.
 */
export function figureChips(notes: readonly LiteracyNote[]): FigureChip[] {
  const chips: FigureChip[] = [];
  let at = 0;
  for (const note of byTick(notes)) {
    if (note.tick > at) chips.push({ kind: 'rest', duration: note.tick - at });
    chips.push({
      kind: 'note',
      degree: note.degree,
      octave: note.octave ?? 0,
      duration: note.duration,
    });
    at = Math.max(at, note.tick + note.duration);
  }
  return chips;
}

/** The chips back as notes: each starts where the chip before it ends. */
export function figureNotes(chips: readonly FigureChip[]): LiteracyNote[] {
  const notes: LiteracyNote[] = [];
  let at = 0;
  for (const chip of chips) {
    if (chip.kind === 'note')
      notes.push({
        tick: at,
        duration: chip.duration,
        ...stored(chip.degree, chip.octave),
      });
    at += chip.duration;
  }
  return notes;
}

/** A rest of `ticks` put in among a figure's chips, before chip `at`. */
export function insertRest(
  chips: readonly FigureChip[],
  at: number,
  ticks: number,
): FigureChip[] {
  return [
    ...chips.slice(0, at),
    { kind: 'rest', duration: ticks },
    ...chips.slice(at),
  ];
}

/** Where each chip starts, in ticks from the segment's start. */
export function chipStarts(chips: readonly { duration: number }[]): number[] {
  let at = 0;
  return chips.map((chip) => {
    const start = at;
    at += chip.duration;
    return start;
  });
}

// ── Words: syllables on notes ──────────────────────────────────────────────

export interface Syllable {
  text: string;
  degree: LiteracyDegree;
  octave: number;
  duration: number;
  /**
   * The rest after it, in ticks: 0 for none. The same gap is the next
   * syllable's rest before it (`restBefore`).
   */
  rest: number;
}

export interface WordsLine {
  /** A rest before the first syllable (a pickup), in ticks: 0 for none. */
  lead: number;
  syllables: Syllable[];
}

/**
 * The words as a line of syllables. A syllable's rest is the gap to the
 * next one, so a line always turns back into the same ticks (two that
 * overlap have a rest below zero, which the editor warns of).
 */
export function wordsLine(notes: readonly LiteracyWord[]): WordsLine {
  const sorted = byTick(notes);
  return {
    lead: sorted[0]?.tick ?? 0,
    syllables: sorted.map((note, i) => ({
      text: note.text,
      degree: note.degree,
      octave: note.octave ?? 0,
      duration: note.duration,
      rest:
        i + 1 < sorted.length
          ? sorted[i + 1].tick - note.tick - note.duration
          : 0,
    })),
  };
}

export function wordsNotes(line: WordsLine): LiteracyWord[] {
  let at = line.lead;
  return line.syllables.map((s) => {
    const note = {
      tick: at,
      duration: s.duration,
      ...stored(s.degree, s.octave),
      text: s.text,
    };
    at += s.duration + s.rest;
    return note;
  });
}

/**
 * The rest ahead of a syllable, the gap before it as stored: the line's
 * lead for the first, else the rest after the one before it. (A rest after
 * one syllable and a rest before the next are the same gap.)
 */
export const restBefore = (line: WordsLine, index: number): number =>
  index === 0 ? line.lead : (line.syllables[index - 1]?.rest ?? 0);

/** The line with the rest ahead of a syllable made `ticks` long. */
export function withRestBefore(
  line: WordsLine,
  index: number,
  ticks: number,
): WordsLine {
  if (index === 0) return { ...line, lead: ticks };
  return {
    ...line,
    syllables: line.syllables.map((s, i) =>
      i === index - 1 ? { ...s, rest: ticks } : s,
    ),
  };
}

/**
 * The line with one syllable moved to `to`, its note, its length and the
 * rest ahead of it going with it, so the line lasts as long as it did and
 * no rest is lost. The first syllable's rest ahead of it is the line's lead.
 */
export function moveSyllable(
  line: WordsLine,
  from: number,
  to: number,
): WordsLine {
  const moved = moveItem(
    line.syllables.map((s, i) => ({ s, before: restBefore(line, i) })),
    from,
    to,
  );
  return {
    // Overlapping syllables (from the roll) have a rest below zero; the
    // line can't start before its first beat.
    lead: Math.max(0, moved[0]?.before ?? 0),
    syllables: moved.map(({ s }, i) => ({
      ...s,
      rest: moved[i + 1]?.before ?? 0,
    })),
  };
}

/** Where each syllable starts, in ticks from the segment's start. */
export function syllableStarts(line: WordsLine): number[] {
  let at = line.lead;
  return line.syllables.map((s) => {
    const start = at;
    at += s.duration + s.rest;
    return start;
  });
}

/**
 * The line typed as text, split into syllables: words by spaces, syllables
 * within a word by hyphens ("gon-na" is two). A syllable that runs on into
 * the next keeps its hyphen ("gon-", "na"), so the word reads whole again
 * here and in Learn. Empty pieces are dropped.
 */
export function splitSyllables(text: string): string[] {
  return text.split(/\s+/).flatMap((word) => {
    const pieces = word.split('-').filter(Boolean);
    return pieces.map((piece, i) =>
      i < pieces.length - 1 ? `${piece}-` : piece,
    );
  });
}

/** The line as text: a space between words, a syllable ending "-" running on. */
export const lineText = (line: WordsLine): string =>
  line.syllables
    .map((s, i) =>
      i === 0 || line.syllables[i - 1].text.endsWith('-')
        ? s.text
        : ` ${s.text}`,
    )
    .join('');

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * The line retyped. Every syllable keeps its note, its length and its rest
 * when the count is unchanged; otherwise the syllables the old and new
 * lines start and end with keep theirs, and those between take the notes of
 * the ones they replace, in order. A syllable with none to take sings the
 * note before it, as long.
 */
export function retypeLine(line: WordsLine, text: string): WordsLine {
  const next = splitSyllables(text);
  const old = line.syllables;
  if (next.length === old.length)
    return {
      ...line,
      syllables: old.map((s, i) => ({ ...s, text: next[i] })),
    };
  let head = 0;
  while (
    head < Math.min(old.length, next.length) &&
    same(old[head].text, next[head])
  )
    head++;
  let tail = 0;
  while (
    tail < Math.min(old.length, next.length) - head &&
    same(old[old.length - 1 - tail].text, next[next.length - 1 - tail])
  )
    tail++;
  const replaced = old.slice(head, old.length - tail);
  const typed = next.slice(head, next.length - tail);
  const middle: Syllable[] = [];
  typed.forEach((piece, i) => {
    const before = middle[i - 1] ?? old[head - 1] ?? old[0];
    const from: Syllable = replaced[i] ?? {
      text: piece,
      degree: before?.degree ?? '1',
      octave: before?.octave ?? 0,
      duration: before?.duration ?? Q,
      rest: 0,
    };
    middle.push({ ...from, text: piece });
  });
  return {
    ...line,
    syllables: [
      ...old.slice(0, head).map((s, i) => ({ ...s, text: next[i] })),
      ...middle,
      ...old
        .slice(old.length - tail)
        .map((s, i) => ({ ...s, text: next[next.length - tail + i] })),
    ],
  };
}
