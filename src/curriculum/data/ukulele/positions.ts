// ── Ukulele positions ─────────────────────────────────────────────────────
// Where The Ukulele Atlas puts things, as rules every Theory scale can use.
//
// Scale boxes: the book plays every scale on the C, E and A strings and
// marks the re-entrant G string X. A box is a four-fret window starting at
// the tonic's fret on the C string (C 0, G 7, F♯ 6); when that is above the
// 9th fret the window starts a fourth lower, on the 5th (B 6, B♭ 5). Inside
// the window every scale note on those three strings is played, low to
// high. Strings C-E-A step a major third then a fourth, so a four-fret
// window reaches every semitone but one (+8, the E string's fret r+4): a
// scale that needs it (Aeolian's ♭6, harmonic minor's) takes that fret too.
//
// Fingering: the book's hand graphics put one finger per fret from the
// lowest, the G side first on a tie, and lay the index across two or more
// neighbouring strings that share the lowest fret (B 4-3-2-2, D 2-2-2-5).

import { keyPitchClass } from '@/curriculum/data/guitar/bookOne';
import type {
  BookChordQuality,
  GuitarScalePosition,
  GuitarScaleSlot,
} from '@/curriculum/data/guitar/types';
import {
  defaultDiagramStart,
  parseShape,
  shapeNotes,
} from '@/lib/guitar/fretboard';
import { UKULELE, openMidi } from '@/lib/guitar/instrument';
import { chordSemitones } from '@/lib/guitar/theory/chordTones';
import type {
  FingerNumber,
  FretPosition,
  GuitarBarre,
  GuitarFingerPlacement,
  GuitarShapeDiagram,
  GuitarStringNumber,
} from '@/lib/guitar/types';
import { UKULELE_ATLAS_BOOK_ONE } from './bookOne';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The strings a scale box uses, low to high: C, E, A (G is marked X). */
const BOX_STRINGS: readonly GuitarStringNumber[] = [3, 2, 1];

/** Above this C-string fret the box moves a fourth down, onto the 5th. */
export const MAX_WINDOW_FRET = 9;

/** The fret the scale window starts on for a tonic. */
export function windowRoot(tonicPc: number): number {
  const fret = mod12(tonicPc - openMidi(3, UKULELE));
  return fret > MAX_WINDOW_FRET ? fret - 5 : fret;
}

/** The book's top-row fret for each tonic it prints (by pitch class). */
const BOOK_FRET_START = new Map<number, number>(
  Object.values(UKULELE_ATLAS_BOOK_ONE).map((k) => [
    keyPitchClass(k.key),
    k.scaleFretStart,
  ]),
);

/**
 * A scale box: every note of `pcs` in the window for `tonicPc`, C string up
 * to A string, lowest first.
 */
export function ukuleleScaleBox(
  slot: GuitarScaleSlot,
  tonicPc: number,
  pcs: readonly number[],
): GuitarScalePosition {
  const r = windowRoot(tonicPc);
  const want = new Set(pcs.map(mod12));
  const playOrder: FretPosition[] = [];
  for (const string of BOX_STRINGS) {
    // Only the E string reaches past the window (r+4 = +8 from its root).
    const top = string === 2 ? r + 4 : r + 3;
    for (let fret = r; fret <= top; fret++) {
      if (want.has(mod12(openMidi(string, UKULELE) + fret))) {
        playOrder.push({ string, fret });
      }
    }
  }
  const stretched = playOrder.some((p) => p.fret === r + 4);
  const book = BOOK_FRET_START.get(mod12(tonicPc)) ?? Math.max(1, r);
  // The book sometimes leaves a row above the window; a stretched box needs
  // the row below instead.
  const fretStart = stretched ? Math.max(1, r) : book;
  return {
    id: slot,
    fretStart,
    fretEnd: fretStart + 4,
    unusedStrings: [4],
    playOrder,
  };
}

// ── Fingering ─────────────────────────────────────────────────────────────

/**
 * The fingers for a shape, by the book's rule: an index barre across
 * neighbouring strings sharing the lowest fret, then one finger per fret,
 * the G side first on a tie (compressed when that would need a fifth
 * finger).
 */
