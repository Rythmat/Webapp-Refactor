import { describe, expect, it } from 'vitest';
import type { ChordBar, Song } from '@/curriculum/types/songLibrary';
import { exportSongToChordRegions } from '../exportToStudio';
import {
  barQuarters,
  hasMeterChange,
  sectionMeters,
  writtenBarMeters,
} from '../performance';
import { barDurationSec, getBarStartTime } from '../timing';

/**
 * A bar counts in its own metre.
 *
 * `ChordBar.timeSignature` is a running value, the way `keyChange` is: the bar
 * that carries it changes the metre, and every bar after it inherits until
 * another says otherwise. Contusion is the case that forced it — two 5/4 bars
 * in a 4/4 song, which the schema could not hold, so they were flattened on
 * the way in and the damage came out as bar-count drift.
 *
 * The other half of this file is the arithmetic that hangs off it. A tick is a
 * 480th of a QUARTER note, so a bar cannot be measured by its beat count
 * alone: a 6/8 bar is six eighths, which is three quarters and 1440 ticks. The
 * export counted six quarters and put every 6/8 song out at twice its length.
 */

const bar = (name: string, marks: Partial<ChordBar> = {}): ChordBar => ({
  chords: [{ degree: '1 maj', chordName: name, beat: 1, duration: 4 }],
  ...marks,
});

const song = (
  bars: ChordBar[],
  timeSignature: [number, number] = [4, 4],
): Song =>
  ({
    id: 't',
    title: 't',
    artist: 't',
    key: 'C major',
    keyRoot: 60,
    mode: 'major',
    tempo: 120,
    timeSignature,
    difficulty: 1,
    genreTags: [],
    techniques: [],
    sections: [{ id: 's0', label: 'Verse', bars }],
    audioSources: [],
    artistImageSource: 'none',
  }) as Song;

const EXPORT = { voicingMode: 'auto', bassLine: false } as const;

describe('writtenBarMeters', () => {
  it('gives every bar the song metre when no bar says otherwise', () => {
    expect(writtenBarMeters(song([bar('C'), bar('F')], [3, 4]))).toEqual([
      [3, 4],
      [3, 4],
    ]);
  });

  it('changes at the bar that carries the mark, and holds after it', () => {
    // The Contusion shape: a 4/4 song with two 5/4 bars inside it.
    const s = song([
      bar('C'),
      bar('F', { timeSignature: [5, 4] }),
      bar('G'),
      bar('C', { timeSignature: [4, 4] }),
      bar('C'),
    ]);
    expect(writtenBarMeters(s)).toEqual([
      [4, 4],
      [5, 4],
      [5, 4],
      [4, 4],
      [4, 4],
    ]);
  });

  it('counts repeated bars in the metre they were written in', () => {
    // A repeat replays written bars, so the metre travels with them.
    const s = song([
      bar('A', { repeatStart: true, timeSignature: [7, 8] }),
      bar('B', { repeatEnd: true }),
    ]);
    expect(writtenBarMeters(s)).toEqual([
      [7, 8],
      [7, 8],
    ]);
  });

  it('falls back to 4/4 for a song with no metre at all', () => {
    const s = song([bar('C')]);
    delete (s as { timeSignature?: unknown }).timeSignature;
    expect(writtenBarMeters(s)).toEqual([[4, 4]]);
  });

  it('knows whether a song changes metre', () => {
    expect(hasMeterChange(song([bar('C')]))).toBe(false);
    expect(hasMeterChange(song([bar('C', { timeSignature: [5, 4] })]))).toBe(
      true,
    );
  });

  it('groups by section the way both renderers read it', () => {
    const s = song([bar('C'), bar('F')]);
    s.sections.push({ id: 's1', label: 'Chorus', bars: [bar('G')] });
    s.sections[1].bars[0].timeSignature = [3, 4];
    expect(sectionMeters(s)).toEqual([
      [
        [4, 4],
        [4, 4],
      ],
      [[3, 4]],
    ]);
  });
});

describe('barQuarters', () => {
  it('reads the denominator, which is the whole point', () => {
    expect(barQuarters([4, 4])).toBe(4);
    expect(barQuarters([3, 4])).toBe(3);
    expect(barQuarters([5, 4])).toBe(5);
    // Six eighths is three quarters. Counting six is the 6/8 bug.
    expect(barQuarters([6, 8])).toBe(3);
    expect(barQuarters([7, 8])).toBe(3.5);
    expect(barQuarters([2, 2])).toBe(4);
  });
});

describe('exportSongToChordRegions — tick positions', () => {
  const startTicks = (s: Song) =>
    exportSongToChordRegions(s, EXPORT).regions.map((r) => r.startTick);

  it('puts a 4/4 bar at 1920 ticks, as it always did', () => {
    expect(startTicks(song([bar('C'), bar('F'), bar('G')]))).toEqual([
      0, 1920, 3840,
    ]);
  });

  it('puts a 6/8 bar at 1440, not 2880', () => {
    // This is bug 3. The Studio's own timeline draws the barline at 1440
    // (ticksPerBar in daw/utils/timelineScale), so the chords used to sit
    // across it and every 6/8 song ran twice its length.
    expect(startTicks(song([bar('C'), bar('F')], [6, 8]))).toEqual([0, 1440]);
  });

  it('places a chord on its own beat, in the metre unit', () => {
    // Beat 4 of a 6/8 bar is the fourth eighth: three eighths in, 720 ticks.
    const s = song(
      [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 3 },
            { degree: '4 maj', chordName: 'F', beat: 4, duration: 3 },
          ],
        },
      ],
      [6, 8],
    );
    expect(startTicks(s)).toEqual([0, 720]);
  });

  it('accumulates a cursor, so a metre change moves everything after it', () => {
    // Bar 2 is 5/4, so bar 3 starts a quarter later than it otherwise would.
    const s = song([
      bar('C'),
      bar('F', { timeSignature: [5, 4] }),
      bar('G', { timeSignature: [4, 4] }),
    ]);
    expect(startTicks(s)).toEqual([0, 1920, 1920 + 2400]);
  });

  it('gives a multi-bar rest its own bars of time', () => {
    const s = song([{ chords: [], restBars: 3 }, bar('C')]);
    expect(startTicks(s)).toEqual([3 * 1920]);
  });
});

describe('timing in a bar own metre', () => {
  it('leaves a chart that never changes metre exactly as it was', () => {
    const s = song([bar('C'), bar('F')]);
    // 4 beats at 120bpm is 2 seconds.
    expect(barDurationSec(s.sections[0].bars[0], s)).toBe(2);
    expect(getBarStartTime(s, 0, 1)).toBe(2);
  });

  it('makes a 5/4 bar a quarter longer than its neighbours', () => {
    const s = song([bar('C', { timeSignature: [5, 4] }), bar('F')]);
    // The 5/4 bar runs 2.5s, so the bar after it starts there and not at 2.
    expect(getBarStartTime(s, 0, 1)).toBe(2.5);
  });

  it('holds a metre across the bars that inherit it', () => {
    const s = song([
      bar('C', { timeSignature: [3, 4] }),
      bar('F'),
      bar('G', { timeSignature: [4, 4] }),
    ]);
    // Two 3/4 bars at 120bpm: 1.5s each.
    expect(getBarStartTime(s, 0, 2)).toBe(3);
  });
});
