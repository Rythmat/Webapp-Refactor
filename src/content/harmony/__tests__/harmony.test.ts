import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { buildHarmonyIndex, isStrongMatch, songUses } from '..';
import {
  canonicalQuality,
  degreeToPc,
  parseDegreeChord,
  parseLetterChord,
  sameAt,
  tonicOfKey,
} from '../chordClass';

/** A song whose sections are bars of hybrid labels, one chord per bar. */
function song(
  id: string,
  sections: Record<string, (string | string[] | null)[]>,
  extra: Partial<Song> = {},
): Song {
  return {
    id,
    title: id,
    artist: 'Artist',
    key: 'C major',
    keyRoot: 60,
    mode: 'major',
    tempo: 100,
    timeSignature: [4, 4],
    sections: Object.entries(sections).map(([label, bars]) => ({
      id: label.toLowerCase(),
      label,
      bars: bars.map((bar) =>
        bar === null
          ? { chords: [], restBars: 1 }
          : {
              chords: (Array.isArray(bar) ? bar : [bar]).map(
                (degree, i, all) => ({
                  degree,
                  chordName: '',
                  beat: 1 + (4 / all.length) * i,
                  duration: 4 / all.length,
                }),
              ),
            },
      ),
    })),
    ...extra,
  } as Song;
}

const POP = { id: 1, chords: ['1 major', '5 major', '6 minor', '4 major'] };
const POP_ROTATED = {
  id: 2,
  chords: ['6 minor', '4 major', '1 major', '5 major'],
};
const TWO_FIVE = { id: 3, chords: ['2 minor7', '5 dominant7', '1 major7'] };

const matchesOf = (
  songs: Song[],
  progressions = [POP, POP_ROTATED, TWO_FIVE],
) => buildHarmonyIndex({ progressions, songs }).matches;

describe('reading a chord', () => {
  it('reads degrees with either accidental', () => {
    expect(degreeToPc('♭7')).toBe(10);
    expect(degreeToPc('b3')).toBe(3);
    expect(degreeToPc('#4')).toBe(6);
    expect(degreeToPc('♯5')).toBe(8);
    expect(degreeToPc('8')).toBeNull();
  });

  it('reads the library, the charts and the activities alike', () => {
    expect(parseDegreeChord('b2 dominant7')).toMatchObject({
      pc: 1,
      quality: 'dom7',
      family: 'dom',
    });
    expect(parseDegreeChord('♭6 dom7')).toMatchObject({ pc: 8, family: 'dom' });
    expect(parseDegreeChord('4 minor6/b3')).toMatchObject({
      pc: 5,
      quality: 'min6',
      family: 'min',
    });
    expect(parseDegreeChord('2 min7/5')).toMatchObject({
      pc: 2,
      quality: 'min7',
    });
    expect(parseDegreeChord('1 5')).toMatchObject({ family: 'power' });
    expect(parseDegreeChord('7 minor7b5')).toMatchObject({ family: 'halfdim' });
    expect(parseDegreeChord('n.c.')).toBeNull();
    expect(parseDegreeChord('c♯min7')).toBeNull();
    // In A minor: Am9 is the tonic, E7♯5 the 5, Bbmaj7/F the ♭2.
    const a = tonicOfKey('A minor (Dorian)')!;
    expect(a).toBe(9);
    expect(parseLetterChord('Am9', a)).toMatchObject({ pc: 0, family: 'min' });
    expect(parseLetterChord('E7#5', a)).toMatchObject({
      pc: 7,
      quality: 'dom7#5',
      family: 'dom',
    });
    expect(parseLetterChord('Bbmaj7/F', a)).toMatchObject({
      pc: 1,
      quality: 'maj7',
    });
    expect(parseLetterChord('Afunk9', a)).toMatchObject({ family: 'dom' });
    expect(parseLetterChord('CM7', 0)).toMatchObject({ quality: 'maj7' });
    expect(parseLetterChord('Cm', 0)).toMatchObject({ quality: 'min' });
    expect(canonicalQuality('6/9')).toBe('maj69');
  });

  it('compares at three strengths', () => {
    const lib = parseDegreeChord('5 major')!;
    const chart = parseDegreeChord('5 dom7')!;
    expect(sameAt('exact', lib, chart)).toBe(false);
    expect(sameAt('family', lib, chart)).toBe(false);
    expect(sameAt('loose', lib, chart)).toBe(true);
    const maj7 = parseDegreeChord('1 major7')!;
    const maj = parseDegreeChord('1 maj')!;
    expect(sameAt('family', maj7, maj)).toBe(true);
  });
});

