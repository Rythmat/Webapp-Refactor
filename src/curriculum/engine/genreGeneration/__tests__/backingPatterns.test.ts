import { describe, expect, it } from 'vitest';
import type { ActivityStepV2 } from '../../../types/activity.v2';
import { buildBackingNotes, type BackingNote } from '../backingPatterns';
import { chordSymbolToBassPC } from '../chordBassNote';
import { chordSymbolTones } from '../chordSymbolTones';
import type { GenreNoteEvent } from '../resolveStepContent';

const BAR = 1920;
const LEAD_IN = 2 * BAR; // piano roll count-in bar + one-bar note offset

const step = (fields: Record<string, unknown>) =>
  fields as unknown as ActivityStepV2;

const inRange = (
  notes: BackingNote[],
  part: BackingNote['part'],
  from: number,
  to: number,
) => notes.filter((n) => n.part === part && n.onset >= from && n.onset < to);

const pitchClasses = (notes: BackingNote[]) =>
  new Set(notes.map((n) => n.note % 12));

const chordTones = (symbol: string) => {
  const tones = chordSymbolTones(symbol)!;
  return new Set(tones.intervals.map((i) => (tones.rootPc + i) % 12));
};

describe('buildBackingNotes lead-in', () => {
  const CHORDS = ['Dm7', 'G7', 'Am7', 'C'];
  const vamp = step({
    chordSymbols: CHORDS,
    backing_parts: {
      engine_generates: ['drums', 'bass'],
      student_plays: ['chords'],
    },
  });
  const build = (countIn: number) =>
    buildBackingNotes(vamp, 62, 1, 'l1a', [], 'funk', countIn);

  // Regression: Play Now started the backing at transport 0 while the student's
  // bar 1 is two bars in, so the backing ran two bars ahead of the target notes.
  it('starts the bass on the student’s bar 1', () => {
    const bass = build(LEAD_IN).filter((n) => n.part === 'bass');
    expect(Math.min(...bass.map((n) => n.onset))).toBeGreaterThanOrEqual(
      LEAD_IN,
    );
  });

  it('plays each bar’s chord root in that target bar', () => {
    const notes = build(LEAD_IN);
    for (let bar = 0; bar < 8; bar++) {
      const start = LEAD_IN + bar * BAR;
      const downbeat = inRange(notes, 'bass', start, start + 60).sort(
        (a, b) => a.note - b.note,
      )[0];
      expect(downbeat, `bar ${bar + 1}`).toBeDefined();
      expect(downbeat.note % 12, `bar ${bar + 1}`).toBe(
        chordSymbolToBassPC(CHORDS[bar % CHORDS.length]),
      );
    }
  });

  it('counts the student in with drums during the lead-in', () => {
    const leadIn = build(LEAD_IN).filter((n) => n.onset < LEAD_IN);
    expect(leadIn.length).toBeGreaterThan(0);
    expect(leadIn.every((n) => n.part === 'drums')).toBe(true);
  });

  it('leaves the timeline unchanged without a lead-in', () => {
    const firstBar = inRange(build(0), 'bass', 0, 60);
    expect(firstBar[0]?.note % 12).toBe(chordSymbolToBassPC(CHORDS[0]));
  });
});

