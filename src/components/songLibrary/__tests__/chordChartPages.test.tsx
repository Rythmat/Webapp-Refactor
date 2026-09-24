import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  songSystemCount,
  songSystemOffsets,
} from '@/curriculum/songLibrary/systems';
import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import { ChordChart } from '../ChordChart';

/**
 * The page marks the stand reads.
 *
 * SetListWorkspace finds the top of every page by querying `[data-page-start]`,
 * and the printer breaks on the same elements. If the chart stops emitting them
 * — or emits them at the wrong staves — page view silently becomes one long
 * page, so the contract is pinned here rather than left to the eye.
 */

const bar = (name: string): ChordBar => ({
  chords: [{ degree: '1 maj', chordName: name, beat: 1, duration: 4 }],
});

const section = (id: string, label: string, bars: number): SongSection => ({
  id,
  label,
  bars: Array.from({ length: bars }, () => bar('C')),
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

/** Every `data-page-start` value in the markup, in order. */
const pageStarts = (html: string): number[] =>
  [...html.matchAll(/data-page-start="(\d+)"/g)].map((m) => Number(m[1]));

const systems = (html: string): number[] =>
  [...html.matchAll(/data-chart-system="(\d+)"/g)].map((m) => Number(m[1]));

describe('ChordChart page marks', () => {
  // Intro 4, Verse 16, Chorus 8, Verse 16, Outro 8 → 13 systems.
  const chart = song([
    section('intro', 'Intro', 4),
    section('verse_1', 'Verse', 16),
    section('chorus', 'Chorus', 8),
    section('verse_2', 'Verse 2', 16),
    section('outro', 'Outro', 8),
  ]);

  it('numbers every system straight through the sections', () => {
    const html = renderToStaticMarkup(<ChordChart song={chart} />);
    expect(systems(html)).toEqual([...Array(songSystemCount(chart)).keys()]);
  });

  it('marks no pages at all when no page size is asked for', () => {
    const html = renderToStaticMarkup(<ChordChart song={chart} />);
    expect(pageStarts(html)).toEqual([]);
    expect(html).not.toContain('break-before');
  });

  it('opens a page every eight staves, never before the first', () => {
    const html = renderToStaticMarkup(
      <ChordChart song={chart} systemsPerPage={8} />,
    );
    expect(pageStarts(html)).toEqual([8]);
    expect(html).toContain('break-before:page');
  });

  it('counts across a section boundary rather than restarting', () => {
    // Four sections of 8 bars = 2 systems each. With 4 to a page, the break
    // lands at system 4, which is the start of section 3 — proof the count
    // did not reset at sections 2, 3 or 4.
    const even = song([
      section('a', 'Intro', 8),
      section('b', 'Verse', 8),
      section('c', 'Chorus', 8),
      section('d', 'Outro', 8),
    ]);
    expect(songSystemOffsets(even)).toEqual([0, 2, 4, 6]);
    const html = renderToStaticMarkup(
      <ChordChart song={even} systemsPerPage={4} />,
    );
    expect(pageStarts(html)).toEqual([4]);
  });

  it('opens the page on a section heading, not between it and its staff', () => {
    const even = song([
      section('a', 'Intro', 8),
      section('b', 'Verse', 8),
      section('c', 'Chorus', 8),
    ]);
    const html = renderToStaticMarkup(
      <ChordChart song={even} systemsPerPage={4} />,
    );
    // The mark sits on the section wrapper (which carries data-chart-section),
    // not on the row div (which carries data-chart-system).
    const onSection = /data-chart-section="2"[^>]*data-page-start="4"/.test(
      html,
    );
    expect(onSection).toBe(true);
    expect(/data-chart-system="4"[^>]*data-page-start/.test(html)).toBe(false);
  });

  it('marks a page inside a section when the break falls there', () => {
    const one = song([section('long', 'Verse', 40)]); // 10 systems
    const html = renderToStaticMarkup(
      <ChordChart song={one} systemsPerPage={4} />,
    );
    expect(pageStarts(html)).toEqual([4, 8]);
    // Here the marks are on rows, because no section starts at 4 or 8.
    expect(/data-chart-system="4"[^>]*data-page-start="4"/.test(html)).toBe(
      true,
    );
  });

  it('leaves a chart shorter than a page as one page', () => {
    const short = song([section('a', 'Verse', 8)]); // 2 systems
    const html = renderToStaticMarkup(
      <ChordChart song={short} systemsPerPage={8} />,
    );
    expect(pageStarts(html)).toEqual([]);
  });
});
