import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { songSystemCount } from '@/curriculum/songLibrary/systems';
import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import { ChordChart } from '../ChordChart';
import { ChordGrid } from '../ChordGrid';

/**
 * The phone format is the same chart, read a different way.
 *
 * It must page exactly like the staff chart (the stand and the printer find
 * pages by the same marks) and it must call every chord the same thing — the
 * two renderers share chordLabel.ts precisely so they cannot drift.
 */

const bar = (...names: string[]): ChordBar => ({
  chords: names.map((chordName, i) => ({
    degree: '1 maj',
    chordName,
    beat: 1 + i * 2,
    duration: 2,
  })),
});

const section = (id: string, label: string, bars: ChordBar[]): SongSection => ({
  id,
  label,
  bars,
});

const song = (sections: SongSection[]): Song =>
  ({
    id: 'test',
    title: 'Test',
    artist: 'Test',
    key: 'C major',
    keyRoot: 0,
    mode: 'major',
    tempo: 120,
    timeSignature: [4, 4],
    difficulty: 1,
    genreTags: [],
    techniques: [],
    sections,
    audioSources: [],
    artistImageSource: 'none',
  }) as Song;

const eight = (name = 'C') => Array.from({ length: 8 }, () => bar(name));
const pageStarts = (html: string): number[] =>
  [...html.matchAll(/data-page-start="(\d+)"/g)].map((m) => Number(m[1]));
const systems = (html: string): number[] =>
  [...html.matchAll(/data-chart-system="(\d+)"/g)].map((m) => Number(m[1]));

describe('ChordGrid', () => {
  const chart = song([
    section('intro', 'Intro', eight('C')),
    section('verse', 'Verse', eight('Am7')),
    section('chorus', 'Chorus', eight('F')),
  ]);

  it('numbers its rows straight through the sections, like the staff chart', () => {
    const html = renderToStaticMarkup(<ChordGrid song={chart} />);
    expect(systems(html)).toEqual([...Array(songSystemCount(chart)).keys()]);
  });

  it('pages on exactly the same rows as the staff chart', () => {
    const staff = renderToStaticMarkup(
      <ChordChart song={chart} systemsPerPage={4} />,
    );
    const grid = renderToStaticMarkup(
      <ChordGrid song={chart} systemsPerPage={4} />,
    );
    expect(pageStarts(grid)).toEqual(pageStarts(staff));
    expect(pageStarts(grid)).toEqual([4]);
    expect(grid).toContain('break-before:page');
  });

  it('re-counts its rows when a phone reads two bars to a row', () => {
    // 24 bars: 6 rows at four across, 12 rows at two across.
    expect(songSystemCount(chart, 4)).toBe(6);
    expect(songSystemCount(chart, 2)).toBe(12);
    const html = renderToStaticMarkup(
      <ChordGrid song={chart} barsPerRow={2} systemsPerPage={4} />,
    );
    expect(systems(html)).toEqual([...Array(12).keys()]);
    expect(pageStarts(html)).toEqual([4, 8]);
  });

  it('calls every chord exactly what the staff chart calls it', () => {
    const names = ['Cmaj7', 'F♯min7♭5', 'B♭7sus4', 'E♭/G', 'N.C.'];
    const s = song([
      section(
        'a',
        'Verse',
        names.map((n) => bar(n)),
      ),
    ]);
    const staff = renderToStaticMarkup(<ChordChart song={s} />);
    const grid = renderToStaticMarkup(<ChordGrid song={s} />);
    for (const name of names) {
      expect(grid).toContain(name);
      expect(staff).toContain(name);
    }
  });

  it('writes the roadmap a player has to see', () => {
    const s = song([
      section('a', 'Verse', [
        { ...bar('C'), repeatStart: true, segno: true },
        { ...bar('F'), cue: 'Break' },
        { ...bar('G'), keyChange: 'A♭ major' },
        { ...bar('C'), repeatEnd: true, ending: [1, 2], jump: 'D.S. al Coda' },
      ]),
    ]);
    const html = renderToStaticMarkup(<ChordGrid song={s} />);
    expect(html).toContain('Break');
    expect(html).toContain('Key: A♭ major');
    expect(html).toContain('D.S. al Coda');
    expect(html).toContain('1, 2.');
    // Repeat barlines are drawn as a thicker rule than an ordinary one.
    expect(html).toContain('3px solid currentColor');
  });

  it('marks a bar of rest, and leaves an empty bar empty', () => {
    const s = song([
      section('a', 'Verse', [
        { chords: [], restBars: 4 },
        { chords: [] },
        bar('C'),
      ]),
    ]);
    const html = renderToStaticMarkup(<ChordGrid song={s} />);
    expect(html).toContain('— 4 —');
    // An empty bar is a bar that holds the chord before it: a barline, and
    // nothing else. Writing a symbol there would be writing a chord change.
    expect(html).not.toContain('%');
  });

  it('writes the time signature once, before the first bar', () => {
    const html = renderToStaticMarkup(<ChordGrid song={chart} />);
    expect(html.match(/4\/4 time/g) ?? []).toHaveLength(1);
  });
});
