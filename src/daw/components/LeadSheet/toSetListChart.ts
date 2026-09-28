import { NOTES } from '@prism/engine';
import {
  measureSegments,
  regionToMeasures,
  parseChordDisplay,
  type Measure,
} from '@/daw/midi/leadSheetUtils';
import { ticksPerBar, ticksPerBeatUnit } from '@/daw/utils/timelineScale';
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

/** The measures the staff actually draws: ghost bars swallowed by a multi-bar
 *  rest are dropped, exactly as LeadSheetChartView drops them. */
function visibleMeasures(source: StudioChartSource): Measure[] {
  const raw = regionToMeasures(
    source.chordRegions,
    ticksPerBar(source.timeSignature[0], source.timeSignature[1]),
  );
  const rest = source.measureRestMap;
  if (!rest) return raw;
  const skip = new Set<number>();
  for (const [key, count] of Object.entries(rest)) {
    const idx = Number(key);
    for (let j = 1; j < count; j++) skip.add(idx + j);
  }
  return skip.size === 0 ? raw : raw.filter((m) => !skip.has(m.index));
}

function barFrom(
  measure: Measure,
  idx: number,
  source: StudioChartSource,
): ChordBar {
  // Beats are counted in the metre's own beat: an eighth in 6/8.
  const beatTicks = ticksPerBeatUnit(source.timeSignature[1]);
  const chords: ChordHit[] = measureSegments(measure)
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
 * Where the player put section marks, in order, always starting at bar 0 so
 * every bar belongs to a section. A chart with no marks is one section.
 */
function sectionStarts(
  source: StudioChartSource,
  barCount: number,
): { at: number; label: string }[] {
  const marks = source.leadSheetSections
    .filter((s) => s.measureIdx >= 0 && s.measureIdx < barCount)
    .map((s) => ({ at: s.measureIdx, label: s.label.trim() }))
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
  const bars = measures.map((measure, idx) => barFrom(measure, idx, source));
  const starts = sectionStarts(source, bars.length);

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
