import { describe, expect, it } from 'vitest';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  chartChordName,
  chartFromStudio,
  hasSendableChart,
  type StudioChartSource,
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
