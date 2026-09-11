import { describe, expect, it } from 'vitest';
import {
  buildSpellingMap,
  formatNoteName,
  midiToPitchName,
  noteNameToPitchClass,
  pitchNameToMidi,
  spellChord,
  spellLeadingRoot,
  spellMidi,
  spellScale,
} from '../enharmonicEngine';

const IONIAN = [0, 2, 4, 5, 7, 9, 11, 12];
const DIATONIC: Record<string, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};
// The twelve key tiles in Learn (ModeOverview CHROMATIC_KEYS).
const TILE_KEYS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F♯',
  'D♭',
  'A♭',
  'E♭',
  'B♭',
  'F',
];

describe('spellScale', () => {
  // Regression: B♭ and E♭ Ionian used to render as A♯ / D♯ in the Learn overview.
  it.each([
    ['C', 'C D E F G A B'],
    ['G', 'G A B C D E F♯'],
    ['D', 'D E F♯ G A B C♯'],
    ['A', 'A B C♯ D E F♯ G♯'],
    ['E', 'E F♯ G♯ A B C♯ D♯'],
    ['B', 'B C♯ D♯ E F♯ G♯ A♯'],
    ['F♯', 'F♯ G♯ A♯ B C♯ D♯ E♯'],
    ['D♭', 'D♭ E♭ F G♭ A♭ B♭ C'],
    ['A♭', 'A♭ B♭ C D♭ E♭ F G'],
    ['E♭', 'E♭ F G A♭ B♭ C D'],
    ['B♭', 'B♭ C D E♭ F G A'],
    ['F', 'F G A B♭ C D E'],
    ['Bb', 'B♭ C D E♭ F G A'],
    ['Gb', 'G♭ A♭ B♭ C♭ D♭ E♭ F'],
  ])('%s Ionian → %s', (root, expected) => {
    expect(spellScale(root, IONIAN)).toEqual(expected.split(' '));
  });

  it('uses one letter per degree in every mode, keyed by the root label', () => {
    expect(spellScale('A♭', DIATONIC.dorian)).toEqual(
      'A♭ B♭ C♭ D♭ E♭ F G♭'.split(' '),
    );
    expect(spellScale('F♯', DIATONIC.locrian)).toEqual(
      'F♯ G A B C D E'.split(' '),
    );
    expect(spellScale('D♭', DIATONIC.phrygian)).toEqual(
      'D♭ E𝄫 F♭ G♭ A♭ B𝄫 C♭'.split(' '),
    );
    expect(spellScale('B', DIATONIC.lydian)).toEqual(
      'B C♯ D♯ E♯ F♯ G♯ A♯'.split(' '),
    );
  });

  it.each(
    TILE_KEYS.flatMap((key) =>
      Object.keys(DIATONIC).map((mode) => [key, mode]),
    ),
  )('%s %s: seven distinct letters with the right pitches', (key, mode) => {
    const steps = DIATONIC[mode];
    const scale = spellScale(key, steps)!;
    const rootPc = noteNameToPitchClass(key)!;
    expect(new Set(scale.map((n) => n[0])).size).toBe(7);
    expect(scale.map((n) => noteNameToPitchClass(n))).toEqual(
      steps.map((s) => (rootPc + s) % 12),
    );
  });

  it('returns null for non-heptatonic scales', () => {
    expect(spellScale('C', [0, 2, 4, 7, 9])).toBeNull();
  });
});

describe('pitch names and octaves', () => {
  it('parses ASCII and Unicode accidentals alike', () => {
    for (const [name, midi] of [
      ['B♭4', 70],
      ['Bb4', 70],
      ['A#4', 70],
      ['A♯4', 70],
      ['C4', 60],
      ['B𝄫4', 69],
      ['Bbb4', 69],
      ['F𝄪4', 67],
      ['Fx4', 67],
      ['F##4', 67],
    ] as const) {
      expect(pitchNameToMidi(name)).toBe(midi);
    }
  });

  it('numbers octaves by letter (C♭5 = 71, B♯3 = 60)', () => {
    expect(pitchNameToMidi('C♭5')).toBe(71);
    expect(pitchNameToMidi('B♯3')).toBe(60);
    expect(spellMidi(71, buildSpellingMap('G♭', IONIAN))).toBe('C♭5');
    expect(spellMidi(65, buildSpellingMap('F♯', IONIAN))).toBe('E♯4');
    expect(midiToPitchName(60, 66)).toBe('B#3');
  });

  it('formats names in either accidental style', () => {
    expect(formatNoteName('Bb')).toBe('B♭');
    expect(formatNoteName('B♭4', 'ascii')).toBe('Bb4');
    expect(formatNoteName('not a note')).toBe('not a note');
  });

  it.each(
    TILE_KEYS.flatMap((key) =>
      Object.keys(DIATONIC).map((mode) => [key, mode]),
    ),
  )(
    '%s %s: every MIDI note round-trips through its spelled name',
    (key, mode) => {
      const map = buildSpellingMap(key, DIATONIC[mode]);
      expect(map.size).toBe(12);
      for (let midi = 21; midi <= 108; midi++) {
        expect(pitchNameToMidi(spellMidi(midi, map))).toBe(midi);
      }
    },
  );
});

