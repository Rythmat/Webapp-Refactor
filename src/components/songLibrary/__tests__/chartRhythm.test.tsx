import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  ChordBar,
  RhythmEvent,
  Song,
} from '@/curriculum/types/songLibrary';
import { ChordChart } from '../ChordChart';
import { beatName } from '../RhythmSlashes';

/**
 * A bar's rhythm on the chart (owner, 2026-11-12): a bar that has one draws
 * it in slashes with stems, beams, rests and ties; a bar that has none keeps
 * the plain slash a beat every chart had.
 */

const ev = (value: RhythmEvent['value'], extra: Partial<RhythmEvent> = {}) =>
  ({ value, ...extra }) as RhythmEvent;

const song = (bars: ChordBar[]): Song =>
  ({
    id: 't',
    title: 'T',
    artist: 'T',
    key: 'C major',
    keyRoot: 0,
    mode: 'major',
    tempo: 120,
    timeSignature: [4, 4],
    difficulty: 1,
    genreTags: [],
    techniques: [],
    sections: [{ id: 'v', label: 'Verse', bars }],
    audioSources: [],
    artistImageSource: 'none',
  }) as Song;

const C = { degree: '1 maj', chordName: 'C', beat: 1, duration: 4 };

describe('a bar’s rhythm', () => {
  it('draws only the bars that have one', () => {
    const html = renderToStaticMarkup(
      <ChordChart
        song={song([
          { chords: [C] },
          {
            chords: [C],
            rhythm: [
              ev('4'),
              ev('4'),
              ev('4'),
              ev('8'),
              ev('8', { tie: true }),
            ],
          },
          { chords: [C] },
        ])}
      />,
    );
    expect(html.split('data-rhythm=""').length - 1).toBe(1);
  });

  it('beams the eighths, ties the push, and draws a rest', () => {
    const rhythm = (events: RhythmEvent[]) =>
      renderToStaticMarkup(
        <ChordChart
          song={song([{ chords: [C], rhythm: events }, { chords: [] }])}
        />,
      );
    const count = (html: string, attr: string) =>
      html.split(` ${attr}=`).length - 1;
    const push = rhythm([
      ev('4', { plain: true }),
      ev('4', { plain: true }),
      ev('4', { plain: true }),
      ev('8'),
      ev('8', { tie: true }),
    ]);
    // Beats 1–3 stay standard slashes beside the beamed eighths of 4, the
    // second tied over the barline.
    expect(count(push, 'data-plain-slash')).toBe(3);
    expect(count(push, 'data-beam')).toBe(1);
    expect(count(push, 'data-tie')).toBe(1);
    expect(count(push, 'data-flag')).toBe(0);
    // A lone eighth keeps its flag instead.
    const flag = rhythm([ev('4', { dot: true }), ev('8'), ev('2')]);
    expect(count(flag, 'data-beam')).toBe(0);
    expect(count(flag, 'data-flag')).toBe(1);
    // A half rest is a block on the middle line.
    expect(rhythm([ev('2', { rest: true }), ev('2')])).toContain(
      'data-rest="half"',
    );
  });

  it('draws a stem down where it is written so, its group with it', () => {
    const html = renderToStaticMarkup(
      <ChordChart
        song={song([
          {
            chords: [C],
            rhythm: [
              ev('4'),
              ev('4', { stem: 'down' }),
              ev('4'),
              ev('8', { stem: 'down' }),
              ev('8', { stem: 'down' }),
            ],
          },
        ])}
      />,
    );
    const stems = [...html.matchAll(/data-stem="(up|down)"/g)].map((m) => m[1]);
    expect(stems).toEqual(['up', 'down', 'up', 'down', 'down']);
  });
});

describe('a beat as a player counts it', () => {
  it('names the and, the e and the a', () => {
    expect(beatName(4)).toBe('4');
    expect(beatName(4.5)).toBe('4+');
    expect(beatName(2.25)).toBe('2e');
    expect(beatName(2.75)).toBe('2a');
  });
});

describe('a chord symbol (owner, 2026-11-15)', () => {
  it('sets a slash chord’s slash thin, between bold letters', () => {
    const html = renderToStaticMarkup(
      <ChordChart
        song={song([
          {
            chords: [
              { degree: '5 maj/7', chordName: 'B/F♯', beat: 1, duration: 4 },
            ],
          },
        ])}
      />,
    );
    expect(html).toMatch(
      /font-weight="bold"[^>]*>B<tspan data-chord-slash="" font-weight="normal"[^>]*>\/<\/tspan><tspan[^>]*>F♯<\/tspan>/,
    );
  });
});
