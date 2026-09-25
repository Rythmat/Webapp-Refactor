import type {
  ChordBar,
  RoadmapJump,
  SongSection,
} from '@/curriculum/types/songLibrary';
import type { BarRef } from './selection';

/**
 * Editing a chart's roadmap — the marks that say how it is read.
 *
 * Every one of these already exists in the schema and none of them could be
 * edited: repeat barlines, volta brackets, segno, coda, D.S., Fine, fermatas,
 * multi-bar rests, cues like "Break", and mid-song key changes. A chart is
 * mostly roadmap once it is right, which is why correcting one by hand takes
 * half an hour.
 *
 * Everything works on a **selection of bars**, not one bar, because that is
 * how the marks are actually used: four bars are the first ending, not one.
 * Pure functions on `SongSection[]`, matching the existing chartOps.
 */

/** Marks that are simply on or off. */
export type BarFlag =
  | 'repeatStart'
  | 'repeatEnd'
  | 'segno'
  | 'coda'
  | 'toCoda'
  | 'fine'
  | 'fermata';

/** Marks that carry a value. */
export interface BarValues {
  cue: string;
  keyChange: string;
  jump: RoadmapJump;
  repeatTimes: number;
  restBars: number;
}

const editBars = (
  sections: readonly SongSection[],
  refs: readonly BarRef[],
  edit: (bar: ChordBar) => ChordBar,
): SongSection[] => {
  const bySection = new Map<number, Set<number>>();
  for (const ref of refs) {
    if (!bySection.has(ref.section)) bySection.set(ref.section, new Set());
    bySection.get(ref.section)!.add(ref.bar);
  }
  return sections.map((section, si) => {
    const wanted = bySection.get(si);
    if (!wanted) return section;
    return {
      ...section,
      bars: section.bars.map((bar, bi) => (wanted.has(bi) ? edit(bar) : bar)),
    };
  });
};

const has = (
  sections: readonly SongSection[],
  refs: readonly BarRef[],
  flag: BarFlag,
): boolean =>
  refs.length > 0 &&
  refs.every((r) => !!sections[r.section]?.bars[r.bar]?.[flag]);

/**
 * Turn a mark on across the selection, or off if every selected bar already
 * has it — the behaviour of every toggle a person has ever used.
 */
export function toggleBarFlag(
  sections: readonly SongSection[],
  refs: readonly BarRef[],
  flag: BarFlag,
): SongSection[] {
  if (refs.length === 0) return [...sections];
  const turnOff = has(sections, refs, flag);
  return editBars(sections, refs, (bar) => {
    const next: ChordBar = { ...bar };
    if (turnOff) delete next[flag];
    else next[flag] = true;
    return next;
  });
}

/** Set a mark that carries a value; an empty value clears it. */
export function setBarValue<K extends keyof BarValues>(
  sections: readonly SongSection[],
  refs: readonly BarRef[],
  field: K,
  value: BarValues[K] | undefined,
): SongSection[] {
  if (refs.length === 0) return [...sections];
  const clear =
    value === undefined ||
    value === '' ||
    (typeof value === 'number' && !Number.isFinite(value));
  return editBars(sections, refs, (bar) => {
    const next: ChordBar = { ...bar };
    if (clear) delete next[field];
    else next[field] = value as ChordBar[K];
    return next;
  });
}

/**
 * Bracket the selected bars as an ending.
 *
 * `[1]` is the first-time bars, `[2]` the second, `[1, 2]` a bracket over both
 * passes. Passing nothing takes the bracket off.
 */
export function setEnding(
  sections: readonly SongSection[],
  refs: readonly BarRef[],
  passes: readonly number[] | undefined,
): SongSection[] {
  if (refs.length === 0) return [...sections];
  const wanted = passes?.filter((p) => Number.isInteger(p) && p > 0) ?? [];
  return editBars(sections, refs, (bar) => {
    const next: ChordBar = { ...bar };
    if (wanted.length === 0) delete next.ending;
    else next.ending = [...new Set(wanted)].sort((a, b) => a - b);
    return next;
  });
}

/**
 * Strip every roadmap mark from the selected bars.
 *
 * The way out of a chart the parser marked up wrongly: clear it and write the
 * form in by hand, rather than hunting each stray flag.
 */
export function clearRoadmap(
  sections: readonly SongSection[],
  refs: readonly BarRef[],
): SongSection[] {
  if (refs.length === 0) return [...sections];
  return editBars(sections, refs, (bar) => ({
    chords: bar.chords,
    ...(bar.restBars ? { restBars: bar.restBars } : {}),
  }));
}

/** Whether every selected bar carries this mark — for a pressed-in button. */
export const flagState = (
  sections: readonly SongSection[],
  refs: readonly BarRef[],
  flag: BarFlag,
): boolean => has(sections, refs, flag);

/**
 * The value shared by every selected bar, or undefined when they differ —
 * so a field over a mixed selection shows empty rather than lying.
 */
export function sharedValue<K extends keyof BarValues>(
  sections: readonly SongSection[],
  refs: readonly BarRef[],
  field: K,
): BarValues[K] | undefined {
  if (refs.length === 0) return undefined;
  const first = sections[refs[0].section]?.bars[refs[0].bar]?.[field];
  return refs.every((r) => sections[r.section]?.bars[r.bar]?.[field] === first)
    ? (first as BarValues[K] | undefined)
    : undefined;
}
