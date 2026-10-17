import { describe, expect, it } from 'vitest';
import type { SongSection } from '@/daw/model/sections';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { leadSheetSectionsOf } from '@/daw/store/sectionsSlice';
import {
  chartChordName,
  chartFromStudio,
  hasSendableChart,
  type StudioChartSource,
  chartSummary,
  updateWouldLoseChart,
} from '../toSetListChart';

const BAR = 1920;

const region = (
  bar: number,
  beat: number,
  name: string,
  noteName: string,
  bars = 1,
): ChordRegion => ({
  id: `r${bar}.${beat}`,
  startTick: bar * BAR + (beat - 1) * 480,
  endTick: bar * BAR + (beat - 1) * 480 + bars * BAR,
  name,
  noteName,
  color: [0, 0, 0],
});

const source = (over: Partial<StudioChartSource> = {}): StudioChartSource => ({
  projectName: 'Blues in G',
  chordRegions: [
    region(0, 1, '1 maj', 'G maj'),
    region(1, 1, '4 maj', 'C maj'),
    region(2, 1, '5 dom7', 'D dom7'),
    region(3, 1, '1 maj', 'G maj'),
  ],
  rootNote: 7,
  mode: 'ionian',
  bpm: 96,
  measuresPerLine: 4,
  measureRowSizes: null,
  measureRestMap: null,
  measureFermatas: null,
  leadSheetSections: [],
  leadSheetRepeats: [],
  timeSignature: [4, 4],
  ...over,
});

describe('chartChordName', () => {
  it('writes chord symbols the way the song library writes them', () => {
    expect(chartChordName('G maj')).toBe('G');
    expect(chartChordName('A min7')).toBe('Amin7');
    expect(chartChordName('D dom7')).toBe('D7');
    expect(chartChordName('Bb dom7sus4')).toBe('B♭7sus4');
    expect(chartChordName('F# dim7')).toBe('F♯dim7');
    expect(chartChordName('C maj7')).toBe('Cmaj7');
  });
});

