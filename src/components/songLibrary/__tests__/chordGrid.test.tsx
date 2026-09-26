import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { songSystemCount } from '@/curriculum/songLibrary/systems';
import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import { ChordChart } from '../ChordChart';
import { ChordGrid, chartTypeScale, tightestChordSlot } from '../ChordGrid';

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
/** Eight two-chord bars: rows of exactly four, nothing folded in. */
const eight2 = () => Array.from({ length: 8 }, () => bar('C', 'F'));
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

  it('writes the same chords the staff chart does, in a jazz chart hand', () => {
    // Same chord, less room: a dash for minor, a triangle for a major
    // seventh, a circle for diminished, a slashed one for half-diminished,
    // a plus for augmented. This is what makes four bars fit across a phone.
    const jazz: Record<string, string> = {
      Amin7: 'A−7',
      Cmaj7: 'CΔ7',
      'D♯dim': 'D♯°',
      'F♯dim7': 'F♯°7',
      'F♯min7♭5': 'F♯ø7',
      'B♭(♯5)': 'B♭+',
      'B♭7sus4': 'B♭7sus4',
      'E♭/G': 'E♭/G',
      C: 'C',
    };
    const s = song([
      section(
        'a',
        'Verse',
        Object.keys(jazz).map((n) => bar(n)),
      ),
    ]);
    const staff = renderToStaticMarkup(<ChordChart song={s} />);
    const grid = renderToStaticMarkup(<ChordGrid song={s} />);
    for (const [written, shorthand] of Object.entries(jazz)) {
      // The symbol is set in pieces, so the letters are matched one by one.
      for (const piece of shorthand.split(/(?<=.)/))
        expect(grid).toContain(piece);
      // The staff has the room and keeps the chart's own spelling.
      expect(staff).toContain(written);
    }
    // A minor chord is never spelled out in the grid.
    expect(grid).not.toContain('min7');
  });

  it('leaves a chord the shorthand cannot write exactly as written', () => {
    const s = song([section('a', 'Verse', [bar('N.C.'), bar('F7(no 3)')])]);
    const grid = renderToStaticMarkup(<ChordGrid song={s} />);
    expect(grid).toContain('N.C.');
    expect(grid).toContain('7(no 3)');
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
    expect(html.match(/<button/g) ?? []).toHaveLength(1);
  });

  it('writes the time signature once, before the first bar', () => {
    const html = renderToStaticMarkup(<ChordGrid song={chart} />);
    expect(html.match(/4\/4 time/g) ?? []).toHaveLength(1);
  });
});

/** Where the chords sit in the bar, and how big they are set. */

const lefts = (html: string): string[] =>
  [...html.matchAll(/left:([\d.]+)%/g)].map((m) => m[1]);

