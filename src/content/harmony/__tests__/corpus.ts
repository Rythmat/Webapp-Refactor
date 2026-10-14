import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import { GENRE_CURRICULUM_MAP } from '@/curriculum/data/genreCurriculumMap';
import type { Song } from '@/curriculum/types/songLibrary';
import type { HarmonyInput } from '..';
import type { FlowLike } from '../sequences';

/**
 * The repo's own corpus, for the tests and the crosscheck report: every song
 * chart, every v2 genre flow, the curriculum map and the progression library.
 *
 * Songs are globbed rather than read through `getSong`, which is empty
 * outside the app (songs load from the content CDN at runtime).
 */

const songModules = import.meta.glob<Record<string, unknown>>(
  '/src/curriculum/data/songs/*.ts',
  { eager: true },
);

const flowModules = import.meta.glob<Record<string, unknown>>(
  '/src/curriculum/data/activityFlows/*_v2.ts',
  { eager: true },
);

export const corpusSongs: Song[] = Object.entries(songModules)
  .filter(([path]) => !/\/(index|bundled)\.ts$/.test(path))
  .flatMap(([, mod]) =>
    Object.values(mod).filter(
      (value): value is Song =>
        !!value &&
        typeof value === 'object' &&
        'sections' in value &&
        'keyRoot' in value,
    ),
  );

export const corpusFlows: FlowLike[] = Object.values(flowModules).flatMap(
  (mod) =>
    Object.entries(mod)
      .filter(([name, value]) => /Flows$/.test(name) && Array.isArray(value))
      .flatMap(([, value]) => value as FlowLike[]),
);

export const corpusInput: HarmonyInput = {
  progressions: CHORD_PROGRESSION_LIBRARY,
  songs: corpusSongs,
  flows: corpusFlows,
  curriculum: Object.values(GENRE_CURRICULUM_MAP),
};
