import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import type { ChartSelection } from '@/lib/chartEditor/selection';
import { ChordChart } from '../ChordChart';

/**
 * The editor's bar selection, drawn on the chart.
 *
 * The chart is the selection surface — there is nowhere else to click a bar —
 * so it has to take a selection that can run across a section boundary and
 * show it without becoming a different component for the back office.
 */

const bar = (name: string): ChordBar => ({
  chords: [{ degree: '1 maj', chordName: name, beat: 1, duration: 4 }],
});

const section = (id: string, bars: ChordBar[]): SongSection => ({
  id,
  label: 'Verse',
  bars,
});

const song = (sections: SongSection[]): Song =>
  ({
    id: 't',
    title: 'T',
    artist: 'T',
    key: 'C major',
    keyRoot: 60,
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

const chart = song([
  section('a', [bar('C'), bar('F'), bar('G'), bar('C')]),
  section('b', [bar('Am'), bar('E')]),
]);

const bars = (sel?: ChartSelection) =>
  renderToStaticMarkup(
    <ChordChart song={chart} barSelection={sel} onPickBar={() => {}} />,
  );

/** The washes drawn behind selected staves. */
const highlights = (html: string) =>
  (html.match(/fill="#7ecfcf"/g) ?? []).length;

describe('ChordChart bar selection', () => {
  it('draws nothing when nothing is selected', () => {
    expect(highlights(bars())).toBe(0);
  });

  it('washes exactly the selected bars', () => {
    const sel: ChartSelection = {
      kind: 'bars',
      anchor: { section: 0, bar: 1 },
      refs: [
        { section: 0, bar: 1 },
        { section: 0, bar: 2 },
      ],
    };
    expect(highlights(bars(sel))).toBe(2);
  });

  it('carries a selection across a section boundary', () => {
    // A phrase does not stop being a phrase because the parser cut the
    // chart into blocks there.
    const sel: ChartSelection = {
      kind: 'bars',
      anchor: { section: 0, bar: 3 },
      refs: [
        { section: 0, bar: 3 },
        { section: 1, bar: 0 },
      ],
    };
    expect(highlights(bars(sel))).toBe(2);
  });

  it('ignores a chord selection, which is a different gesture', () => {
    const sel: ChartSelection = {
      kind: 'chords',
      anchor: { section: 0, bar: 0, chord: 0 },
      refs: [{ section: 0, bar: 0, chord: 0 }],
    };
    expect(highlights(bars(sel))).toBe(0);
  });

  it('gives every bar a target only when the editor is listening', () => {
    const editing = renderToStaticMarkup(
      <ChordChart song={chart} onPickBar={() => {}} />,
    );
    const reading = renderToStaticMarkup(<ChordChart song={chart} />);
    expect((editing.match(/click to select/g) ?? []).length).toBe(6);
    expect(reading).not.toContain('click to select');
  });
});