export function ukuleleFingering(frets: string): {
  fingering: GuitarFingerPlacement[];
  barre?: GuitarBarre;
} {
  const parsed = parseShape(frets, UKULELE);
  const fretted = UKULELE.stringsLowToHigh.flatMap((string, i) => {
    const fret = parsed[i];
    return fret !== null && fret > 0 ? [{ string, fret }] : [];
  });
  if (fretted.length === 0) return { fingering: [] };
  const lo = Math.min(...fretted.map((p) => p.fret));
  const atLo = fretted.filter((p) => p.fret === lo);
  const loStrings = atLo.map((p) => p.string);
  const contiguous =
    atLo.length >= 2 &&
    Math.max(...loStrings) - Math.min(...loStrings) + 1 === atLo.length;

  const fingering: GuitarFingerPlacement[] = [];
  let barre: GuitarBarre | undefined;
  let rest = fretted;
  let base = 1;
  if (contiguous) {
    barre = {
      fret: lo,
      fromString: Math.max(...loStrings) as GuitarStringNumber,
      toString: Math.min(...loStrings) as GuitarStringNumber,
      finger: 1,
    };
    for (const p of atLo) fingering.push({ finger: 1, ...p });
    rest = fretted.filter((p) => p.fret !== lo);
    base = 2;
  }
  // Fret ascending; on a tie the G side (higher string number) first.
  const sorted = [...rest].sort(
    (a, b) => a.fret - b.fret || b.string - a.string,
  );
  const spaced: number[] = [];
  for (const p of sorted) {
    const prev = spaced.length ? spaced[spaced.length - 1] : base - 1;
    spaced.push(Math.max(prev + 1, base + p.fret - (contiguous ? lo + 1 : lo)));
  }
  const fingers = spaced.some((f) => f > 4)
    ? sorted.map((_, i) => base + i)
    : spaced;
  sorted.forEach((p, i) =>
    fingering.push({ finger: fingers[i] as FingerNumber, ...p }),
  );
  return barre ? { fingering, barre } : { fingering };
}

/** A shape as a chord box: its frets, top row, fingers and barre. */
export function ukuleleShape(frets: string): GuitarShapeDiagram {
  return {
    frets,
    diagramStartFret: defaultDiagramStart(frets, UKULELE),
    ...ukuleleFingering(frets),
  };
}

// ── The hand gate ─────────────────────────────────────────────────────────

/** The highest fret a generated grip may use. */
export const MAX_UKULELE_GRIP_FRET = 12;

/**
 * Why a hand could not hold `shape` on a ukulele; empty when it can. Open
 * strings ring for free; fretted notes span at most four frets, take at most
 * four fingers, and the fingers rise with the frets.
 */
export function ukuleleHandProblems(
  shape: GuitarShapeDiagram,
  /**
   * Strings that may be muted (X): the outer G (4) and A (1) strings, which
   * a hand can damp; the book's scale boxes mark the G string so.
   */
  { allowMuted = [] }: { allowMuted?: readonly (1 | 4)[] } = {},
): string[] {
  const problems: string[] = [];
  const parsed = parseShape(shape.frets, UKULELE);
  if (parsed.every((f) => f === null)) return ['sounds nothing'];
  const muted = UKULELE.stringsLowToHigh.filter((_, i) => parsed[i] === null);
  if (muted.some((string) => !(allowMuted as number[]).includes(string))) {
    problems.push('muted string');
  }
  const fretted = UKULELE.stringsLowToHigh.flatMap((string, i) => {
    const fret = parsed[i];
    return fret !== null && fret > 0 ? [{ string, fret }] : [];
  });
  if (fretted.some((p) => p.fret > MAX_UKULELE_GRIP_FRET)) {
    problems.push(`above fret ${MAX_UKULELE_GRIP_FRET}`);
  }
  if (fretted.length > 0) {
    const lo = Math.min(...fretted.map((p) => p.fret));
    const hi = Math.max(...fretted.map((p) => p.fret));
    if (hi - lo > 3) problems.push(`spans ${hi - lo + 1} frets`);
  }
  const fingerOf = (string: GuitarStringNumber, fret: number) =>
    shape.fingering.find((f) => f.string === string && f.fret === fret)
      ?.finger ?? null;
  const reach = new Map<number, number>();
  for (const p of fretted) {
    const finger = fingerOf(p.string, p.fret);
    if (finger === null) {
      problems.push('a note has no finger');
      continue;
    }
    const at = reach.get(finger);
    if (at !== undefined && at !== p.fret) {
      problems.push(`finger ${finger} on two frets`);
    } else if (
      at !== undefined &&
      !(shape.barre?.finger === finger && shape.barre.fret === p.fret)
    ) {
      problems.push(`finger ${finger} holds two strings with no barre`);
    }
    reach.set(finger, p.fret);
  }
  const order = [...reach.entries()].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < order.length; i++) {
    const [fa, a] = order[i - 1];
    const [fb, b] = order[i];
    if (b < a) problems.push(`finger ${fb} below finger ${fa}`);
    if (b - a > fb - fa + 1)
      problems.push(`fingers ${fa}-${fb} stretch too far`);
  }
  return problems;
}

/**
 * Why `shape` is not `quality` on `rootPc` for a ukulele grip; empty when it
 * is. The hand gate, then exactly the chord's notes (a triad doubles one).
 * No root-in-the-bass rule: the re-entrant G has no bass string.
 */
export function ukuleleGripProblems(
  shape: GuitarShapeDiagram,
  rootPc: number,
  quality: BookChordQuality,
): string[] {
  const problems = ukuleleHandProblems(shape);
  if (problems[0] === 'sounds nothing') return problems;
  const want = new Set(chordSemitones(quality).map((s) => mod12(rootPc + s)));
  const have = new Set(
    shapeNotes(shape.frets, UKULELE).map((n) => mod12(n.midi)),
  );
  if (want.size !== have.size || [...want].some((pc) => !have.has(pc))) {
    problems.push(`notes are not ${quality}`);
  }
  return problems;
}
