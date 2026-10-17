import {
  shiftTickForBars,
  ticksPerBar,
  type TimeSignature,
} from '@/daw/time/timeModel';
import type { SectionType } from '@/unison/types/schema';

// ── Song sections (milestone 2.13) ─────────────────────────────────────────
//
// The song's form as one model for the Timeline's sections lane and the
// Lead Sheet (plan 2.13, 29-D §4.4, SD7): named spans of the song in song
// ticks, in order and never overlapping. A section the student adds lasts 8
// bars and starts where the last one ends, on a bar line, as Soundtrap's do;
// gaps between sections are bars nobody named. The vocabulary is UNISON's
// SectionType, which carries tag, hook, breakdown, build-up and drop for
// this, and every kind has a one-line purpose the menus show and Learn →
// Songs explains. Sections are neutral blocks: colour is for musical meaning
// only (decision 3).
//
// The Lead Sheet used to keep its own bar-indexed marks
// (`leadSheetSections`: a label on the barline a section starts at). It now
// reads them from here (marksOfSections), and its own edits (add a section
// at a bar, remove one, rename) go through markSectionAtBar and
// removeSectionAtBar, so the two views can't disagree. Older drafts and
// cloud copies hold only those marks; sectionsFromMarks reads them back.
//
// Pure: no store, no React. Sections are kept in ticks like every other
// position in the song, so a change of metre leaves them where they are;
// new and resized edges land on the bar lines of the metre at the time.

export type { SectionType };

/** A section of the song: a named span of it. */
export interface SongSection {
  id: string;
  type: SectionType;
  /**
   * What the lane and the Lead Sheet show: the type's name, a song chart's
   * own ('Verse 2'), or the student's.
   */
  label: string;
  startTick: number;
  /** Exclusive: the next section may start here. */
  endTick: number;
}

/** A section as the Lead Sheet marks it: the bar it starts at, its name. */
export interface SectionMark {
  measureIdx: number;
  label: string;
}

/** How long a new section is, in bars of the project's metre. */
export const DEFAULT_SECTION_BARS = 8;

export interface SectionTypeInfo {
  type: SectionType;
  /** Its name, as a new section is labelled. */
  name: string;
  /** One line on what it does in a song, for the menus and the tooltip. */
  purpose: string;
  /** One of the six most songs use, listed first. */
  common: boolean;
}

/** The kinds a student can pick, in menu order: the common six first. */
export const SECTION_TYPES: readonly SectionTypeInfo[] = Object.freeze([
  {
    type: 'intro',
    name: 'Intro',
    purpose: 'Sets the mood before the singing starts.',
    common: true,
  },
  {
    type: 'verse',
    name: 'Verse',
    purpose: 'Tells the story: new words each time, over music that repeats.',
    common: true,
  },
  {
    type: 'pre-chorus',
    name: 'Pre-chorus',
    purpose: 'Builds up to the chorus, so it lands harder.',
    common: true,
  },
  {
    type: 'chorus',
    name: 'Chorus',
    purpose:
      'The part everyone sings back; it usually repeats the same words and chords.',
    common: true,
  },
  {
    type: 'bridge',
    name: 'Bridge',
    purpose: 'Something new near the end, before the last chorus.',
    common: true,
  },
  {
    type: 'outro',
    name: 'Outro',
    purpose: 'Brings the song to a close.',
    common: true,
  },
  {
    type: 'solo',
    name: 'Solo',
    purpose: 'One instrument takes the melody.',
    common: false,
  },
  {
    type: 'interlude',
    name: 'Interlude',
    purpose: 'A short instrumental break between sections.',
    common: false,
  },
  {
    type: 'breakdown',
    name: 'Breakdown',
    purpose: 'Strips the music back to a few parts.',
    common: false,
  },
  {
    type: 'build-up',
    name: 'Build-up',
    purpose: 'Raises the energy, often with a rising sound or a drum roll.',
    common: false,
  },
  {
    type: 'drop',
    name: 'Drop',
    purpose: 'The high-energy payoff after a build-up, common in dance music.',
    common: false,
  },
  {
    type: 'hook',
    name: 'Hook',
    purpose: 'A short, catchy idea that keeps coming back.',
    common: false,
  },
  {
    type: 'tag',
    name: 'Tag',
    purpose: 'Repeats the last line or two to end the song.',
    common: false,
  },
  {
    type: 'coda',
    name: 'Coda',
    purpose: 'A closing passage added after the main form.',
    common: false,
  },
] satisfies SectionTypeInfo[]);

