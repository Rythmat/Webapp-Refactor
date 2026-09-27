import type { SongSection } from '@/curriculum/types/songLibrary';
import { sectionBars } from './performance';

/** Bars per system on a lead sheet. */
export const MEASURES_PER_SYSTEM = 4;

/**
 * Rows of `perRow` bars, a short last row left short.
 *
 * This is the shape an author asks for when they set `measuresPerRow`: "this
 * phrase reads three bars a row" is a decision about the phrase, and the row of
 * one it ends on is part of that decision, not a stub to tidy away.
 */
export function authoredRowSizes(barCount: number, perRow: number): number[] {
  const sizes: number[] = [];
  for (let i = 0; i < barCount; i += perRow)
    sizes.push(Math.min(perRow, barCount - i));
  return sizes;
}

/**
 * How a run of bars breaks into systems: rows of four, with a leftover one or
 * two bars (a second ending, a turnaround) folded into the row before as a
 * five- or six-bar system rather than left on a line of its own. A leftover
 * three stays a short row. The bars of a wider system are narrower; staff
 * height never changes.
 *
 * The fold belongs to widths we chose — the page default, and the reader's
 * device width. A width the author wrote down is theirs, and goes through
 * `authoredRowSizes` instead; `sectionRowSizes` tells the two apart.
 */
export function systemRowSizes(
  barCount: number,
  perRow: number = MEASURES_PER_SYSTEM,
): number[] {
  const sizes = authoredRowSizes(barCount, perRow);
  const last = sizes[sizes.length - 1];
  if (sizes.length > 1 && last <= 2 && last < perRow) {
    sizes.pop();
    sizes[sizes.length - 1] += last;
  }
  return sizes;
}

/**
 * The systems of one section, in reading order. This is the call a surface
 * drawing a section wants: it knows which of the two widths above applies.
 *
 * `perRow` is the reader's width — a phone reads two to a row where the page
 * reads four — and it overrides the chart's own width, folding like any width
 * we chose. With no reader width, a section that sets `measuresPerRow` is laid
 * out as written and a section that does not gets the four-bar default.
 */
export function sectionRowSizes(
  section: SongSection,
  perRow?: number,
): number[] {
  const barCount = sectionBars(section).length;
  if (perRow !== undefined) return systemRowSizes(barCount, perRow);
  return section.measuresPerRow !== undefined
    ? authoredRowSizes(barCount, section.measuresPerRow)
    : systemRowSizes(barCount);
}

/**
 * How many systems the sections above each one use, counting straight through
 * the chart.
 *
 * A page of a lead sheet holds a fixed number of staves, and sections do not
 * get to reset that count — otherwise "eight staves a page" would mean
 * something different in a song with six sections than in one with two. The
 * returned array is indexed like `song.sections`.
 */
export function songSystemOffsets(
  song: { sections: readonly SongSection[] },
  /** Bars across, when the reader is not using the chart's own width — a
   *  phone reads two to a row where the page reads four. */
  perRow?: number,
): number[] {
  const offsets: number[] = [];
  let used = 0;
  for (const section of song.sections) {
    offsets.push(used);
    used += sectionSystems(section, perRow);
  }
  return offsets;
}

const sectionSystems = (section: SongSection, perRow?: number): number =>
  sectionRowSizes(section, perRow).length;

/** Every system in the chart, in reading order. */
export function songSystemCount(
  song: { sections: readonly SongSection[] },
  perRow?: number,
): number {
  const offsets = songSystemOffsets(song, perRow);
  const last = song.sections[song.sections.length - 1];
  if (!last) return 0;
  return offsets[offsets.length - 1] + sectionSystems(last, perRow);
}

/**
 * Whether a page begins at this system. The chart's first system opens the
 * chart, not a page break, so it is never a page start.
 */
export function opensPage(system: number, systemsPerPage?: number): boolean {
  return !!systemsPerPage && system > 0 && system % systemsPerPage === 0;
}