describe('buildBackingNotes follows the progression', () => {
  it('moves the bass with chords that change mid-bar (Funk L2 D3.2)', () => {
    const lh = (midis: number[], onset: number, duration: number) =>
      midis.map(
        (midi): GenreNoteEvent => ({ midi, onset, duration, hand: 'lh' }),
      );
    const targets = [
      ...lh([60, 67, 71], 0, 1200), // Am9
      ...lh([61, 65, 70], 1440, 240), // Eb9
      ...lh([60, 64, 69], 1800, 1320), // D9, held into bar 2
      ...lh([60, 67, 71], 3840, 240), // Am9
    ];
    const notes = buildBackingNotes(
      step({
        chordSymbols: ['Am9', 'Eb9', 'D9'],
        backing_parts: {
          engine_generates: ['drums', 'bass'],
          student_plays: ['chords', 'melody'],
        },
      }),
      57,
      2,
      'l2a',
      targets,
      'funk',
    );
    const downbeat = (tick: number) =>
      inRange(notes, 'bass', tick, tick + 10)[0];
    expect(downbeat(0).note % 12).toBe(9); // A
    expect(downbeat(1440).note % 12).toBe(3); // Eb — Eb9 on beat 4
    expect(downbeat(1800).note % 12).toBe(2); // D — D9 on the last 16th
    expect(downbeat(BAR).note % 12).toBe(2); // D — D9 holds through bar 2
    expect(downbeat(2 * BAR).note % 12).toBe(9); // A — back on Am9
  });

  it('voices the funk stabs for each bar’s chord', () => {
    const notes = buildBackingNotes(
      step({
        chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'A7'],
        backing_parts: {
          engine_generates: ['chords'],
          student_plays: ['melody'],
        },
      }),
      62,
      1,
      'l1a',
      [],
      'funk',
    );
    // Bars 1 and 3 are plain stab bars.
    const bar1 = pitchClasses(inRange(notes, 'chords', 0, 1680));
    const bar3 = pitchClasses(
      inRange(notes, 'chords', 2 * BAR + 400, 2 * BAR + 1300),
    );
    expect([...bar1].every((pc) => chordTones('Dm7').has(pc))).toBe(true);
    expect([...bar3].every((pc) => chordTones('Cmaj7').has(pc))).toBe(true);
  });

  it('chunks a pop triad for each chord', () => {
    const notes = buildBackingNotes(
      step({
        chordSymbols: ['C', 'G', 'Am', 'F'],
        backing_parts: {
          engine_generates: ['chords'],
          student_plays: ['melody'],
        },
      }),
      60,
      1,
      'l1a',
      [],
      'pop',
    );
    expect(
      pitchClasses(inRange(notes, 'chords', BAR + 100, 2 * BAR - 100)),
    ).toEqual(new Set([7, 11, 2]));
    expect(
      pitchClasses(inRange(notes, 'chords', 2 * BAR + 100, 3 * BAR - 100)),
    ).toEqual(new Set([9, 0, 4]));
  });

  it('holds level-3 chords and changes them with the progression', () => {
    const notes = buildBackingNotes(
      step({
        chordSymbols: ['Cm9', 'F13'],
        backing_parts: {
          engine_generates: ['chords'],
          student_plays: ['melody'],
        },
      }),
      60,
      3,
      'l3a',
      [],
      'funk',
    );
    expect(pitchClasses(inRange(notes, 'chords', 0, 10))).toEqual(
      new Set([0, 3, 7, 10]), // Cm9 shell: C Eb G Bb
    );
    expect(pitchClasses(inRange(notes, 'chords', BAR, BAR + 10))).toEqual(
      new Set([5, 9, 0, 3]), // F13: F A C Eb
    );
  });

  it('doubles the student’s left-hand bass line when the engine also plays bass', () => {
    const targets: GenreNoteEvent[] = [
      { midi: 36, onset: 0, duration: 480, hand: 'lh' },
      { midi: 48, onset: 480, duration: 120, hand: 'lh' },
      { midi: 63, onset: 0, duration: 480, hand: 'rh' },
      { midi: 41, onset: 1920, duration: 480, hand: 'lh' },
    ];
    const notes = buildBackingNotes(
      step({
        chordSymbols: ['Cm9', 'F13'],
        backing_parts: {
          engine_generates: ['drums', 'bass'],
          student_plays: ['bass', 'chords'],
        },
      }),
      60,
      3,
      'l3a',
      targets,
      'funk',
      LEAD_IN,
    );
    const bass = inRange(notes, 'bass', 0, LEAD_IN + 16 * BAR).map((n) => [
      n.note,
      n.onset - LEAD_IN,
      n.duration,
    ]);
    expect(bass).toEqual([
      [36, 0, 480],
      [48, 480, 120],
      [41, 1920, 480],
    ]);
  });
});
