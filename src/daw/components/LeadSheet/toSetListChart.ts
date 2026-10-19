import { NOTES } from '@prism/engine';
import {
  measureSegments,
  regionToMeasures,
  parseChordDisplay,
  type Measure,
} from '@/daw/midi/leadSheetUtils';
import { ticksPerBar, ticksPerBeatUnit } from '@/daw/utils/timelineScale';
import { barSlots, slotOfBar } from '@/daw/time/timeModel';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { LeadSheetRepeat, LeadSheetSection } from '@/daw/store/uiSlice';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import type {
  ChordBar,
  ChordHit,
  SongMode,
  SongSection,
} from '@/curriculum/types/songLibrary';
import type { StoredChart } from '@/features/setlists/types';

/**
 * A Studio lead sheet, copied for a set list.
 *
 * Sending a chart to a set list is printing it: the set gets a page, not a
 * live view of the project. It has to be a copy, and not only because a player
 * may delete the project — a cloud project does not carry its chord symbols at
 * all (`serializeSessionForCloud` omits `chordRegions`, and opening one calls
 * `freshProjectHarmony()`), so the chart exists nowhere but this store while
 * the project is open. If the set held a reference, reopening the project
 * later would find the page blank.
 *
 * What comes across is what is on the screen: the same filtered measures, the
 * same section labels, repeats, multi-bar rests and fermatas, at the same
 * indices the staff draws them at, in the project's own metre — a 3/4 chart
 * has to reach the set in 3/4 or its bars are read a beat short.
 */

export interface StudioChartSource {
  projectName: string;
  composerName?: string;
  chordRegions: ChordRegion[];
  rootNote: number | null;
  mode: string;
  bpm: number;
  measuresPerLine: number;
  measureRowSizes: number[] | null;
  measureRestMap: Record<number, number> | null;
  measureFermatas: number[] | null;
  /** Bars added past the last chord; null or absent when none. */
  leadSheetBars?: number | null;
  /** The song's sections as the Lead Sheet marks them (leadSheetSectionsOf). */
  leadSheetSections: LeadSheetSection[];
  leadSheetRepeats: LeadSheetRepeat[];
  timeSignature: [number, number];
}

/** The song library writes 'major'/'minor' where the Studio says
 *  'ionian'/'aeolian'. Every other mode has the same name in both. */
const SONG_MODES: Record<string, SongMode> = {
  ionian: 'major',
  major: 'major',
  aeolian: 'minor',
  minor: 'minor',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  locrian: 'locrian',
};

/**
 * The library's chord-symbol spelling for one of the Studio's qualities:
 * a major triad is bare, a dominant drops the word ('dom7' → '7'), and
 * everything else reads as it is written ('min7', 'dim7', '7sus4').
 */
export function chartChordName(noteName: string): string {
  const { root, quality } = parseChordDisplay(noteName);
  if (!quality || quality === 'maj') return displayAccidentals(root);
  const suffix = quality.startsWith('dom') ? quality.slice(3) : quality;
  return displayAccidentals(root + suffix);
}

const barTicksOf = (source: StudioChartSource) =>
  ticksPerBar(source.timeSignature[0], source.timeSignature[1]);

/**
 * The measures the staff actually draws, one per chart slot: the bars a
 * multi-bar rest swallows are dropped, exactly as LeadSheetChartView drops
 * them (barSlots). Each keeps its real bar as `index`, which every mark is
 * stored by (leadsheet-05).
 */
function visibleMeasures(source: StudioChartSource): Measure[] {
  const raw = regionToMeasures(
    source.chordRegions,
    barTicksOf(source),
    source.leadSheetBars ?? null,
  );
  return barSlots(raw.length, source.measureRestMap).map(
    (slot) => raw[slot.realIndex],
  );
}

function barFrom(measure: Measure, source: StudioChartSource): ChordBar {
  // Beats are counted in the metre's own beat: an eighth in 6/8.
  const beatTicks = ticksPerBeatUnit(source.timeSignature[1]);
  // Marks are stored by real bar, not by place on the chart.
  const idx = measure.index;
  const chords: ChordHit[] = measureSegments(measure, barTicksOf(source))
    .filter((segment) => segment.chord)
    .map((segment) => ({
      degree: displayAccidentals(segment.chord?.name ?? ''),
      chordName: chartChordName(segment.chord?.noteName ?? ''),
      beat: 1 + segment.offsetTicks / beatTicks,
      duration: segment.durationTicks / beatTicks,
    }));

  const restBars = source.measureRestMap?.[idx];
  const bar: ChordBar = { chords: restBars ? [] : chords };
  if (restBars && restBars > 1) bar.restBars = restBars;
  if (source.measureFermatas?.includes(idx)) bar.fermata = true;
  if (source.leadSheetRepeats.some((r) => r.startMeasure === idx))
    bar.repeatStart = true;
  if (source.leadSheetRepeats.some((r) => r.endMeasure === idx))
    bar.repeatEnd = true;
  return bar;
}

