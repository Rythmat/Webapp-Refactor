// ── Song chords: the gate ──────────────────────────────────────────────────
// What every song chord box must be: a shape a hand can hold (handProblems;
// open strings only in the open-chord tables, and a muted string only where
// the bass finger damps it), its lowest note the root or the slash bass, only
// the chord's notes, and every note the chord can't do without.

import { shapeNotes } from '@/lib/guitar/fretboard';
import { handProblems } from '@/lib/guitar/theory/grips';
import type { GuitarShapeDiagram } from '@/lib/guitar/types';
import type { SongChord } from './parse';
import { SONG_QUALITIES, songChordPcs } from './quality';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

export interface SongShapeRules {
  /** The shape comes from an open-chord table: open strings may ring. */
  open: boolean;
  /** The slash bass is the shape's lowest note (else the root is). */
  bassInShape: boolean;
}

/** Why `shape` is not a playable `chord`; empty when it is. */
export function songShapeProblems(
  shape: GuitarShapeDiagram,
  chord: SongChord,
  rules: SongShapeRules,
): string[] {
  const problems = handProblems(shape, {
    allowOpen: rules.open,
    allowBassMute: true,
  });
  if (problems[0] === 'sounds nothing') return problems;
  const notes = shapeNotes(shape.frets);
  const minStrings = chord.quality === 'power' ? 2 : 3;
  if (notes.length < minStrings) problems.push('too few strings');

  const bassPc =
    rules.bassInShape && chord.bassPc !== null ? chord.bassPc : chord.rootPc;
  const lowest = Math.min(...notes.map((n) => n.midi));
  if (mod12(lowest) !== bassPc) problems.push('wrong bass note');

  const allowed = new Set(songChordPcs(chord.quality, chord.rootPc));
  if (rules.bassInShape && chord.bassPc !== null) allowed.add(chord.bassPc);
  const have = new Set(notes.map((n) => mod12(n.midi)));
  if ([...have].some((pc) => !allowed.has(pc))) problems.push('a wrong note');
  const missing = SONG_QUALITIES[chord.quality].required.filter(
    (s) => !have.has(mod12(chord.rootPc + s)),
  );
  if (missing.length > 0) problems.push('a chord tone is missing');
  return problems;
}
