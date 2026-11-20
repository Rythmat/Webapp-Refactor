import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import { ChordChart } from '../ChordChart';

/**
 * The barlines a chart writes without being told (owner, 2026-11-12): a
 * double barline before every new section, a final barline at the end of
 * the song. An end-repeat keeps its own. And an ending's bracket prints its
 * own words when it has them.
 */

const bar = (extra: Partial<ChordBar> = {}): ChordBar => ({
  chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
  ...extra,
});

const song = (sections: SongSection[]): Song =>
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
    sections,
    audioSources: [],
    artistImageSource: 'none',
  }) as Song;

const count = (html: string, kind: 'double' | 'final') =>
  html.split(`data-barline="${kind}"`).length - 1;

describe('automatic barlines', () => {
  it('doubles the line before each new section, and ends the song with a final one', () => {
    const html = renderToStaticMarkup(
      <ChordChart
        song={song([
          { id: 'v', label: 'Verse', bars: [bar(), bar(), bar()] },
          { id: 'c', label: 'Chorus', bars: [bar(), bar()] },
          { id: 'o', label: 'Outro', bars: [bar()] },
        ])}
      />,
    );
    expect(count(html, 'double')).toBe(2);
    expect(count(html, 'final')).toBe(1);
  });

  it('leaves a section that ends on a repeat its repeat sign', () => {
    const html = renderToStaticMarkup(
      <ChordChart
        song={song([
          { id: 'v', label: 'Verse', bars: [bar(), bar({ repeatEnd: true })] },
          { id: 'c', label: 'Chorus', bars: [bar(), bar({ repeatEnd: true })] },
        ])}
      />,
    );
    expect(count(html, 'double')).toBe(0);
    expect(count(html, 'final')).toBe(0);
  });

  it('gives a one-section song only its final barline', () => {
    const html = renderToStaticMarkup(
      <ChordChart
        song={song([{ id: 'v', label: 'Verse', bars: [bar(), bar()] }])}
      />,
    );
    expect(count(html, 'double')).toBe(0);
    expect(count(html, 'final')).toBe(1);
  });
});

describe('an ending’s words', () => {
  it('prints them over the bracket, else the passes', () => {
    const html = renderToStaticMarkup(
      <ChordChart
        song={song([
          {
            id: 'v',
            label: 'Verse',
            bars: [
              bar({ repeatStart: true }),
              bar({ ending: [1, 2, 3], endingLabel: '1.–3.', repeatEnd: true }),
              bar({ ending: [4] }),
            ],
          },
        ])}
      />,
    );
    expect(html).toContain('1.–3.');
    expect(html).toContain('>4.<');
  });
});