const CUSTOM_SECTION: SectionTypeInfo = Object.freeze({
  type: 'custom',
  name: 'Custom',
  purpose: 'A part with a name of your own.',
  common: false,
});

/**
 * Every SectionType, once. A type added to the union fails to compile here
 * until it is listed, rather than loading as 'custom' on every reload.
 */
export const SECTION_TYPE_MEMBERS: Readonly<Record<SectionType, true>> =
  Object.freeze({
    intro: true,
    verse: true,
    'pre-chorus': true,
    chorus: true,
    bridge: true,
    outro: true,
    solo: true,
    interlude: true,
    breakdown: true,
    'build-up': true,
    drop: true,
    hook: true,
    tag: true,
    coda: true,
    custom: true,
  });

const INFO = new Map<SectionType, SectionTypeInfo>(
  [...SECTION_TYPES, CUSTOM_SECTION].map((info) => [info.type, info]),
);

export function sectionTypeInfo(type: SectionType): SectionTypeInfo {
  return INFO.get(type) ?? CUSTOM_SECTION;
}

/** The type's name: 'Pre-chorus' for 'pre-chorus'. */
export function sectionName(type: SectionType): string {
  return sectionTypeInfo(type).name;
}

export function isSectionType(value: unknown): value is SectionType {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(SECTION_TYPE_MEMBERS, value)
  );
}

/** Names (letters only, lower case) and what kind each one names. */
const LABEL_TYPES: Readonly<Record<string, SectionType>> = {
  intro: 'intro',
  verse: 'verse',
  prechorus: 'pre-chorus',
  chorus: 'chorus',
  refrain: 'chorus',
  bridge: 'bridge',
  middle8: 'bridge',
  middleeight: 'bridge',
  outro: 'outro',
  solo: 'solo',
  interlude: 'interlude',
  instrumental: 'interlude',
  breakdown: 'breakdown',
  buildup: 'build-up',
  drop: 'drop',
  hook: 'hook',
  tag: 'tag',
  coda: 'coda',
};

/**
 * The kind a label names: 'Verse 2' is a verse, 'Pre Chorus' a pre-chorus,
 * 'Build Up' a build-up. Anything else (a rehearsal letter, a name of the
 * student's own) is 'custom'. The song charts' names (Intro, Verse,
 * Pre-Chorus, Chorus, Bridge, Interlude, Tag, Outro, each perhaps numbered)
 * all map to their kind.
 */
export function sectionTypeOfLabel(label: string): SectionType {
  const lower = label.trim().toLowerCase();
  const whole = lower.replace(/[^a-z0-9]/g, '');
  const named = LABEL_TYPES[whole];
  if (named) return named;
  const unnumbered = lower.replace(/\s*\d+$/, '').replace(/[^a-z]/g, '');
  return LABEL_TYPES[unnumbered] ?? 'custom';
}

/** A new section's id. */
export function newSectionId(): string {
  return `section-${crypto.randomUUID().slice(0, 8)}`;
}

// ── Keeping the list in order ──────────────────────────────────────────────

const byStart = (a: SongSection, b: SongSection) =>
  a.startTick - b.startTick || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * `list` in order, with whole ticks, no section shorter than a tick, and no
 * two overlapping: one that starts inside the one before it moves to that
 * one's end and keeps its length, so nothing is lost (two collaborators can
 * add a section at the same end at once). The same array when nothing
 * changed. Deterministic, so every collaborator reads one doc the same way.
 */
export function normalizeSections(list: readonly SongSection[]): SongSection[] {
  let changed = false;
  const whole: SongSection[] = [];
  for (const section of list) {
    const startTick = Math.max(0, Math.round(section.startTick));
    const endTick = Math.round(section.endTick);
    if (
      !Number.isFinite(startTick) ||
      !Number.isFinite(endTick) ||
      endTick <= startTick
    ) {
      changed = true;
      continue;
    }
    if (startTick !== section.startTick || endTick !== section.endTick) {
      changed = true;
      whole.push({ ...section, startTick, endTick });
    } else {
      whole.push(section);
    }
  }
  const sorted = [...whole].sort(byStart);
  if (sorted.some((section, i) => section !== whole[i])) changed = true;

  const out: SongSection[] = [];
  let previousEnd = -Infinity;
  for (const section of sorted) {
    if (section.startTick < previousEnd) {
      const length = section.endTick - section.startTick;
      const moved = {
        ...section,
        startTick: previousEnd,
        endTick: previousEnd + length,
      };
      out.push(moved);
      previousEnd = moved.endTick;
      changed = true;
    } else {
      out.push(section);
      previousEnd = section.endTick;
    }
  }
  return changed ? out : (list as SongSection[]);
}

