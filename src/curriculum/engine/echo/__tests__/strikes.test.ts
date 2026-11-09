import { describe, expect, it } from 'vitest';
import { clusterChords } from '../../musicLiteracy/chordGrading';
import type { PlayedNote } from '../../musicLiteracy/grading';
import { chordStrikes, strikeSpreadTicks } from '../strikes';
import { msToTicks } from '../tempo';

/**
 * Chord strikes by onset, the spread following the tempo: two chords a
 * 16th apart are two at every tempo the game plays, a rolled chord is one,
 * and a chord held, struck again or let go and pressed again is heard as
 * it was played.
 */

const C = [60, 64, 67];
const F = [65, 69, 72];
const SIXTEENTH = 120;
const TEMPOS = [80, 100, 116];

/** A chord's notes `rollMs` apart from the first, at a tempo. */
const strike = (
  midis: readonly number[],
  onset: number,
  tempo: number,
  { rollMs = 15, duration = 100 } = {},
): PlayedNote[] =>
  midis.map((midi, i) => ({
    midi,
    onset: onset + msToTicks(i * rollMs, tempo),
    duration,
  }));

const midisOf = (strikes: ReturnType<typeof chordStrikes>) =>
  strikes.map((s) => s.notes.map((n) => n.midi));

/** Whether notes hold every tone of C or F major. */
const isChord = (midis: readonly number[]) =>
  [C, F].some((chord) =>
    chord.every((tone) => midis.some((m) => m % 12 === tone % 12)),
  );

describe('the spread', () => {
  it('is 60 ms, or 40% of a 16th when that’s less: well under a 16th', () => {
    expect(strikeSpreadTicks(80)).toBeCloseTo(38.4);
    expect(strikeSpreadTicks(90)).toBeCloseTo(43.2);
    expect(strikeSpreadTicks(100)).toBeCloseTo(48);
    expect(strikeSpreadTicks(116)).toBeCloseTo(48);
    for (let bpm = 80; bpm <= 116; bpm += 4) {
      expect(strikeSpreadTicks(bpm)).toBeLessThanOrEqual(0.4 * SIXTEENTH);
    }
  });
});

describe('chords a 16th apart', () => {
  it('are two strikes at 80, 100 and 116 BPM', () => {
    for (const tempo of TEMPOS) {
      const played = [
        ...strike(C, 0, tempo, { rollMs: 15 }),
        ...strike(F, SIXTEENTH, tempo, { rollMs: 15 }),
      ];
      const strikes = chordStrikes(played, { tempo });
      expect(midisOf(strikes), `${tempo} BPM`).toEqual([C, F]);
      expect(strikes.map((s) => s.onset)).toEqual([0, SIXTEENTH]);
    }
  });

  it('are two even rolled, the second rushed: Music Literacy’s 100 ticks would join them', () => {
    for (const tempo of TEMPOS) {
      // Each rolled over 30 ms, the second 40 ticks early.
      const played = [
        ...strike(C, 0, tempo),
        ...strike(C, SIXTEENTH - 40, tempo),
      ];
      expect(chordStrikes(played, { tempo })).toHaveLength(2);
      // Music Literacy’s 100 ticks run the second into the first.
      expect(clusterChords(played)[0].notes.length).toBeGreaterThan(3);
    }
  });

  it('are four strikes a beat: the same chord in 16ths', () => {
    for (const tempo of TEMPOS) {
      const played = [0, 1, 2, 3].flatMap((i) =>
        strike(C, i * SIXTEENTH, tempo, { duration: 100 }),
      );
      expect(midisOf(chordStrikes(played, { tempo }))).toEqual([C, C, C, C]);
    }
  });
});

describe('a rolled chord', () => {
  it('is one strike, its notes about 30 ms apart in all', () => {
    for (const tempo of TEMPOS) {
      const strikes = chordStrikes(strike(C, 0, tempo, { rollMs: 15 }), {
        tempo,
      });
      expect(midisOf(strikes)).toEqual([C]);
    }
  });

  it('rolled slower than the spread, is joined when together it makes a chord', () => {
    const tempo = 80;
    // 80 ms in all: past the 60 ms spread.
    const slow = strike(C, 0, tempo, { rollMs: 40 });
    expect(chordStrikes(slow, { tempo })).toHaveLength(2);
    const joined = chordStrikes(slow, { tempo, complete: isChord });
    expect(midisOf(joined)).toEqual([C]);
    expect(joined[0].onset).toBe(0);
  });

  it('is never joined to a chord that’s whole on its own', () => {
    const tempo = 116;
    const played = [
      ...strike(C, 0, tempo),
      ...strike(F, 90, tempo), // a rushed 16th
    ];
    expect(midisOf(chordStrikes(played, { tempo, complete: isChord }))).toEqual(
      [C, F],
    );
  });
});

describe('held and struck again', () => {
  it('a chord held while it’s struck again is two strikes, the first ending at the second', () => {
    const tempo = 100;
    // Held for a whole beat, and struck again on the next 16th.
    const played = [
      ...strike(C, 0, tempo, { rollMs: 0, duration: 480 }),
      ...strike(C, SIXTEENTH, tempo, { rollMs: 0, duration: 100 }),
    ];
    const strikes = chordStrikes(played, { tempo });
    expect(midisOf(strikes)).toEqual([C, C]);
    expect(strikes[0].end).toBe(SIXTEENTH);
    expect(strikes[1].end).toBe(SIXTEENTH + 100);
    // Still held (duration 0) when struck again: the same.
    const stillHeld = [
      ...strike(C, 0, tempo, { rollMs: 0, duration: 0 }),
      ...strike(C, SIXTEENTH, tempo, { rollMs: 0, duration: 0 }),
    ];
    const again = chordStrikes(stillHeld, { tempo });
    expect(again.map((s) => s.end)).toEqual([SIXTEENTH, Infinity]);
  });

  it('a key pressed twice within the spread is one note of the strike', () => {
    const tempo = 80;
    const played: PlayedNote[] = [
      { midi: 60, onset: 0, duration: 400 },
      { midi: 64, onset: 5, duration: 10 }, // bounces
      { midi: 64, onset: 25, duration: 380 },
      { midi: 67, onset: 10, duration: 400 },
    ];
    const strikes = chordStrikes(played, { tempo });
    expect(midisOf(strikes)).toEqual([[60, 64, 67]]);
    expect(strikes[0].end).toBe(410);
  });

  it('a key let go and pressed again later strikes again', () => {
    const tempo = 116;
    const played: PlayedNote[] = [
      { midi: 60, onset: 0, duration: 480 },
      { midi: 67, onset: 0, duration: 480 },
      { midi: 64, onset: 0, duration: 100 }, // E let go…
      { midi: 64, onset: SIXTEENTH, duration: 100 }, // …and pressed again
    ];
    const strikes = chordStrikes(played, { tempo });
    expect(midisOf(strikes)).toEqual([[60, 67, 64], [64]]);
    // C and G still down: held under the E struck again.
    expect(strikes[1].held.map((n) => n.midi)).toEqual([60, 67]);
  });

  it('a note let go before a strike is complete isn’t held through it', () => {
    const tempo = 100;
    const played: PlayedNote[] = [
      ...strike(C, 0, tempo, { rollMs: 0, duration: 125 }), // legato: let go 5 ticks late
      ...strike(F, SIXTEENTH, tempo, { rollMs: 0, duration: 200 }),
    ];
    const strikes = chordStrikes(played, { tempo });
    expect(strikes[1].held).toEqual([]);
  });
});
