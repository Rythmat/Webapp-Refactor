import { afterEach, describe, expect, it, vi } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import { exportSongToChordRegions } from '@/curriculum/songLibrary/exportToStudio';
import { progressionChart } from '../progressionChart';

const POP = { id: 662, chords: ['1 major', '5 major', '6 minor', '4 major'] };
const TURNAROUND = {
  id: 447,
  chords: ['6 minor7', '2 minor7', '5 dominant7#5', '1 major7'],
};

const firstRound = (song: ReturnType<typeof progressionChart>, n: number) =>
  song!.sections[0].bars
    .slice(0, n)
    .map((bar) => [bar.chords[0].degree, bar.chords[0].chordName]);

describe('a progression written out as a chart', () => {
  it('goes round to fill eight bars, one chord a bar, in C by default', () => {
    const song = progressionChart(POP)!;
    expect(song).toMatchObject({ key: 'C major', keyRoot: 60, mode: 'major' });
    expect(song.sections[0].bars).toHaveLength(8);
    expect(firstRound(song, 4)).toEqual([
      ['1 maj', 'C'],
      ['5 maj', 'G'],
      ['6 min', 'Amin'],
      ['4 maj', 'F'],
    ]);
    expect(song.title).toBe('1 maj – 5 maj – 6 min – 4 maj');
  });

  it('lands in the key asked for, spelt for it', () => {
    const song = progressionChart(POP, {
      tonicPc: 4,
      heardIn: 'Hey, Soul Sister',
    })!;
    expect(song.key).toMatch(/^E major/);
    expect(firstRound(song, 4).map(([, name]) => name)).toEqual([
      'E',
      'B',
      'C♯min',
      'A',
    ]);
    expect(song.artist).toBe('Progression #662, as heard in Hey, Soul Sister');
  });

  it('heard in a minor song from its relative major, is written from that song’s tonic', () => {
    const song = progressionChart(TURNAROUND, {
      tonicPc: 9,
      mode: 'minor',
      relative: true,
      sectionLabel: 'Chorus 2',
    })!;
    expect(song).toMatchObject({ key: 'A minor', mode: 'minor' });
    expect(firstRound(song, 4)).toEqual([
      ['1 min7', 'Amin7'],
      ['4 min7', 'Dmin7'],
      ['♭7 dom7(♯5)', 'G7♯5'],
      ['♭3 maj7', 'Cmaj7'],
    ]);
    expect(song.sections[0].label).toBe('Chorus');
    expect(song.title).toBe('1 min7 – 4 min7 – ♭7 dom7(♯5) – ♭3 maj7');
  });

  it('keeps a slash bass, counted from the key', () => {
    const song = progressionChart({
      id: 642,
      chords: ['1 major', '4 major/1', '1 major'],
    })!;
    expect(firstRound(song, 2)).toEqual([
      ['1 maj', 'C'],
      ['4 maj/1', 'F/C'],
    ]);
  });

  it('spells a degree with the accidental the library writes it with', () => {
    const song = progressionChart({
      id: 1,
      chords: ['b6 major7', '#5 diminished7'],
    });
    expect(firstRound(song, 2)).toEqual([
      ['♭6 maj7', 'A♭maj7'],
      ['♯5 dim7', 'G♯dim7'],
    ]);
  });
});

describe('every library progression', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  afterEach(() => warn.mockClear());

  it('opens in the Studio with every chord voiced as written', () => {
    const unreadable: number[] = [];
    for (const progression of CHORD_PROGRESSION_LIBRARY) {
      const song = progressionChart(progression, { tonicPc: 3 });
      if (!song) {
        unreadable.push(progression.id);
        continue;
      }
      const { regions } = exportSongToChordRegions(song, {
        voicingMode: 'auto',
        bassLine: false,
      });
      expect(regions.length).toBeGreaterThanOrEqual(8);
    }
    expect(unreadable).toEqual([]);
    // An unknown quality falls back to a major triad, with a warning.
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([]);
  });
});
