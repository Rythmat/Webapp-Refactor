import { describe, expect, it } from 'vitest';
import {
  LITERACY_MODES,
  LITERACY_TONICS,
} from '@/content/musicLiteracy/schemas';
import { MAX_ROOT_MOVE } from '../../musicLiteracy/chords';
import { placeMelody } from '../../musicLiteracy/register';
import {
  bossCalls,
  chordCall,
  echoChordDegrees,
  echoTonic,
  melodyCall,
} from '../calls';
import { levelSpan, positionNote } from '../contours';
import { ECHO_LEVEL_NUMBERS } from '../levels';
import { echoRandom } from '../random';

/**
 * Calls: chord calls on the mode's six chords (no diminished one), voiced
 * as Music Literacy voices a progression; melody calls in one register a
 * level; the boss's four by turns.
 */

const KEYS = LITERACY_TONICS.flatMap((tonic) =>
  LITERACY_MODES.map((mode) => ({ tonic, mode })),
);

describe('a chord call', () => {
  it('plays the mode’s six chords, never the diminished one', () => {
    expect(echoChordDegrees('major')).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(echoChordDegrees('minor')).toEqual(['1', '3', '4', '5', '6', '7']);
    const rng = echoRandom('six');
    const labels = { major: new Set<string>(), minor: new Set<string>() };
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (let i = 0; i < 200; i++) {
        const key = KEYS[i % KEYS.length];
        const call = chordCall(level, key, rng);
        expect(call.degrees).toHaveLength(2);
        expect(call.degrees[0]).not.toBe(call.degrees[1]);
        for (const degree of call.degrees) {
          expect(echoChordDegrees(key.mode)).toContain(degree);
        }
        for (const chord of call.chords) {
          expect(['maj', 'min']).toContain(chord.quality);
        }
        call.labels.forEach((label) => labels[key.mode].add(label));
      }
    }
    expect(labels.major).toEqual(
      new Set(['1 maj', '2 min', '3 min', '4 maj', '5 maj', '6 min']),
    );
    expect(labels.minor).toEqual(
      new Set(['1 min', '♭3 maj', '4 min', '5 min', '♭6 maj', '♭7 maj']),
    );
  });

  it('starts on the 1 chord at Level 1, anywhere after', () => {
    const rng = echoRandom('home');
    const firsts = new Set<string>();
    for (let i = 0; i < 100; i++) {
      expect(chordCall(1, KEYS[i % KEYS.length], rng).degrees[0]).toBe('1');
      firsts.add(chordCall(2, { tonic: 'E', mode: 'minor' }, rng).degrees[0]);
    }
    expect(firsts).toEqual(new Set(echoChordDegrees('minor')));
  });

  it('voices its chords together: no root moving past a 4th', () => {
    const rng = echoRandom('voicing');
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (let i = 0; i < 200; i++) {
        const call = chordCall(level, KEYS[i % KEYS.length], rng);
        const [a, b] = call.chords;
        expect(Math.abs(b.root - a.root)).toBeLessThanOrEqual(MAX_ROOT_MOVE);
      }
    }
    // A 6 chord to the 1 goes up to it, not down an octave and a 6th.
    const call = chordCall(2, { tonic: 'C', mode: 'major' }, rng, {
      degrees: ['6', '1'],
    });
    expect(call.chords.map((c) => c.root)).toEqual([69, 72]);
    expect(call.labels).toEqual(['6 min', '1 maj']);
  });

  it('strikes the bar’s chord at every attack, its notes for the roll', () => {
    const call = chordCall(1, { tonic: 'F', mode: 'major' }, echoRandom(7), {
      degrees: ['1', '5'],
    });
    for (const attack of call.attacks) {
      expect(attack.chord).toBe(call.chords[attack.bar]);
    }
    expect(call.notes).toHaveLength(3 * call.attacks.length);
    expect(call.notes.slice(0, 3).map((n) => n.degree)).toEqual([
      '1',
      '3',
      '5',
    ]);
  });

  it('refuses a chord outside the six', () => {
    expect(() =>
      chordCall(1, { tonic: 'C', mode: 'major' }, echoRandom(1), {
        degrees: ['1', '7'],
      }),
    ).toThrow();
  });
});

describe('a melody call’s register', () => {
  it('reads every call of a level from one 1, placed by Music Literacy’s rule', () => {
    for (const key of KEYS) {
      for (const level of ECHO_LEVEL_NUMBERS) {
        const { low, high } = levelSpan(level);
        const notes = Array.from({ length: high - low + 1 }, (_, i) =>
          positionNote(low + i, key.mode),
        );
        expect(echoTonic(level, key)).toBe(placeMelody(key, notes).tonic);
      }
    }
    const rng = echoRandom('register');
    const key = { tonic: 'A', mode: 'minor' } as const;
    const tonics = new Set(
      Array.from({ length: 30 }, () => melodyCall(2, key, rng).tonic),
    );
    expect(tonics).toEqual(new Set([echoTonic(2, key)]));
  });

  it('keeps C major’s calls on the staff, its 1 an octave over middle C', () => {
    const key = { tonic: 'C', mode: 'major' } as const;
    expect(echoTonic(1, key)).toBe(72);
    const rng = echoRandom('staff');
    for (let i = 0; i < 50; i++) {
      for (const note of melodyCall(1, key, rng).notes) {
        expect(note.midi).toBeGreaterThanOrEqual(67); // the 5 below: G4
        expect(note.midi).toBeLessThanOrEqual(79); // the 5 above: G5
      }
    }
  });
});

describe('the boss', () => {
  it('plays four calls, melody and chords by turns, two melodies apart', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      const rng = echoRandom(`boss-${level}`);
      for (let i = 0; i < 30; i++) {
        const calls = bossCalls(level, KEYS[i % KEYS.length], rng);
        expect(calls.map((c) => c.kind)).toEqual([
          'melody',
          'chords',
          'melody',
          'chords',
        ]);
        expect(calls[0].contour.id).not.toBe(calls[2].contour.id);
        for (const call of calls) {
          expect(call.level).toBe(level);
          expect(call.bars).toBe(2);
        }
      }
    }
  });
});
