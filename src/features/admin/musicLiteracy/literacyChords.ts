/**
 * The Music Literacy editor's chords: what each bar of a chord call may be
 * and what it is called in the lesson's preview key ("4 maj", "♭6 maj"),
 * a rhythm against its bar, a choose-chords template's bars, and the
 * progressions the lesson saves: which a step may play (only those saved
 * before it), which steps play one, and a saved name changed everywhere.
 *
 * No React here.
 */

import {
  LITERACY_CHORD_BARS,
  LITERACY_DIMINISHED_DEGREE,
  LITERACY_MODES,
  LITERACY_TPQ,
  type LiteracyChooseChordsStep,
  type LiteracyChordBar,
  type LiteracyChordEchoStep,
  type LiteracyHarmony,
  type LiteracyMode,
  type LiteracyScaleDegree,
  type LiteracyStep,
  type LiteracyTemplateBar,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { progressionNameOf } from '@/curriculum/engine/musicLiteracy/choices';
import {
  chordLabel,
  progressionLabels,
  sampleProgression,
  xBars,
} from '@/curriculum/engine/musicLiteracy/chords';
import { barTicks } from '@/curriculum/engine/musicLiteracy/literacy';
import { kebab, unique } from './literacyLesson';

// ── A chord call's bars ────────────────────────────────────────────────────

export const HARMONY_LABEL: Record<LiteracyHarmony, string> = {
  triads: 'Triads',
  sevenths: '7ths',
};

/** The modes a lesson's chords must work in: both when the student picks. */
export const lessonModes = (
  lesson: Pick<MusicLiteracyLesson, 'key' | 'keyChoice'>,
): readonly LiteracyMode[] =>
  lesson.keyChoice === 'student' ? LITERACY_MODES : [lesson.key.mode];

export interface ChordBarOption {
  bar: LiteracyChordBar;
  /** In the preview key's mode: "4 maj"; null for X or a left-out chord. */
  label: string | null;
  /** The other mode's, when the student picks it: "4 min". */
  other: string | null;
  /** False for a chord the lesson can't use (diminished in a mode it plays). */
  available: boolean;
  /** Why not: "diminished in minor". */
  reason?: string;
}

/**
 * Every bar a chord call may have, labelled in the preview key's mode and
 * harmony: 1–7 (the diminished ones unavailable, in either mode when the
 * student picks it) and X.
 */
export function chordBarOptions(
  lesson: Pick<MusicLiteracyLesson, 'key' | 'keyChoice'>,
  harmony: LiteracyHarmony,
): ChordBarOption[] {
  const mode = lesson.key.mode;
  const modes = lessonModes(lesson);
  const otherMode: LiteracyMode = mode === 'major' ? 'minor' : 'major';
  return LITERACY_CHORD_BARS.map((bar) => {
    if (bar === 'X') return { bar, label: null, other: null, available: true };
    const out = modes.find((m) => LITERACY_DIMINISHED_DEGREE[m] === bar);
    return {
      bar,
      label: chordLabel(mode, bar, harmony),
      other: modes.length > 1 ? chordLabel(otherMode, bar, harmony) : null,
      available: !out,
      ...(out ? { reason: `diminished in ${out}` } : {}),
    };
  });
}

// ── Rhythm ─────────────────────────────────────────────────────────────────

export interface RhythmTotal {
  /** The strikes' lengths added up. */
  total: number;
  /** The bar's length. */
  bar: number;
  /** The rest left at the end of the bar (0 when full or over). */
  rest: number;
  /** How far past the bar it runs (0 when it fits). */
  over: number;
}

/** A chord rhythm against its bar. */
export function rhythmTotal(
  rhythm: readonly number[],
  timeSignature: readonly [number, number],
): RhythmTotal {
  const bar = barTicks(timeSignature);
  const total = rhythm.reduce((sum, ticks) => sum + ticks, 0);
  return {
    total,
    bar,
    rest: Math.max(0, bar - total),
    over: Math.max(0, total - bar),
  };
}

/** "4 beats", "2½ beats": a length counted in the bar's beats. */
export function beatsWords(
  ticks: number,
  timeSignature: readonly [number, number],
): string {
  const beat = (LITERACY_TPQ * 4) / timeSignature[1];
  const beats = ticks / beat;
  const whole = Math.floor(beats);
  const part = beats - whole;
  const FRACTION: Record<string, string> = {
    '0.25': '¼',
    '0.5': '½',
    '0.75': '¾',
  };
  const shown =
    part === 0
      ? String(whole)
      : FRACTION[String(part)]
        ? `${whole || ''}${FRACTION[String(part)]}`
        : beats.toFixed(2).replace(/0+$/, '');
  return `${shown} beat${beats === 0 || beats > 1 ? 's' : ''}`;
}

export interface RhythmPreset {
  label: string;
  rhythm: number[];
}

/**
 * Quick rhythms that fill a bar: short, short, long (Part 2's), a strike on
 * every beat, and one held through the bar.
 */
export function rhythmPresets(
  timeSignature: readonly [number, number],
): RhythmPreset[] {
  const bar = barTicks(timeSignature);
  const beat = (LITERACY_TPQ * 4) / timeSignature[1];
  const beats = timeSignature[0];
  const presets: RhythmPreset[] = [];
  if (bar - 2 * LITERACY_TPQ >= LITERACY_TPQ)
    presets.push({
      label: 'Short, short, long',
      rhythm: [LITERACY_TPQ, LITERACY_TPQ, bar - 2 * LITERACY_TPQ],
    });
  if (beats > 1)
    presets.push({
      label: 'Every beat',
      rhythm: Array.from({ length: beats }, () => beat),
    });
  presets.push({ label: 'Held all bar', rhythm: [bar] });
  return presets;
}

// ── A choose-chords template ───────────────────────────────────────────────

/** "| 1 | X | X | X |": bars as the lesson's titles write them. */
export const barsText = (bars: readonly string[]): string =>
  `| ${bars.join(' | ')} |`;

/** A bar switched between 1 and X. */
export const toggleTemplateBar = (
  template: readonly LiteracyTemplateBar[],
  index: number,
): LiteracyTemplateBar[] =>
  template.map((bar, i) => (i === index ? (bar === '1' ? 'X' : '1') : bar));

/** The longest a template or a chord call may be. */
export const MAX_BARS = 8;

/** Another bar at the end: an X, for the student to fill. */
export const addTemplateBar = (
  template: readonly LiteracyTemplateBar[],
): LiteracyTemplateBar[] =>
  template.length >= MAX_BARS ? [...template] : [...template, 'X'];

/** A bar taken out; never the last one. */
export const removeTemplateBar = <T>(bars: readonly T[], index: number): T[] =>
  bars.length <= 1 ? [...bars] : bars.filter((_, i) => i !== index);

/** How many X bars the student fills. */
export const xCount = (template: readonly LiteracyTemplateBar[]) =>
  xBars(template).length;

// ── Saved progressions ─────────────────────────────────────────────────────

export interface SavedName {
  name: string;
  /** The choose-chords step that saves it. */
  index: number;
  step: LiteracyChooseChordsStep;
}

/** The progressions saved by choose-chords steps before step `index`. */
export function savedBefore(
  lesson: Pick<MusicLiteracyLesson, 'steps'>,
  index: number,
): SavedName[] {
  const seen = new Set<string>();
  const out: SavedName[] = [];
  lesson.steps.slice(0, index).forEach((step, i) => {
    if (step.kind !== 'chooseChords' || seen.has(step.saveAs)) return;
    seen.add(step.saveAs);
    out.push({ name: step.saveAs, index: i, step });
  });
  return out;
}

/** The steps that play a saved progression, by index. */
export const progressionUsers = (
  lesson: Pick<MusicLiteracyLesson, 'steps'>,
  name: string,
): number[] =>
  lesson.steps.flatMap((step, i) =>
    progressionNameOf(step) === name ? [i] : [],
  );

/** A step playing the progression `from` now plays `to`. */
function renamedUse(step: LiteracyStep, from: string, to: string) {
  if (progressionNameOf(step) !== from) return step;
  if (step.kind === 'replay') return { ...step, progression: to };
  if (step.kind === undefined || step.kind === 'echo')
    return { ...step, call: { ...step.call, progression: to } } as LiteracyStep;
  return step;
}

/**
 * A choose-chords step's saved name changed, made a tag and free among the
 * lesson's other saved names, with every step that plays it following.
 */
export function renameSaved(
  lesson: MusicLiteracyLesson,
  index: number,
  name: string,
): MusicLiteracyLesson {
  const chooser = lesson.steps[index];
  if (chooser?.kind !== 'chooseChords') return lesson;
  const from = chooser.saveAs;
  const taken = new Set(
    lesson.steps.flatMap((step, i) =>
      step.kind === 'chooseChords' && i !== index ? [step.saveAs] : [],
    ),
  );
  const to = unique(kebab(name) || from, taken);
  if (to === from) return lesson;
  return {
    ...lesson,
    steps: lesson.steps.map((step, i) =>
      i === index ? { ...chooser, saveAs: to } : renamedUse(step, from, to),
    ),
  };
}

/** A progression a template might make, labelled, for a preview. */
export function sampleOf(
  step: Pick<LiteracyChooseChordsStep, 'template' | 'distinct' | 'harmony'>,
  mode: LiteracyMode,
): { degrees: LiteracyScaleDegree[]; labels: string[] } {
  const degrees = sampleProgression(step.template, step.distinct, mode);
  return { degrees, labels: progressionLabels(degrees, mode, step.harmony) };
}

/**
 * What a choose-chords step sounds like before anyone chooses: its sample
 * as a chord call, in the rhythm of the first step that plays it (else a
 * chord held each bar), for the editor's Play.
 */
export function chooserStandIn(
  lesson: MusicLiteracyLesson,
  step: LiteracyChooseChordsStep,
): LiteracyChordEchoStep {
  const user = progressionUsers(lesson, step.saveAs)
    .map((i) => lesson.steps[i])
    .find((s) => s.kind !== 'replay');
  const rhythm =
    user && 'call' in user && 'rhythm' in user.call
      ? user.call.rhythm
      : [barTicks(lesson.timeSignature)];
  return {
    tag: step.tag,
    title: step.title,
    call: {
      chords: sampleOf(step, lesson.key.mode).degrees,
      rhythm: [...rhythm],
      harmony: step.harmony,
    },
  };
}