describe('finding a progression in a song', () => {
  it('finds a section built on it as a loop, held chords counted once', () => {
    const [match, ...rest] = matchesOf([
      song('s', {
        Chorus: [
          '1 maj',
          '1 maj',
          '5 maj',
          '5 maj',
          '6 min7',
          '6 min7',
          '4 maj',
          '4 maj',
          '1 maj',
          '1 maj',
          '5 maj',
          '5 maj',
          '6 min7',
          '6 min7',
          '4 maj',
          '4 maj',
        ],
      }),
    ]).filter((m) => m.progressionId === POP.id);
    expect(rest).toEqual([]);
    expect(match).toMatchObject({
      tier: 'family',
      placement: 'loop',
      cycles: 2,
      startBar: 0,
      endBar: 15,
      labels: ['1 maj', '5 maj', '6 min7', '4 maj'],
    });
  });

  it('hears the rotation a loop starts on, and the other only passing through', () => {
    const matches = matchesOf([
      song('s', {
        Verse: [
          '6 min',
          '4 maj',
          '1 maj',
          '5 maj',
          '6 min',
          '4 maj',
          '1 maj',
          '5 maj',
        ],
      }),
    ]);
    const own = matches.find((m) => m.progressionId === POP_ROTATED.id)!;
    const other = matches.find((m) => m.progressionId === POP.id)!;
    expect(own).toMatchObject({ tier: 'exact', placement: 'loop' });
    expect(other).toMatchObject({ placement: 'inside', startBar: 2 });
    expect(isStrongMatch(own)).toBe(true);
    expect(isStrongMatch(other)).toBe(false);
  });

  it('goes round a progression that ends where it starts, sharing that chord', () => {
    const ONE_FOUR_FIVE_ONE = {
      id: 30,
      chords: ['1 major', '4 major', '5 major', '1 major'],
    };
    const matches = matchesOf(
      [
        song('s', {
          A: [
            '1 maj',
            '4 maj',
            '5 maj',
            '1 maj',
            '1 maj',
            '4 maj',
            '5 maj',
            '1 maj',
          ],
        }),
      ],
      [ONE_FOUR_FIVE_ONE],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      placement: 'loop',
      cycles: 2,
      startBar: 0,
      endBar: 7,
    });
  });

  it('reads repeat signs as the band plays them', () => {
    const chart = song('s', { Chorus: ['6 min', '4 maj', '1 maj', '5 maj'] });
    chart.sections[0].repeatCount = 2;
    const own = matchesOf([chart]).find(
      (m) => m.progressionId === POP_ROTATED.id,
    );
    expect(own).toMatchObject({ placement: 'loop', cycles: 2 });
  });

  it('finds a phrase two chords to a bar, and not across a rest or N.C.', () => {
    const matches = matchesOf([
      song('s', {
        A: [
          ['2 min7', '5 dom7'],
          '1 maj',
          null,
          '2 min7',
          'n.c.',
          '5 dom7',
          '1 maj',
        ],
      }),
    ]).filter((m) => m.progressionId === TWO_FIVE.id);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ tier: 'family', placement: 'phrase' });
  });

  it('keeps one entry per song for a progression, its strongest first', () => {
    const index = buildHarmonyIndex({
      progressions: [POP],
      songs: [
        song('a', {
          Verse: ['2 min', '1 maj', '5 maj', '6 min', '4 maj'],
          Chorus: [
            '1 maj',
            '5 maj',
            '6 min',
            '4 maj',
            '1 maj',
            '5 maj',
            '6 min',
            '4 maj',
          ],
        }),
      ],
    });
    const [use] = songUses(index.byProgression.get(POP.id)!);
    expect(use.best).toMatchObject({
      placement: 'loop',
      source: { sectionLabel: 'Chorus' },
    });
    expect(use.matches).toHaveLength(2);
  });

  it('counts a degree from the key the bar is in after a key change', () => {
    const chart = song('s', {
      Verse: ['1 maj', '5 maj', '6 min', '4 maj'],
    });
    chart.sections[0].bars[0].keyChange = 'D major';
    const [match] = matchesOf([chart], [POP]);
    expect(match.source).toMatchObject({ kind: 'song', key: 'D major' });
  });
});

