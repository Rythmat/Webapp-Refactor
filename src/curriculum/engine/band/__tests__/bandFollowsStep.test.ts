import { describe, expect, it } from 'vitest';
import { jazzL1 } from '@/curriculum/data/activityFlows/jazz_v2';
import type { ActivityStepV2 } from '../../../types/activity.v2';
import {
  buildBackingNotes,
  type BackingNote,
} from '../../genreGeneration/backingPatterns';

/**
 * A band plays its parts over the chords the step names (owner, 3 Nov 2026):
 * change a step's chords in the lesson editor and the Jazz Band's captured
 * bass and comping follow them, as its bass lines and comping patterns
 * already walk them.
 *
 * Jazz L1's A2.1 is a C7 vamp, played by Jazz Band 1's "L1 · C7 vamp": a
 * captured walking bass (jazz-bassist-1-blues-line) and the pianist's C7
 * comping (jazz-pianist-1-l1-c7), both as recorded over C7.
 */

const vamp = jazzL1.sections
  .flatMap((s) => s.steps as ActivityStepV2[])
  .find((st) => st.stepNumber === 4)!;
const BAR = 1920;
const mod12 = (n: number) => ((n % 12) + 12) % 12;

const backing = (chordSymbols: string[]) =>
  buildBackingNotes(
    { ...vamp, chordSymbols },
    60,
    1,
    vamp.styleRef,
    [],
    'jazz',
  );
/** The pitch classes a part sounds in a bar. */
const inBar = (notes: BackingNote[], part: string, bar: number) =>
  new Set(
    notes
      .filter(
        (n) =>
          n.part === part && n.onset >= bar * BAR && n.onset < (bar + 1) * BAR,
      )
      .map((n) => mod12(n.note)),
  );
/** The bass note on each bar's downbeat, as a degree of that bar's chord. */
const downbeats = (notes: BackingNote[], chordRoots: number[]) =>
  chordRoots.map((root, bar) => {
    const on = notes.find((n) => n.part === 'bass' && n.onset === bar * BAR);
    return on ? mod12(on.note - root) : null;
  });

describe('a band over the chords a step names', () => {
  it('plays its parts as recorded over their own chords', () => {
    const notes = backing(['C7']);
    // The line as recorded: the root, then the ♭7 every other bar.
    expect(downbeats(notes, [0, 0, 0, 0])).toEqual([0, 10, 0, 10]);
    expect(inBar(notes, 'chords', 1).has(4)).toBe(true); // C7's E
  });

  it('walks the bass and comps the chords of a ii–V–I put in their place', () => {
    const notes = backing(['Dm7', 'G7', 'Cmaj7', 'Cmaj7']);
    // The captured bass keeps its numbers on the new chords: the root, then
    // the 7th — G7's F, Cmaj7's B.
    expect(downbeats(notes, [2, 7, 0, 0])).toEqual([0, 10, 0, 11]);
    // The comping voices each new chord: Dm7's F, G7's B, Cmaj7's B (not B♭).
    expect(inBar(notes, 'chords', 0).has(5)).toBe(true);
    expect(inBar(notes, 'chords', 1).has(11)).toBe(true);
    expect(inBar(notes, 'chords', 2).has(11)).toBe(true);
    expect(inBar(notes, 'chords', 2).has(10)).toBe(false);
  });
});