describe('chartFromStudio', () => {
  it('copies the chart as it reads on the screen', () => {
    const chart = chartFromStudio(source());
    expect(chart.title).toBe('Blues in G');
    expect(chart.key).toBe('G major');
    expect(chart.keyRoot).toBe(7);
    expect(chart.mode).toBe('major');
    expect(chart.tempo).toBe(96);
    expect(chart.timeSignature).toEqual([4, 4]);
    expect(chart.sections).toHaveLength(1);
    expect(chart.sections[0].bars.map((b) => b.chords[0].chordName)).toEqual([
      'G',
      'C',
      'D7',
      'G',
    ]);
    expect(chart.sections[0].bars[2].chords[0].degree).toBe('5 dom7');
  });

  it('puts two chords in a bar on their own beats', () => {
    const chart = chartFromStudio(
      source({
        chordRegions: [
          { ...region(0, 1, '1 maj', 'G maj'), endTick: 960 },
          region(0, 3, '6 min7', 'E min7'),
        ],
      }),
    );
    expect(chart.sections[0].bars[0].chords).toEqual([
      { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
      { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 2 },
    ]);
  });

  it('splits at the section marks the player set', () => {
    const chart = chartFromStudio(
      source({
        leadSheetSections: [
          { measureIdx: 0, label: 'Intro' },
          { measureIdx: 2, label: 'Verse' },
        ],
      }),
    );
    expect(chart.sections.map((s) => s.label)).toEqual(['Intro', 'Verse']);
    expect(chart.sections.map((s) => s.bars.length)).toEqual([2, 2]);
  });

  it("splits at the song's sections, in the project's own bars", () => {
    // The set list gets the sections as the Lead Sheet marks them: each at
    // the bar it starts in, and a 3/4 bar is 1440 ticks, not 1920.
    const BAR_34 = 1440;
    const sections: SongSection[] = [
      {
        id: 'a',
        type: 'intro',
        label: 'Intro',
        startTick: 0,
        endTick: BAR_34,
      },
      {
        id: 'b',
        type: 'verse',
        label: 'Verse 1',
        startTick: BAR_34,
        endTick: 4 * BAR_34,
      },
    ];
    const chart = chartFromStudio(
      source({
        timeSignature: [3, 4],
        chordRegions: [0, 1, 2, 3].map((bar) => ({
          ...region(bar, 1, '1 maj', 'G maj'),
          startTick: bar * BAR_34,
          endTick: (bar + 1) * BAR_34,
        })),
        leadSheetSections: leadSheetSectionsOf({
          sections,
          timeSignatureNumerator: 3,
          timeSignatureDenominator: 4,
        }),
      }),
    );
    expect(chart.sections.map((s) => s.label)).toEqual(['Intro', 'Verse 1']);
    expect(chart.sections.map((s) => s.bars.length)).toEqual([1, 3]);
  });

  it('gives the bars before the first mark a section of their own', () => {
    const chart = chartFromStudio(
      source({ leadSheetSections: [{ measureIdx: 2, label: 'Chorus' }] }),
    );
    expect(chart.sections.map((s) => s.label)).toEqual(['', 'Chorus']);
    expect(chart.sections[0].bars).toHaveLength(2);
  });

  it('carries repeats, fermatas and multi-bar rests', () => {
    const chart = chartFromStudio(
      source({
        leadSheetRepeats: [{ startMeasure: 0, endMeasure: 3 }],
        measureFermatas: [3],
      }),
    );
    const bars = chart.sections[0].bars;
    expect(bars[0].repeatStart).toBe(true);
    expect(bars[3].repeatEnd).toBe(true);
    expect(bars[3].fermata).toBe(true);
    expect(bars[1].repeatStart).toBeUndefined();
  });

  it('drops the bars a multi-bar rest swallows, as the staff does', () => {
    const chart = chartFromStudio(source({ measureRestMap: { 1: 2 } }));
    const bars = chart.sections[0].bars;
    expect(bars).toHaveLength(3);
    expect(bars[1].restBars).toBe(2);
    expect(bars[1].chords).toEqual([]);
    // Bar 2 was swallowed, so what follows is the last written bar.
    expect(bars[2].chords[0].chordName).toBe('G');
  });

  it('reads every mark after a rest at its real bar (leadsheet-05)', () => {
    // Eight bars, a two-bar rest at bar 1, the Chorus mark on real bar 4 and
    // a fermata on real bar 5. On the chart the rest is one slot, so bar 4
    // is the chart's fourth place, not its fifth.
    const chart = chartFromStudio(
      source({
        chordRegions: [
          region(0, 1, '1 maj', 'G maj'),
          region(3, 1, '4 maj', 'C maj'),
          region(4, 1, '5 dom7', 'D dom7'),
          region(5, 1, '1 maj', 'G maj', 3),
        ],
        measureRestMap: { 1: 2 },
        measureFermatas: [5],
        leadSheetSections: [{ measureIdx: 4, label: 'Chorus' }],
        leadSheetRepeats: [{ startMeasure: 4, endMeasure: 5 }],
      }),
    );
    expect(chart.sections.map((sec) => sec.label)).toEqual(['', 'Chorus']);
    const [verse, chorus] = chart.sections;
    expect(verse.bars.map((b) => b.restBars ?? b.chords[0]?.chordName)).toEqual(
      ['G', 2, 'C'],
    );
    expect(chorus.bars[0].chords[0].chordName).toBe('D7');
    expect(chorus.bars[0].repeatStart).toBe(true);
    expect(chorus.bars[1]).toMatchObject({ fermata: true, repeatEnd: true });
  });

  it("times the chords in the project's metre: a 3/4 bar is three beats", () => {
    const BAR_34 = 1440;
    const chart = chartFromStudio(
      source({
        timeSignature: [3, 4],
        chordRegions: [
          {
            ...region(0, 1, '1 maj', 'G maj'),
            startTick: 0,
            endTick: BAR_34,
          },
          {
            ...region(1, 1, '4 maj', 'C maj'),
            startTick: BAR_34,
            endTick: BAR_34 + 960,
          },
          {
            ...region(1, 3, '5 maj', 'D maj'),
            startTick: BAR_34 + 960,
            endTick: 2 * BAR_34,
          },
        ],
      }),
    );
    const [first, second] = chart.sections[0].bars;
    expect(first.chords).toEqual([
      expect.objectContaining({ beat: 1, duration: 3 }),
    ]);
    expect(second.chords.map((c) => [c.beat, c.duration])).toEqual([
      [1, 2],
      [3, 1],
    ]);
  });

  it('keeps a line width the player set throughout a section', () => {
    expect(
      chartFromStudio(source({ measureRowSizes: [2, 2] })).sections[0]
        .measuresPerRow,
    ).toBe(2);
    // Mixed widths fall back to the house four-to-a-system.
    expect(
      chartFromStudio(source({ measureRowSizes: [3, 1] })).sections[0]
        .measuresPerRow,
    ).toBeUndefined();
  });

  it('writes the modes by the names the song library uses', () => {
    expect(chartFromStudio(source({ mode: 'aeolian', rootNote: 9 })).key).toBe(
      'A minor',
    );
    expect(chartFromStudio(source({ mode: 'mixolydian' })).mode).toBe(
      'mixolydian',
    );
  });

  it('survives a project with no key, no name and no chords', () => {
    const chart = chartFromStudio(
      source({ projectName: '  ', rootNote: null, chordRegions: [] }),
    );
    expect(chart.title).toBe('Untitled lead sheet');
    expect(chart.key).toBe('C major');
    // The Studio draws four blank bars for an empty sheet, so the copy has
    // them too — but there is nothing to send.
    expect(chart.sections[0].bars).toHaveLength(4);
    expect(chart.sections[0].bars.every((b) => b.chords.length === 0)).toBe(
      true,
    );
    expect(hasSendableChart(source({ chordRegions: [] }))).toBe(false);
    expect(hasSendableChart(source())).toBe(true);
  });

  it('leaves out chords the Studio would not draw', () => {
    const shy = { ...region(1, 1, '4 maj', 'C maj'), confidence: 0.2 };
    const chart = chartFromStudio(
      source({ chordRegions: [region(0, 1, '1 maj', 'G maj'), shy] }),
    );
    expect(chart.sections[0].bars[1].chords).toEqual([]);
  });
});

describe('what an update would do to a set’s copy', () => {
  const bar = (chords = 1, restBars?: number) => ({
    chords: Array.from({ length: chords }, () => ({
      degree: '1',
      chordName: 'C',
      beat: 1,
      duration: 4,
    })),
    ...(restBars ? { restBars } : {}),
  });
  const chart = (sections: ReturnType<typeof bar>[][], key = 'C major') => ({
    key,
    sections: sections.map((bars, i) => ({
      id: `s${i}`,
      label: String.fromCharCode(65 + i),
      bars,
    })),
  });

  it('counts bars (a multi-bar rest by its bars), sections and chords', () => {
    expect(chartSummary(chart([[bar(2), bar(0, 4)], [bar()]]))).toEqual({
      bars: 6,
      sections: 2,
      chords: 3,
      key: 'C major',
    });
  });

  it('would lose the chart with no chords, fewer bars or fewer sections', () => {
    const stored = chart([[bar(), bar()], [bar()]]);
    expect(
      updateWouldLoseChart(stored, chart([[bar(0), bar(0)], [bar(0)]])),
    ).toBe(true);
    expect(updateWouldLoseChart(stored, chart([[bar()], [bar()]]))).toBe(true);
    expect(updateWouldLoseChart(stored, chart([[bar(), bar(), bar()]]))).toBe(
      true,
    );
    expect(
      updateWouldLoseChart(
        stored,
        chart([
          [bar(), bar()],
          [bar(), bar()],
        ]),
      ),
    ).toBe(false);
  });
});
