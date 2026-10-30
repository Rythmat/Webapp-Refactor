// ── Ukulele grips ─────────────────────────────────────────────────────────
// The chord box a ukulele lesson draws for a chord, in this order:
//
// 1. The Ukulele Atlas's own box. A key center plays its page's triads; any
//    other major or minor triad uses the box the book gives it in its home
//    key (a major chord as I of its key, a minor one as vi of its relative
//    major), so C is always 0-0-0-3 and A minor 2-0-0-0.
// 2. Otherwise the most open grip the hand gate passes: every chord tone and
//    no others on the four strings (a triad doubles one), fewest frets up
//    the neck first, then fewest fingers, then the lowest frets overall.
//    That is how ukulele chord charts read: C7 0-0-0-1, Cmaj7 0-0-0-2,
//    Cm7 3-3-3-3, Cdim7 2-3-2-3, Caug 1-0-0-3.

import {
  GUITAR_KEY_ORDER,
  MAJOR_SCALE_STEPS,
  keyPitchClass,
} from '@/curriculum/data/guitar/bookOne';
import type {
  BookChordQuality,
  GuitarKeyName,
} from '@/curriculum/data/guitar/types';
import { formatShape, shapePitchClasses } from '@/lib/guitar/fretboard';
import { UKULELE } from '@/lib/guitar/instrument';
import { chordSemitones } from '@/lib/guitar/theory/chordTones';
import type { GuitarShapeDiagram } from '@/lib/guitar/types';
import { UKULELE_ATLAS_BOOK_ONE } from './bookOne';
import {
  MAX_UKULELE_GRIP_FRET,
  ukuleleGripProblems,
  ukuleleShape,
} from './positions';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The book triad qualities, I ii iii IV V vi. */
const BOOK_QUALITIES: readonly BookChordQuality[] = [
  'maj',
  'min',
  'min',
  'maj',
  'maj',
  'min',
];

/** A triad on a book page: its frets and the erratum it carries. */
export interface BookTriad {
  frets: string;
  erratumId?: string;
}

/** The book page's triad on `rootPc` as `quality`, if the page has one. */
export function pageTriad(
  key: GuitarKeyName,
  rootPc: number,
  quality: BookChordQuality,
): BookTriad | undefined {
  const page = UKULELE_ATLAS_BOOK_ONE[key];
  const tonic = keyPitchClass(key);
  const i = BOOK_QUALITIES.findIndex(
    (q, d) => q === quality && mod12(tonic + MAJOR_SCALE_STEPS[d]) === rootPc,
  );
  if (i < 0) return undefined;
  const erratumId = page.triadErrata?.[i as 0 | 1 | 2 | 3 | 4 | 5];
  return { frets: page.triads[i], ...(erratumId ? { erratumId } : {}) };
}

/** The book's box for a major or minor triad in its home key. */
export function homeBookTriad(
  rootPc: number,
  quality: BookChordQuality,
): BookTriad | undefined {
  if (quality !== 'maj' && quality !== 'min') return undefined;
  // A minor triad's home is the key it is vi of.
  const homePc = quality === 'maj' ? rootPc : mod12(rootPc + 3);
  const key = GUITAR_KEY_ORDER.find((k) => keyPitchClass(k) === homePc);
  return key ? pageTriad(key, rootPc, quality) : undefined;
}

// ── The search ────────────────────────────────────────────────────────────

interface Candidate {
  frets: number[];
  cost: [number, number, number];
}

function cost(frets: readonly number[]): [number, number, number] {
  const fretted = frets.filter((f) => f > 0);
  const hi = fretted.length ? Math.max(...fretted) : 0;
  return [hi, fretted.length, fretted.reduce((a, b) => a + b, 0)];
}

const less = (a: readonly number[], b: readonly number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

const SEARCHED = new Map<string, GuitarShapeDiagram[]>();

/**
 * Every grip the gate passes for a chord, best first (frets 0-12, all four
 * strings ringing).
 */
export function searchUkuleleGrips(
  rootPc: number,
  quality: BookChordQuality,
): readonly GuitarShapeDiagram[] {
  const id = `${mod12(rootPc)}:${quality}`;
  const cached = SEARCHED.get(id);
  if (cached) return cached;
  const want = new Set(chordSemitones(quality).map((s) => mod12(rootPc + s)));
  // Per string (in written order G C E A), the frets that sound a chord tone.
  const options = UKULELE.stringsLowToHigh.map((string) => {
    const open = UKULELE.tuning[string]!;
    const frets: number[] = [];
    for (let f = 0; f <= MAX_UKULELE_GRIP_FRET; f++) {
      if (want.has(mod12(open + f))) frets.push(f);
    }
    return frets;
  });
  const found: Candidate[] = [];
  const pick = (i: number, acc: number[]) => {
    if (i === options.length) {
      const fretted = acc.filter((f) => f > 0);
      if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) {
        return;
      }
      const frets = formatShape(acc);
      if (shapePitchClasses(frets, UKULELE).length !== want.size) return;
      found.push({ frets: [...acc], cost: cost(acc) });
      return;
    }
    for (const f of options[i]) pick(i + 1, [...acc, f]);
  };
  pick(0, []);
  found.sort((a, b) =>
    less(a.cost, b.cost) ? -1 : less(b.cost, a.cost) ? 1 : 0,
  );
  const grips = found
    .map((c) => ukuleleShape(formatShape(c.frets)))
    .filter(
      (shape) => ukuleleGripProblems(shape, rootPc, quality).length === 0,
    );
  SEARCHED.set(id, grips);
  return grips;
}

/** A chord box for a ukulele lesson, with the book erratum it carries. */
export interface UkuleleGrip {
  shape: GuitarShapeDiagram;
  erratumId?: string;
}

/**
 * The box for a chord: the given key page's triad, else the book's home
 * triad, else the best searched grip. Throws if no grip exists, which the
 * tests rule out for every root and quality.
 */
export function ukuleleGrip(
  rootPc: number,
  quality: BookChordQuality,
  pageKey?: GuitarKeyName,
): UkuleleGrip {
  const pc = mod12(rootPc);
  const book =
    (pageKey ? pageTriad(pageKey, pc, quality) : undefined) ??
    homeBookTriad(pc, quality);
  if (book) {
    return {
      shape: ukuleleShape(book.frets),
      ...(book.erratumId ? { erratumId: book.erratumId } : {}),
    };
  }
  const best = searchUkuleleGrips(pc, quality)[0];
  if (!best) throw new Error(`No ukulele grip for ${pc} ${quality}`);
  return { shape: best };
}
