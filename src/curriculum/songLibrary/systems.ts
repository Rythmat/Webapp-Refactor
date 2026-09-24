import type { SongSection } from '@/curriculum/types/songLibrary';
import { sectionBars } from './performance';

/** Bars per system on a lead sheet. */
export const MEASURES_PER_SYSTEM = 4;

/**
 * How a run of bars breaks into systems: rows of four, with a leftover one or
 * two bars (a second ending, a turnaround) folded into the row before as a
 * five- or six-bar system rather than left on a line of its own. A leftover
 * three stays a short row. The bars of a wider system are narrower; staff
 * height never changes.
 */
export function systemRowSizes(
  barCount: number,
  perRow: number = MEASURES_PER_SYSTEM,
): number[] {
  const sizes: number[] = [];
  for (let i = 0; i < barCount; i += perRow)
    sizes.push(Math.min(perRow, barCount - i));
  const last = sizes[sizes.length - 1];
  if (sizes.length > 1 && last <= 2 && last < perRow) {
    sizes.pop();
    sizes[sizes.length - 1] += last;
  }
  return sizes;
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
export function songSystemOffsets(song: {
  sections: readonly SongSection[];
}): number[] {
  const offsets: number[] = [];
  let used = 0;
  for (const section of song.sections) {
    offsets.push(used);
    used += systemRowSizes(
      sectionBars(section).length,
      section.measuresPerRow ?? MEASURES_PER_SYSTEM,
    ).length;
  }
  return offsets;
}

/** Every system in the chart, in reading order. */
export function songSystemCount(song: {
  sections: readonly SongSection[];
}): number {
  const offsets = songSystemOffsets(song);
  const last = song.sections[song.sections.length - 1];
  if (!last) return 0;
  return (
    offsets[offsets.length - 1] +
    systemRowSizes(
      sectionBars(last).length,
      last.measuresPerRow ?? MEASURES_PER_SYSTEM,
    ).length
  );
}

/**
 * Whether a page begins at this system. The chart's first system opens the
 * chart, not a page break, so it is never a page start.
 */
export function opensPage(system: number, systemsPerPage?: number): boolean {
  return !!systemsPerPage && system > 0 && system % systemsPerPage === 0;
}
