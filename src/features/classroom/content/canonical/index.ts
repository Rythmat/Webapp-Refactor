/**
 * Canonical content banks — normalize → derive → merge the ported raw seeds
 * into the final typed banks, in-memory on load. This is the single source the
 * `content/{activities,clos,seeds,themes,ideaBank}.ts` shims re-export.
 */
import type { Activity, Clo, IdeaBank, LessonSeed, Theme } from '../types';
import { deriveActivityBank, deriveCanonicalCLOs } from './derive';
import { mergeThemes } from './mergeThemes';
import {
  normalizeActivitySeed,
  normalizeDaySeed,
  normalizeTheme,
  type RawActivity,
  type RawActivitySeed,
  type RawDaySeed,
  type RawTheme,
} from './normalize';
import { OUR_THEMES } from './ourThemes';
import { RAW_ACTIVITIES } from './raw/activities';
import { RAW_IDEA_BANK } from './raw/ideaBank';
import { RAW_ACTIVITY_SEEDS, RAW_DAY_SEEDS } from './raw/lessonSeeds';
import { RAW_THEMES } from './raw/themes';
import { validateContent } from './validate';

const daySeeds = (RAW_DAY_SEEDS as unknown as RawDaySeed[]).map(normalizeDaySeed);
const activitySeeds = (RAW_ACTIVITY_SEEDS as unknown as RawActivitySeed[]).map(
  normalizeActivitySeed,
);

export const ACTIVITIES: Activity[] = deriveActivityBank(
  RAW_ACTIVITIES as unknown as RawActivity[],
  activitySeeds,
);
export const CLOS: Clo[] = deriveCanonicalCLOs(ACTIVITIES, daySeeds);
export const LESSON_SEEDS: LessonSeed[] = [...daySeeds, ...activitySeeds];
export const THEMES: Theme[] = mergeThemes(
  OUR_THEMES,
  (RAW_THEMES as unknown as RawTheme[]).map(normalizeTheme),
);
export const IDEA_BANK: IdeaBank = RAW_IDEA_BANK as unknown as IdeaBank;

if (import.meta.env.DEV) {
  const errors = validateContent({ ACTIVITIES, CLOS, LESSON_SEEDS, THEMES });
  if (errors.length) {
    // eslint-disable-next-line no-console
    console.error(
      `[classroom content] ${errors.length} validation error(s):\n${errors.join('\n')}`,
    );
  }
}