describe('buildSpellingMap', () => {
  it('spells notes outside the scale from KEY_NOTE_NAMES of the parent major key', () => {
    // D Dorian → C major row: D♭, E♭, G♭... not the D row's C♯.
    const map = buildSpellingMap('D', DIATONIC.dorian);
    expect(map.get(1)).toBe('D♭');
    expect(map.get(6)).toBe('F♯');
    expect(map.get(0)).toBe('C');
  });

  it('keeps the root label even when the table row disagrees', () => {
    expect(buildSpellingMap('C♯').get(1)).toBe('C♯');
  });

  it('is empty for an unparseable root', () => {
    expect(buildSpellingMap('H').size).toBe(0);
  });
});

describe('midiToPitchName (genre curriculum)', () => {
  it('keeps ASCII output from the KEY_NOTE_NAMES table', () => {
    expect(midiToPitchName(70, 70)).toBe('Bb4');
    expect(midiToPitchName(63, 62)).toBe('Eb4');
    expect(midiToPitchName(61, 62)).toBe('C#4');
    expect(midiToPitchName(61)).toBe('Db4');
  });
});

describe('spellChord (Rule 3: whole chord from its root)', () => {
  it.each([
    ['A', [0, 4, 7, 10], 'A C♯ E G'],
    ['D', [0, 4, 7], 'D F♯ A'],
    ['G♭', [0, 4, 7], 'G♭ B♭ D♭'],
    ['G', [0, 4, 8, 10], 'G B D♯ F'], // dom7♯5 → ♯5 is sharp
    ['G', [0, 4, 7, 10, 20], 'G B D F E♭'], // dom7♭13 → ♭13 is flat
    ['G', [0, 4, 7, 10, 13], 'G B D F A♭'], // dom7♭9
    ['C', [0, 4, 7, 11, 18], 'C E G B F♯'], // maj7♯11
    ['B', [0, 3, 6, 9], 'B D F A♭'], // dim7 → 𝄫7
    ['C♯', [0, 3, 6, 9], 'C♯ E G B♭'],
    ['C', [0, 4, 8], 'C E G♯'],
  ] as const)('%s %j → %s', (root, intervals, expected) => {
    expect(spellChord(root, [...intervals])).toEqual(expected.split(' '));
  });

  it('shows double accidentals simply by default, strictly on request (Priority 0a)', () => {
    // E dom7♯9: the ♯9 is F𝄪.
    expect(spellChord('E', [0, 4, 7, 10, 15])).toEqual('E G♯ B D G'.split(' '));
    expect(spellChord('E', [0, 4, 7, 10, 15], { strict: true })).toEqual(
      'E G♯ B D F𝄪'.split(' '),
    );
  });
});

describe('spellLeadingRoot (Priority 1: spelled by where it resolves)', () => {
  it.each([
    [6, 'G', 'F♯'], // F♯dim → Gmin
    [6, 'F', 'G♭'], // G♭dim → Fmin
    [0, 'B', 'C'], // Cdim → Bmin
    [0, 'D♭', 'C'], // Cdim → D♭min
    [0, 'C♯', 'B♯'], // B♯dim → C♯min
    [10, 'B', 'A♯'], // A♯dim → Bmin
    [10, 'A', 'B♭'], // B♭dim → Amin
  ] as const)('pitch class %i resolving to %s is %s', (pc, goal, expected) => {
    expect(spellLeadingRoot(pc, goal)).toBe(expected);
  });

  it('returns null when the root does not move by a half step', () => {
    expect(spellLeadingRoot(6, 'A')).toBeNull();
    expect(spellLeadingRoot(6, 'F♯')).toBeNull();
  });
});