/** The section playing at `tick`, if any. */
export function sectionAt(
  list: readonly SongSection[],
  tick: number,
): SongSection | undefined {
  return list.find((s) => s.startTick <= tick && tick < s.endTick);
}

// ── The lane's edits ───────────────────────────────────────────────────────

/**
 * A new section after the last one (at the song's start when there are
 * none), on the next bar line, DEFAULT_SECTION_BARS long.
 */
export function appendSection(
  list: readonly SongSection[],
  input: { type: SectionType; label: string },
  ts: TimeSignature,
  id: string = newSectionId(),
): { sections: SongSection[]; section: SongSection } {
  const bar = ticksPerBar(ts);
  const lastEnd = list.reduce((end, s) => Math.max(end, s.endTick), 0);
  const startTick = Math.ceil(lastEnd / bar) * bar;
  const section: SongSection = {
    id,
    type: input.type,
    label: input.label,
    startTick,
    endTick: startTick + DEFAULT_SECTION_BARS * bar,
  };
  return { sections: normalizeSections([...list, section]), section };
}

/**
 * `list` with one edge of section `id` dragged to the bar line nearest
 * `tick`. An edge two sections share moves both of them; a free edge stops
 * at its neighbour; every section it touches keeps at least a bar. The same
 * array when nothing moves.
 */
export function resizeSectionEdge(
  list: readonly SongSection[],
  id: string,
  edge: 'start' | 'end',
  tick: number,
  ts: TimeSignature,
): SongSection[] {
  const sorted = normalizeSections(list);
  const index = sorted.findIndex((s) => s.id === id);
  if (index < 0) return list as SongSection[];
  const bar = ticksPerBar(ts);
  const target = Math.max(0, Math.round(tick / bar) * bar);
  const section = sorted[index];
  const out = [...sorted];
  if (edge === 'end') {
    const next = sorted[index + 1] as SongSection | undefined;
    const shared = next !== undefined && next.startTick === section.endTick;
    const min = section.startTick + bar;
    const max = shared
      ? next.endTick - bar
      : next
        ? next.startTick
        : Number.POSITIVE_INFINITY;
    if (min > max) return list as SongSection[];
    const endTick = Math.min(max, Math.max(min, target));
    if (endTick === section.endTick) return list as SongSection[];
    out[index] = { ...section, endTick };
    if (shared) out[index + 1] = { ...next, startTick: endTick };
  } else {
    const previous = sorted[index - 1] as SongSection | undefined;
    const shared =
      previous !== undefined && previous.endTick === section.startTick;
    const max = section.endTick - bar;
    const min = shared
      ? previous.startTick + bar
      : previous
        ? previous.endTick
        : 0;
    if (min > max) return list as SongSection[];
    const startTick = Math.min(max, Math.max(min, target));
    if (startTick === section.startTick) return list as SongSection[];
    out[index] = { ...section, startTick };
    if (shared) out[index - 1] = { ...previous, endTick: startTick };
  }
  return out;
}

/**
 * The label a section takes when its type changes: the new type's name
 * when it was named after its old type ('Verse', 'Verse 2'), or the name
 * the student gave it, kept.
 */
export function relabelForType(
  section: SongSection,
  type: SectionType,
): string {
  if (
    section.type !== 'custom' &&
    sectionTypeOfLabel(section.label) === section.type
  ) {
    return sectionName(type);
  }
  return section.label;
}

// ── The Lead Sheet's marks ─────────────────────────────────────────────────

/**
 * The sections as the Lead Sheet marks them, in order: each at the bar it
 * starts in, one per bar.
 */
export function marksOfSections(
  list: readonly SongSection[],
  ts: TimeSignature,
): SectionMark[] {
  const bar = ticksPerBar(ts);
  const marks: SectionMark[] = [];
  const seen = new Set<number>();
  for (const section of [...list].sort(byStart)) {
    const measureIdx = Math.floor(section.startTick / bar);
    if (seen.has(measureIdx)) continue;
    seen.add(measureIdx);
    marks.push({ measureIdx, label: section.label });
  }
  return marks;
}

/**
 * Sections read from Lead Sheet marks (a draft or cloud copy from before
 * 2.13, a song chart): each mark runs to the next, the last to `endBar` (at
 * least one bar). One per bar, the first one written wins; a mark without
 * a name is dropped. Ids come from the bar, so reading the same marks twice
 * gives the same sections.
 */
