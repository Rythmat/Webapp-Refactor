import { describe, expect, it } from 'vitest';
import { buildChordInsights } from '../buildChordInsights';

const A = 9;
const C = 0;
const D = 2;
const none = new Map();

describe('buildChordInsights', () => {
  it('reads degrees from the key tonic in a minor key', () => {
    // A minor: 1 min → A minor, ♭3 maj → C major, ♭7 maj → G major.
    const cards = buildChordInsights(
      ['1 minor', 'b3 major', 'b7 major'],
      A,
      'aeolian',
      none,
    );
    expect(cards.map((c) => c.rootLetter)).toEqual(['A', 'C', 'G']);
    expect(cards.map((c) => c.degreeName)).toEqual([
      '1 minor',
      'b3 major',
      'b7 major',
    ]);
    expect(cards[0].noteNames).toEqual(['A', 'C', 'E']);
  });

  it('reads degrees from the key tonic in a modal key', () => {
    // D dorian: 1 min7 → D minor7, 4 dom7 → G7.
    const cards = buildChordInsights(
      ['1 minor7', '4 dominant7'],
      D,
      'dorian',
      none,
    );
    expect(cards.map((c) => c.chordLabel)).toEqual(['D min7', 'G dom7']);
    expect(cards[1].noteNames).toEqual(['G', 'B', 'D', 'F']);
  });

  it('colors a modal chord like the same chord in its parent major', () => {
    const [aMinor] = buildChordInsights(['1 minor'], A, 'aeolian', none);
    const [sixMinor] = buildChordInsights(['6 minor'], C, 'ionian', none);
    expect(aMinor.rootLetter).toBe(sixMinor.rootLetter);
    expect(aMinor.color).toBe(sixMinor.color);
  });

  it('matches UNISON chords by the same tonic degree', () => {
    const region = { hybridName: '1 minor', isDiatonic: true };
    const [card] = buildChordInsights(
      ['1 minor'],
      A,
      'aeolian',
      new Map([['1 minor', region as never]]),
    );
    expect(card.isDiatonic).toBe(true);
  });

  it('keeps major keys unchanged', () => {
    const cards = buildChordInsights(
      ['2 minor7', '5 dominant7', '1 major7'],
      C,
      'ionian',
      none,
    );
    expect(cards.map((c) => c.chordLabel)).toEqual([
      'D min7',
      'G dom7',
      'C maj7',
    ]);
  });
});
