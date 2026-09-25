import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { ChordChart } from '../ChordChart';

/**
 * A chart counts in its own metre.
 *
 * ChordChart hard-coded four beats a bar and never read `song.timeSignature`,
 * so the library's seventeen non-4/4 songs were all drawn wrong: Solsbury Hill
 * (7/4) got four slashes for seven beats, and the ten 6/8 songs got four for
 * six. Chord `beat` and `duration` are written in the numerator's units — a
 * 6/8 chart holds a chord for `duration: 6` — so the grid has to count the
 * same way the data does.
 */

const song = (timeSignature: [number, number]): Song =>
  ({
    id: 't',
    title: 'T',
    artist: 'T',
    key: 'C major',
    keyRoot: 0,
    mode: 'major',
    tempo: 120,
    timeSignature,
    difficulty: 1,
    genreTags: [],
    techniques: [],
    sections: [
      {
        id: 's',
        label: 'Verse',
        bars: [
          {
            chords: [
              {
                degree: '1 maj',
                chordName: 'C',
                beat: 1,
                duration: timeSignature[0],
              },
            ],
          },
        ],
      },
    ],
    audioSources: [],
    artistImageSource: 'none',
  }) as Song;

/** The rhythm slashes: one short diagonal line per beat, at 0.3 opacity. */
const beatMarks = (html: string): number =>
  [...html.matchAll(/<line[^>]*opacity="0\.3"[^>]*>/g)].length;

describe('beats per bar', () => {
  it('draws four for 4/4', () => {
    expect(
      beatMarks(renderToStaticMarkup(<ChordChart song={song([4, 4])} />)),
    ).toBe(4);
  });

  it('draws three for 3/4, not four', () => {
    expect(
      beatMarks(renderToStaticMarkup(<ChordChart song={song([3, 4])} />)),
    ).toBe(3);
  });

  it('draws six for 6/8', () => {
    expect(
      beatMarks(renderToStaticMarkup(<ChordChart song={song([6, 8])} />)),
    ).toBe(6);
  });

  it('draws seven for 7/4 — Solsbury Hill', () => {
    expect(
      beatMarks(renderToStaticMarkup(<ChordChart song={song([7, 4])} />)),
    ).toBe(7);
  });

  it('falls back to four when a chart has no metre at all', () => {
    const noMeter = { ...song([4, 4]) } as Song;
    delete (noMeter as { timeSignature?: unknown }).timeSignature;
    expect(beatMarks(renderToStaticMarkup(<ChordChart song={noMeter} />))).toBe(
      4,
    );
  });

  it('still renders every non-4/4 song in the library', () => {
    // Guard against a metre the grid maths cannot cope with.
    for (const ts of [
      [3, 4],
      [6, 4],
      [6, 8],
      [7, 4],
    ] as [number, number][]) {
      const html = renderToStaticMarkup(<ChordChart song={song(ts)} />);
      expect(html).toContain('<svg');
      expect(beatMarks(html)).toBe(ts[0]);
    }
  });
});