/** Distinct sizes of the chord letters — the clamp that floors at 13px. */
const chordSizes = (html: string): string[] => [
  ...new Set(
    [...html.matchAll(/font-size:(clamp\(13px[^;"]*\))/g)].map((m) => m[1]),
  ),
];

describe('ChordGrid placement', () => {
  it('puts a chord where it is played, not against the left edge', () => {
    const s = song([
      section('a', 'Verse', [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ]),
    ]);
    // Beat 1 against the barline, beat 3 halfway across.
    expect(lefts(renderToStaticMarkup(<ChordGrid song={s} />))).toEqual([
      '0.000',
      '50.000',
    ]);
  });

  it('measures the beat against the song own metre', () => {
    const waltz = {
      ...song([
        section('a', 'Verse', [
          {
            chords: [
              { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
              { degree: '5 maj', chordName: 'G', beat: 2, duration: 2 },
            ],
          },
        ]),
      ]),
      timeSignature: [3, 4] as [number, number],
    };
    // Beat 2 of three is a third of the way in, not a quarter.
    expect(lefts(renderToStaticMarkup(<ChordGrid song={waltz} />))).toEqual([
      '0.000',
      '33.333',
    ]);
  });

  it('sets the whole chart at one size, however full a bar is', () => {
    // The verse has two chords to a bar and the chorus one. Sizing each bar
    // by its own chord count made the chorus come out half again as big.
    const s = song([
      section('verse', 'Verse', [bar('C', 'F'), bar('G', 'Am7')]),
      section('chorus', 'Chorus', [bar('C'), bar('G')]),
    ]);
    expect(
      chordSizes(renderToStaticMarkup(<ChordGrid song={s} />)),
    ).toHaveLength(1);
  });

  it('sets a chart of quick changes smaller than a chart of slow ones', () => {
    const slow = song([section('a', 'Verse', [bar('C')])]);
    const quick = song([
      section('a', 'Verse', [
        {
          chords: ['C', 'F', 'G', 'Am7'].map((chordName, i) => ({
            degree: '1 maj',
            chordName,
            beat: 1 + i,
            duration: 1,
          })),
        },
      ]),
    ]);
    const [slowSize] = chordSizes(
      renderToStaticMarkup(<ChordGrid song={slow} />),
    );
    const [quickSize] = chordSizes(
      renderToStaticMarkup(<ChordGrid song={quick} />),
    );
    const cqw = (s: string) => Number(/([\d.]+)cqw/.exec(s)![1]);
    expect(cqw(quickSize)).toBeLessThan(cqw(slowSize));
  });
});

describe('chartTypeScale', () => {
  it('does not depend on any one bar — only on the chart', () => {
    expect(chartTypeScale(4, 0.5)).toEqual(chartTypeScale(4, 0.5));
  });

  it('gives a chord more room when fewer bars share the row', () => {
    const four = Number(/([\d.]+)cqw/.exec(chartTypeScale(4, 0.5).chord)![1]);
    const two = Number(/([\d.]+)cqw/.exec(chartTypeScale(2, 0.5).chord)![1]);
    expect(two).toBeCloseTo(four * 2, 1);
  });

  it('is set for the widest row in the chart, not the nominal one', () => {
    // Ten bars row as 4 + 6, and type set for four would run over a barline.
    const ten = song([
      section(
        'a',
        'Verse',
        Array.from({ length: 10 }, () => bar('C', 'F')),
      ),
    ]);
    const eightBars = song([section('a', 'Verse', eight2())]);
    const cqw = (html: string) =>
      Number(/([\d.]+)cqw/.exec(chordSizes(html)[0])![1]);
    expect(cqw(renderToStaticMarkup(<ChordGrid song={ten} />))).toBeLessThan(
      cqw(renderToStaticMarkup(<ChordGrid song={eightBars} />)),
    );
  });

  it('floors and caps, so a phone stays legible and a wall stays sane', () => {
    expect(chartTypeScale(4, 0.5).chord).toMatch(/^clamp\(13px, .*, 26px\)$/);
  });
});

describe('tightestChordSlot', () => {
  const withBars = (bars: ChordBar[], ts: [number, number] = [4, 4]) => ({
    ...song([section('a', 'Verse', bars)]),
    timeSignature: ts,
  });

  it('gives a whole bar to a chord that has one', () => {
    expect(tightestChordSlot(withBars([bar('C')]))).toBe(1);
  });

  it('halves it for two chords, quarters it for four', () => {
    expect(tightestChordSlot(withBars([bar('C', 'F')]))).toBe(0.5);
    expect(
      tightestChordSlot(
        withBars([
          {
            chords: ['C', 'F', 'G', 'Am7'].map((chordName, i) => ({
              degree: '1 maj',
              chordName,
              beat: 1 + i,
              duration: 1,
            })),
          },
        ]),
      ),
    ).toBe(0.25);
  });

  it('takes the tightest bar in the song, so the chart never changes size', () => {
    expect(tightestChordSlot(withBars([bar('C'), bar('C', 'F')]))).toBe(0.5);
  });

  it('stops at a quarter — past that, let the symbols run close', () => {
    const sixteenths = {
      chords: Array.from({ length: 8 }, (_, i) => ({
        degree: '1 maj',
        chordName: 'C',
        beat: 1 + i * 0.5,
        duration: 0.5,
      })),
    };
    expect(tightestChordSlot(withBars([sixteenths]))).toBe(0.25);
  });

  it('leaves a chart with no chords alone', () => {
    expect(tightestChordSlot(withBars([{ chords: [], restBars: 4 }]))).toBe(1);
  });
});