/**
 * Where the player put section marks, as places on the chart (a section
 * stored at real bar 9 after a rest starts at the slot holding bar 9), in
 * order, always starting at the first slot so every bar belongs to a
 * section. A chart with no marks is one section.
 */
function sectionStarts(
  source: StudioChartSource,
  measures: readonly Measure[],
): { at: number; label: string }[] {
  const slots = measures.map((m) => ({
    realIndex: m.index,
    bars: Math.max(1, source.measureRestMap?.[m.index] ?? 1),
    rest: false,
  }));
  const marks = source.leadSheetSections
    .map((s) => ({ at: slotOfBar(slots, s.measureIdx), label: s.label.trim() }))
    .filter((s) => s.at >= 0)
    .sort((a, b) => a.at - b.at);
  if (marks.length === 0 || marks[0].at !== 0)
    marks.unshift({ at: 0, label: '' });
  return marks;
}

/** Row sizes the player set, when this section's bars all read the same
 *  width. Mixed widths fall back to the house four-to-a-system. */
function rowSizeFor(
  source: StudioChartSource,
  from: number,
  to: number,
): number | undefined {
  const sizes = source.measureRowSizes;
  if (!sizes || sizes.length === 0) return undefined;
  const inSection = new Set<number>();
  let at = 0;
  for (const size of sizes) {
    if (at >= to) break;
    if (at + size > from) inSection.add(size);
    at += size;
  }
  if (inSection.size !== 1) return undefined;
  const [only] = [...inSection];
  return only > 0 && only !== 4 ? only : undefined;
}

export function chartFromStudio(source: StudioChartSource): StoredChart {
  const measures = visibleMeasures(source);
  const bars = measures.map((measure) => barFrom(measure, source));
  const starts = sectionStarts(source, measures);

  const sections: SongSection[] = starts.map((start, i) => {
    const end = starts[i + 1]?.at ?? bars.length;
    const rowSize = rowSizeFor(source, start.at, end);
    const section: SongSection = {
      id: `studio_${i + 1}`,
      label: start.label,
      bars: bars.slice(start.at, end),
    };
    if (rowSize) section.measuresPerRow = rowSize;
    return section;
  });

  const mode = SONG_MODES[source.mode] ?? 'major';
  const root = source.rootNote ?? 0;
  const tonic = displayAccidentals(NOTES[root] ?? 'C');

  return {
    title: source.projectName.trim() || 'Untitled lead sheet',
    ...(source.composerName?.trim()
      ? { artist: source.composerName.trim() }
      : {}),
    key: `${tonic} ${mode}`,
    keyRoot: ((root % 12) + 12) % 12,
    mode,
    tempo: Math.round(source.bpm) || 120,
    timeSignature: source.timeSignature,
    sections: sections.filter((s) => s.bars.length > 0),
  };
}

/** True when this project has a lead sheet worth sending. */
export function hasSendableChart(source: StudioChartSource): boolean {
  return chartFromStudio(source).sections.some((s) =>
    s.bars.some((b) => b.chords.length > 0),
  );
}

/** What the update offer shows of a chart, before and after. */
export interface ChartSummary {
  /** Bars of music, a multi-bar rest counted by its bars. */
  bars: number;
  sections: number;
  chords: number;
  key: string;
}

export function chartSummary(
  chart: Pick<StoredChart, 'key' | 'sections'>,
): ChartSummary {
  const bars = chart.sections.flatMap((section) => section.bars);
  return {
    bars: bars.reduce((sum, bar) => sum + Math.max(1, bar.restBars ?? 1), 0),
    sections: chart.sections.length,
    chords: bars.reduce((sum, bar) => sum + bar.chords.length, 0),
    key: chart.key,
  };
}

/**
 * Whether sending `next` over the set's copy would lose what the set holds:
 * a chart with no chords, or one with fewer bars or sections. A project
 * reopened without its chord lane, or refreshed without its sections, looks
 * that way, and the set list may be the only place the chart survived, so
 * the update isn't offered then (leadsheet-04).
 */
export function updateWouldLoseChart(
  stored: Pick<StoredChart, 'key' | 'sections'>,
  next: Pick<StoredChart, 'key' | 'sections'>,
): boolean {
  const before = chartSummary(stored);
  const after = chartSummary(next);
  return (
    after.chords === 0 ||
    after.bars < before.bars ||
    after.sections < before.sections
  );
}