describe('genre activities and the curriculum map', () => {
  it('reads a step’s loop in the level’s key, across its seam too', () => {
    const index = buildHarmonyIndex({
      progressions: [
        { id: 10, chords: ['1 minor7', '4 dominant7'] },
        { id: 11, chords: ['5 dominant7', '1 minor7'] },
      ],
      flows: [
        {
          genre: 'funk',
          level: 3,
          params: { defaultKey: 'A minor (Dorian)' },
          sections: [
            {
              id: 'D',
              steps: [
                {
                  stepNumber: 1,
                  activity: 'D3.1: Full groove',
                  chordSymbols: ['Am9', 'D13', 'Am9', 'E7#5'],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(index.byProgression.get(10)![0]).toMatchObject({
      tier: 'family',
      placement: 'phrase',
      source: { kind: 'activity', genre: 'funk', level: 3, section: 'D' },
    });
    // E7♯5 back round to Am9: across the loop's seam.
    expect(index.byProgression.get(11)![0]).toMatchObject({
      placement: 'inside',
      startBar: 3,
    });
  });

  it('reads each alternative a curriculum level lists', () => {
    const index = buildHarmonyIndex({
      progressions: [POP, POP_ROTATED],
      curriculum: [
        {
          genre: 'POP',
          level: 'L1',
          chords: {
            progressions: [
              '1 maj - 5 maj - 6 min - 4 maj | 6 min - 4 maj - 1 maj - 5 maj',
            ],
          },
        },
      ],
    });
    expect(index.byProgression.get(POP.id)![0]).toMatchObject({
      tier: 'exact',
      placement: 'loop',
      source: { kind: 'curriculum', text: '1 maj - 5 maj - 6 min - 4 maj' },
    });
  });
});

describe('loops the library does not have', () => {
  it('names a song loop, and says when the library has it or a rotation of it', () => {
    const index = buildHarmonyIndex({
      progressions: [POP],
      songs: [
        song('a', {
          Verse: [
            '1 maj',
            '5 maj',
            '6 min',
            '4 maj',
            '1 maj',
            '5 maj',
            '6 min',
            '4 maj',
          ],
        }),
        song('b', {
          Verse: [
            '6 min',
            '4 maj',
            '1 maj',
            '5 maj',
            '6 min',
            '4 maj',
            '1 maj',
            '5 maj',
          ],
        }),
        song('c', {
          Verse: ['1 maj', '♭7 maj', '4 maj', '1 maj', '♭7 maj', '4 maj'],
        }),
        song('d', {
          Verse: ['1 maj', '♭7 maj', '4 maj', '1 maj', '♭7 maj', '4 maj'],
        }),
      ],
    });
    expect(
      index.loops.map((l) => [l.text, l.songIds, l.libraryId, l.rotationOf]),
    ).toEqual([
      ['1 maj - ♭7 maj - 4 maj', ['c', 'd'], undefined, undefined],
      ['1 maj - 5 maj - 6 min - 4 maj', ['a'], 1, undefined],
      ['6 min - 4 maj - 1 maj - 5 maj', ['b'], undefined, 1],
    ]);
  });
});

describe('a bass the progression asks for', () => {
  const PEDAL = { id: 9, chords: ['1 major', '4 major/1', '1 major'] };
  it('is asked of the chart at every tier but loose', () => {
    const tiers = (bars: string[]) =>
      matchesOf([song('s', { A: bars })], [PEDAL]).map((m) => m.tier);
    expect(tiers(['1 maj', '4 maj/1', '1 maj'])).toEqual(['exact']);
    expect(tiers(['1 maj7', '4 maj7/1', '1 maj7'])).toEqual(['family']);
    expect(tiers(['1 maj', '4 maj', '1 maj'])).toEqual(['loose']);
  });

  it('is left out of a held chord: a walking bass under one chord is one chord', () => {
    const [match] = matchesOf(
      [song('s', { A: ['1 maj', '1 maj/3', '5 maj', '6 min', '4 maj'] })],
      [POP],
    );
    expect(match).toMatchObject({
      tier: 'family',
      labels: ['1 maj', '5 maj', '6 min', '4 maj'],
    });
  });
});

describe('a minor song, and the library written from major tonics', () => {
  const SIX_FOUR = {
    id: 20,
    chords: ['6 minor', '4 major', '1 major', '5 major'],
  };
  const minor = (bars: string[]) =>
    song(
      'm',
      { Verse: [...bars, ...bars] },
      { key: 'A minor', keyRoot: 69, mode: 'minor' },
    );

  it('is read from its relative major too, and says so', () => {
    const [match] = matchesOf(
      [minor(['1 min', '♭6 maj', '♭3 maj', '♭7 maj'])],
      [SIX_FOUR],
    );
    expect(match).toMatchObject({
      tier: 'exact',
      placement: 'loop',
      relative: true,
      labels: ['1 min', '♭6 maj', '♭3 maj', '♭7 maj'],
    });
  });

  it('keeps its own reading where the two agree', () => {
    const own = { id: 21, chords: ['1 minor', '4 minor'] };
    const [match] = matchesOf([minor(['1 min', '4 min'])], [own]);
    expect(match.relative).toBeUndefined();
  });

  it('names its loop from its own tonic, matched to the library from the relative major', () => {
    const index = buildHarmonyIndex({
      progressions: [SIX_FOUR],
      songs: [minor(['1 min', '♭6 maj', '♭3 maj', '♭7 maj'])],
    });
    expect(index.loops[0]).toMatchObject({
      text: '1 min - ♭6 maj - ♭3 maj - ♭7 maj',
      libraryId: 20,
      relative: true,
    });
  });

  it('reads Dorian from the key a genre level names', () => {
    const index = buildHarmonyIndex({
      progressions: [{ id: 22, chords: ['2 minor7', '5 dominant7'] }],
      flows: [
        {
          genre: 'funk',
          level: 3,
          params: { defaultKey: 'A minor (Dorian)' },
          sections: [
            {
              id: 'D',
              steps: [
                { stepNumber: 1, activity: 'x', chordSymbols: ['Am7', 'D7'] },
              ],
            },
          ],
        },
      ],
    });
    expect(index.byProgression.get(22)![0]).toMatchObject({
      relative: true,
      placement: 'loop',
    });
  });
});
