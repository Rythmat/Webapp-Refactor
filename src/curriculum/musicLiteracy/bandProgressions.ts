import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import {
  chartId,
  STARTER_PROGRESSION,
} from '@/curriculum/engine/musicLiteracy/chart';
import {
  chooserOf,
  progressionFor,
  type LiteracyChoices,
  type SavedProgression,
} from '@/curriculum/engine/musicLiteracy/choices';
import { getLiveMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import { readLiteracyChoices } from './useLiteracyChoices';

// ── Hear It with Your Band: the student's progressions ─────────────────────
// What Part 3 offers a Band to play: every progression the student saved in
// Part 2 (choices.ts, on this device for now and in the student's account
// later, as progress), in the lesson's order, the triads first and then the
// 7ths, each in the key it was made in. With nothing saved, the starter: C
// major's 1 6 4 5. The picks Part 3 makes are remembered beside them.

/** The lesson whose progressions a Band plays. */
export const PART_2_LESSON_ID = 'music-literacy-part-2';

/** A progression the band can play, by the name Part 2 saved it under. */
export interface BandProgression {
  /** Its `saveAs` ('four-chords', 'four-chords-7ths'), or 'starter'. */
  name: string;
  progression: SavedProgression;
  /** The starter, played when nothing is saved. */
  starter?: true;
}

/** The starter, as a band progression. */
export const STARTER: BandProgression = {
  name: 'starter',
  progression: STARTER_PROGRESSION,
  starter: true,
};

/** The progression a band plays first, when it is saved. */
export const FIRST_CHOICE = 'four-chords';

/**
 * Every progression saved, in the order the lesson's choose-chords steps
 * save them (a progression a lesson edit no longer fits is left out); one
 * the lesson doesn't name, after them. Without the lesson (unpublished),
 * every one saved, in the order it was saved.
 */
export function savedBandProgressions(
  choices: LiteracyChoices,
  lesson: Pick<MusicLiteracyLesson, 'steps'> | undefined,
): BandProgression[] {
  const names = Object.keys(choices.progressions);
  const fits = (name: string): SavedProgression | undefined =>
    lesson && chooserOf(lesson, name)
      ? progressionFor(lesson, choices, name)
      : choices.progressions[name];
  const order = lesson
    ? lesson.steps.flatMap((step) =>
        step.kind === 'chooseChords' ? [step.saveAs] : [],
      )
    : [];
  return [
    ...order.filter((name) => names.includes(name)),
    ...names.filter((name) => !order.includes(name)),
  ].flatMap((name) => {
    const progression = fits(name);
    return progression ? [{ name, progression }] : [];
  });
}

/** How complete a progression is: different chords, then bars. */
const completeness = ({ progression }: BandProgression) => [
  new Set(progression.chords).size,
  progression.chords.length,
];

/**
 * The one to play first: four-chords, else the most complete (the most
 * different chords, then the most bars, then the later in the lesson).
 */
export function defaultBandProgression(
  list: readonly BandProgression[],
): BandProgression {
  const first = list.find((p) => p.name === FIRST_CHOICE);
  if (first) return first;
  let best: BandProgression | undefined;
  for (const p of list) {
    if (!best) {
      best = p;
      continue;
    }
    const [a, b] = [completeness(p), completeness(best)];
    if (a[0] > b[0] || (a[0] === b[0] && a[1] >= b[1])) best = p;
  }
  return best ?? STARTER;
}

/** The student's progressions on this device: the saved ones, else the starter. */
export function readBandProgressions(
  read: (lessonId: string) => LiteracyChoices = readLiteracyChoices,
  lesson: Pick<MusicLiteracyLesson, 'steps'> | undefined = getLiveMusicLiteracy(
    PART_2_LESSON_ID,
  ),
): BandProgression[] {
  const saved = savedBandProgressions(read(PART_2_LESSON_ID), lesson);
  return saved.length ? saved : [STARTER];
}

/**
 * The charts the Studio's progression switch offers, one per distinct
 * chart (two names saving the same chords in the same key are one).
 */
export function bandCharts(list: readonly BandProgression[]) {
  const seen = new Set<string>();
  return list.flatMap(({ progression }) => {
    const chart = {
      chords: progression.chords,
      harmony: progression.harmony,
      tonic: progression.tonic,
      mode: progression.mode,
    };
    const id = chartId(chart);
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ id, chart }];
  });
}

// ── The picks, remembered ──────────────────────────────────────────────────

/** What Part 3 last had chosen: a progression's name, a band, a style. */
export interface BandPicks {
  progression?: string;
  band?: string;
  /** The band's variation. */
  variation?: string;
}

export const BAND_PICKS_KEY = 'music_literacy_band_picks';

export function readBandPicks(): BandPicks {
  try {
    const stored = localStorage.getItem(BAND_PICKS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const picks = parsed as Record<string, unknown>;
      const text = (key: string) =>
        typeof picks[key] === 'string' ? (picks[key] as string) : undefined;
      return {
        progression: text('progression'),
        band: text('band'),
        variation: text('variation'),
      };
    }
  } catch {
    // Private browsing or corrupted data: nothing remembered.
  }
  return {};
}

export function writeBandPicks(picks: BandPicks): void {
  try {
    localStorage.setItem(BAND_PICKS_KEY, JSON.stringify(picks));
  } catch {
    // Storage full or private browsing: the picks last the visit.
  }
}

/**
 * The progression Part 3 opens on: the one picked last, while it is still
 * saved, else the one to play first.
 */
export function openingBandProgression(
  list: readonly BandProgression[],
  picks: BandPicks = readBandPicks(),
): BandProgression {
  return (
    list.find((p) => p.name === picks.progression) ??
    defaultBandProgression(list)
  );
}