export function sectionsFromMarks(
  marks: readonly SectionMark[],
  ts: TimeSignature,
  endBar: number,
): SongSection[] {
  const bar = ticksPerBar(ts);
  const byBar = new Map<number, SectionMark>();
  const usable = marks.filter(
    (m) =>
      Number.isInteger(m.measureIdx) &&
      m.measureIdx >= 0 &&
      typeof m.label === 'string' &&
      m.label.trim() !== '',
  );
  for (const mark of [...usable].sort((a, b) => a.measureIdx - b.measureIdx)) {
    if (!byBar.has(mark.measureIdx)) byBar.set(mark.measureIdx, mark);
  }
  const ordered = [...byBar.values()];
  return ordered.map((mark, i) => {
    const next = ordered[i + 1];
    const endMeasure = next
      ? next.measureIdx
      : Math.max(endBar, mark.measureIdx + 1);
    return {
      id: `section-bar-${mark.measureIdx}`,
      type: sectionTypeOfLabel(mark.label),
      label: mark.label,
      startTick: mark.measureIdx * bar,
      endTick: endMeasure * bar,
    };
  });
}

/**
 * The Lead Sheet's "+ Section", rename and paste at bar `bar`: a section
 * that starts in that bar is renamed (its type follows a name that names
 * one); one the bar falls inside is split there, the new part taking the
 * name; in bars nobody named, a new section runs to the next one, or to
 * `endBar` (at least one bar) after the last.
 */
export function markSectionAtBar(
  list: readonly SongSection[],
  bar: number,
  label: string,
  ts: TimeSignature,
  endBar: number,
  id: string = newSectionId(),
): SongSection[] {
  const tpb = ticksPerBar(ts);
  const tick = bar * tpb;
  const sorted = normalizeSections(list);
  const labelType = sectionTypeOfLabel(label);

  const starting = sorted.findIndex(
    (s) => Math.floor(s.startTick / tpb) === bar,
  );
  if (starting >= 0) {
    const section = sorted[starting];
    const type = labelType === 'custom' ? section.type : labelType;
    if (section.label === label && section.type === type) {
      return list as SongSection[];
    }
    const out = [...sorted];
    out[starting] = { ...section, label, type };
    return out;
  }

  const inside = sorted.findIndex(
    (s) => s.startTick < tick && tick < s.endTick,
  );
  if (inside >= 0) {
    const section = sorted[inside];
    const out = [...sorted];
    out.splice(
      inside,
      1,
      { ...section, endTick: tick },
      { id, type: labelType, label, startTick: tick, endTick: section.endTick },
    );
    return out;
  }

  const next = sorted.find((s) => s.startTick > tick);
  const endTick = next ? next.startTick : Math.max(endBar, bar + 1) * tpb;
  return normalizeSections([
    ...sorted,
    { id, type: labelType, label, startTick: tick, endTick },
  ]);
}

/**
 * The Lead Sheet's "− Section" at bar `bar`: the section starting in that
 * bar goes, and its bars stay, unnamed. The same array when none starts
 * there.
 */
export function removeSectionAtBar(
  list: readonly SongSection[],
  bar: number,
  ts: TimeSignature,
): SongSection[] {
  const tpb = ticksPerBar(ts);
  const out = list.filter((s) => Math.floor(s.startTick / tpb) !== bar);
  return out.length === list.length ? (list as SongSection[]) : out;
}

/**
 * The sections after `count` bars are inserted at bar `at` (count > 0) or
 * bars [at, at − count) are deleted (count < 0), the Lead Sheet's
 * + Measure and − Measure: both edges move with the bars, so bars inserted
 * where one section ends make it longer, as they did when a section was a
 * mark, and sections that met still meet. One a delete leaves no bars of
 * goes.
 */
export function shiftSectionsForBars(
  list: readonly SongSection[],
  at: number,
  count: number,
  ts: TimeSignature,
): SongSection[] {
  if (count === 0) return list as SongSection[];
  let changed = false;
  const out: SongSection[] = [];
  for (const section of list) {
    const startTick = shiftTickForBars(section.startTick, at, count, ts);
    const endTick = shiftTickForBars(section.endTick, at, count, ts);
    if (endTick <= startTick) {
      changed = true;
      continue;
    }
    if (startTick !== section.startTick || endTick !== section.endTick) {
      changed = true;
      out.push({ ...section, startTick, endTick });
    } else {
      out.push(section);
    }
  }
  return changed ? normalizeSections(out) : (list as SongSection[]);
}
