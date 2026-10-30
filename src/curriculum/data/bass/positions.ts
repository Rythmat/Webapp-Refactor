// ── The Bass Atlas: positions ─────────────────────────────────────────────
// Every box in the Bass Atlas is a movable shape (the reference PNGs carry no
// fret numbers), laid out by the rule the Guitar Atlas uses: start on the
// root's string and keep a note on its string while its fret stays inside
// the box, else move up a string (layOut). Where each box starts follows the
// book's C pages, the only key the Canva draft has converted to bass:
// - the 7-note scale has its tonic on the E string, frets r−1 to r+3 (C at
//   frets 7-11), as guitar's does on string 6;
// - the pentatonic starts on the key's home string and climbs to fret t+4
//   (C from A3); home is the A string when the tonic's A-string fret is 1-7,
//   else the E string — exactly the five keys the book gives a "Pen - 6th
//   string" box (G, A, F♯, A♭, F);
// - an arpeggio's root is on the A string when its fret there is 1-9, else
//   on the E string (C: I A3, ii A5, iii A7, IV A8, V E3, vi E5, vii A2).
// The draft's C 7th page draws V7 as a B7 shape (D1 A2 G2 D4), an error; the
// rule's G7 on E3 replaces it.

import {
  isComfortablePosition,
  layOut,
  searchPosition,
} from '@/curriculum/data/guitar/modes/positions';
import type { BookChordQuality } from '@/curriculum/data/guitar/types';
import { fretToMidi } from '@/lib/guitar/fretboard';
import { BASS, openMidi } from '@/lib/guitar/instrument';
import { chordSemitones } from '@/lib/guitar/theory/chordTones';
import type { FretPosition } from '@/lib/guitar/types';
import type { BassBox, BassRootString } from './types';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

const E_STRING = 4;
const A_STRING = 3;
/** The highest A-string fret the pentatonic starts on before moving to E. */
const HOME_MAX_A_FRET = 7;
/** The highest A-string fret an arpeggio's root sits on before moving to E. */
const ARPEGGIO_MAX_A_FRET = 9;

/** A pitch class's lowest fret on a string, 1-12 (never the open string). */
export function fretOf(pc: number, string: BassRootString): number {
  return mod12(pc - openMidi(string, BASS)) || 12;
}

/** The book's box around some notes: from fret 1 when they all fit in 1-5. */
export function boxOf(playOrder: readonly FretPosition[]): BassBox {
  const frets = playOrder.map((p) => p.fret);
  const lo = Math.min(...frets);
  const hi = Math.max(...frets);
  const fretStart = hi <= 5 ? 1 : Math.max(1, lo);
  const used = new Set(playOrder.map((p) => p.string));
  return {
    fretStart,
    fretEnd: Math.max(fretStart + 4, hi),
    unusedStrings: BASS.stringsLowToHigh.filter((s) => !used.has(s)),
    playOrder,
  };
}

/** Where a key's pentatonic (and its feel for the neck) starts. */
export function homeOf(tonicPc: number): {
  string: BassRootString;
  fret: number;
} {
  const aFret = mod12(tonicPc - openMidi(A_STRING, BASS));
  return aFret >= 1 && aFret <= HOME_MAX_A_FRET
    ? { string: A_STRING, fret: aFret }
    : { string: E_STRING, fret: fretOf(tonicPc, E_STRING) };
}

/** Ascending MIDI notes from `firstMidi`, one per semitone offset, closed by the octave. */
const octaveFrom = (firstMidi: number, offsets: readonly number[]) =>
  [...offsets, 12].map((s) => firstMidi + s);

/**
 * A 7-note scale, tonic to tonic, from the E string inside frets r−1..r+3;
 * when a scale doesn't fit a hand there (an augmented 2nd, three half steps
 * in a row), the most compact comfortable layout from E, then from A, then
 * the tightest stretch.
 */
export function bassScaleBox(
  tonicPc: number,
  steps: readonly number[],
): BassBox {
  const r = fretOf(tonicPc, E_STRING);
  const midis = octaveFrom(openMidi(E_STRING, BASS) + r, steps);
  const book = boxOf(layOut(midis, E_STRING, r + 3, BASS));
  const asPosition = { id: 'major' as const, ...book };
  if (isComfortablePosition(asPosition)) {
    return { ...book, fretStart: Math.max(1, r - 1), fretEnd: r + 3 };
  }
  const found =
    searchPosition(tonicPc, steps, E_STRING, r - 1, BASS) ??
    searchPosition(tonicPc, steps, A_STRING, r - 1, BASS);
  if (found) return boxOf(found.playOrder);
  return stretchBox(tonicPc, steps);
}

/**
 * Two augmented 2nds (double harmonic) leave four strings no box a hand
 * covers in four frets: the tightest five-fret stretch, from E or from A.
 */
function stretchBox(tonicPc: number, steps: readonly number[]): BassBox {
  let best: { box: BassBox; span: number } | null = null;
  for (const string of [E_STRING, A_STRING] as const) {
    for (const r of [fretOf(tonicPc, string), fretOf(tonicPc, string) + 12]) {
      if (r > 12) continue;
      const midis = octaveFrom(openMidi(string, BASS) + r, steps);
      for (const reach of [4, 5]) {
        let playOrder: FretPosition[];
        try {
          playOrder = layOut(midis, string, r + reach, BASS);
        } catch {
          continue;
        }
        const frets = playOrder.map((p) => p.fret);
        if (Math.min(...frets) < 1) continue;
        const span = Math.max(...frets) - Math.min(...frets);
        if (!best || span < best.span) best = { box: boxOf(playOrder), span };
      }
    }
  }
  if (!best) throw new Error(`No bass position for ${steps}`);
  return best.box;
}

/**
 * A pentatonic or blues scale from its first note to that note's octave,
 * starting on the home string of that note and climbing to fret t+4.
 * @param offsets - Semitones above the first note, ascending, from 0.
 */
export function bassPentatonicBox(
  firstPc: number,
  offsets: readonly number[],
): BassBox {
  const home = homeOf(firstPc);
  const midis = octaveFrom(openMidi(home.string, BASS) + home.fret, offsets);
  return boxOf(layOut(midis, home.string, home.fret + 4, BASS));
}

/** The string an arpeggio's root goes on, and its fret there. */
export function arpeggioRoot(rootPc: number): {
  string: BassRootString;
  fret: number;
} {
  const aFret = mod12(rootPc - openMidi(A_STRING, BASS));
  return aFret >= 1 && aFret <= ARPEGGIO_MAX_A_FRET
    ? { string: A_STRING, fret: aFret }
    : { string: E_STRING, fret: fretOf(rootPc, E_STRING) };
}

/**
 * A chord's tones from its root, R 3 5 (7), laid out from the root string
 * inside four frets of it: the book's "6th"/"5th"-string arpeggio shapes.
 */
export function arpeggioPlayOrder(
  rootPc: number,
  quality: BookChordQuality,
  root = arpeggioRoot(rootPc),
): FretPosition[] {
  const rootMidi = openMidi(root.string, BASS) + root.fret;
  const midis = chordSemitones(quality).map((s) => rootMidi + s);
  return layOut(midis, root.string, root.fret + 3, BASS);
}

/** The sounding MIDI of a box's notes, in play order. */
export const boxMidis = (box: Pick<BassBox, 'playOrder'>): number[] =>
  box.playOrder.map((p) => fretToMidi(p, BASS));
