/**
 * A Music Literacy lesson for the tests: Part 1 as it stood on 17 October
 * 2026 (src/curriculum/data/musicLiteracy/music-literacy-part-1.json at
 * 28ea86f5), frozen under an id and name of its own. Its seven steps, their
 * words, notes, timings and tags are what the Music Literacy tests assert,
 * so the real lesson stays free to change in the console's editor.
 *
 * It sits outside src/curriculum/data/musicLiteracy/, so the registry's
 * glob never serves it, and only tests import it, so no build ships it.
 * The real files are still held to the schema
 * (content/musicLiteracy/__tests__/musicLiteracySchemas.test.ts).
 */

import type {
  LiteracyMelodicEchoStep,
  LiteracyWords,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import type * as Registry from '../registry';
import lesson from './literacyFixture.json';

/** A Part 1 step: call and response with a melodic call, and words. */
export type LiteracyFixtureStep = LiteracyMelodicEchoStep & {
  words: LiteracyWords;
};

/** Part 1's shape: a lesson of Part 1 steps only (still a lesson). */
export type LiteracyFixtureLesson = Omit<MusicLiteracyLesson, 'steps'> & {
  steps: LiteracyFixtureStep[];
};

export const LITERACY_FIXTURE = lesson as LiteracyFixtureLesson;

/**
 * The registry over these lessons instead of the files, for a test that
 * reaches it through a component:
 *
 *   vi.mock('@/curriculum/engine/musicLiteracy/registry', async () =>
 *     (await import('…/__fixtures__/literacyFixture')).fixtureRegistry());
 */
export function fixtureRegistry(
  lessons: readonly MusicLiteracyLesson[] = [LITERACY_FIXTURE],
) {
  const live = lessons.filter((l) => l.status === 'live');
  return {
    listMusicLiteracy: () => lessons,
    getMusicLiteracy: (id: string) => lessons.find((l) => l.id === id),
    listLiveMusicLiteracy: () => live,
    getLiveMusicLiteracy: (id: string) => live.find((l) => l.id === id),
  } satisfies typeof Registry;
}
