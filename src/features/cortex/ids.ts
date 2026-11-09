import { keySlug } from '@/content/graph/slugs';
import { urlParamToKeyLabel } from '@/lib/musicKeyUrl';

/**
 * What a student's Cortex calls the things they did. Song, artist, place and
 * event ids are the console Cortex's own (`song:africa`); the rest are things
 * its graph has no node for, so they stay out of its ENTITY_KINDS, which the
 * console reads.
 *
 * This module, the route table and the ledger load with the dashboard: keep
 * them free of catalogues and song data (those are in describe.ts, which loads
 * with the page).
 */
export const ACTIVITY_KINDS = [
  'song',
  'theory',
  'lesson',
  'audio',
  'anatomy',
  'technique',
  'literacy',
  'game',
  'project',
  'tutorial',
  'artist',
  'place',
  'event',
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type CortexId = `${ActivityKind}:${string}`;

/** The kind half of an id, or null for one this build doesn't know. */
export const kindOfId = (id: string): ActivityKind | null => {
  const kind = id.slice(0, id.indexOf(':'));
  return (ACTIVITY_KINDS as readonly string[]).includes(kind)
    ? (kind as ActivityKind)
    : null;
};

export type TheoryInstrument = 'piano' | 'guitar' | 'bass' | 'ukulele';

/** A Theory lesson: `theory:guitar.dorian.d-flat`. Null without a real key. */
export const theoryId = (
  instrument: TheoryInstrument,
  mode: string,
  keyParam: string,
): CortexId | null => {
  const key = keySlug(urlParamToKeyLabel(keyParam));
  if (!key || !mode) return null;
  return `theory:${instrument}.${mode.toLowerCase()}.${key}`;
};

/** A genre course's level, as the graph writes it: `lesson:hiphop-l1`. */
export const genreLessonId = (slug: string, level: string): CortexId =>
  // R&B's curriculum id folds to the same `rnb` as its slug.
  `lesson:${slug
    .toLowerCase()
    .replace('&', 'n')
    .replace(/[^a-z0-9]/g, '')}-l${level}`;

/**
 * A progress or XP lesson id as a Cortex id, or null when it doesn't say
 * which lesson it is.
 *   mode-lesson-flow__dflat__dorian → theory:piano.dorian.d-flat
 *   audio:hearing:pitch             → audio:hearing.pitch
 *   curriculum:JAZZ:L2              → lesson:jazz-l2
 */
export const cortexIdForLesson = (lessonId: string): CortexId | null => {
  if (lessonId.startsWith('mode-lesson-flow__')) {
    const [, key, mode] = lessonId.split('__');
    return key && mode ? theoryId('piano', mode, key) : null;
  }
  if (lessonId.startsWith('audio:')) {
    const [, module, lesson] = lessonId.split(':');
    return module && lesson ? `audio:${module}.${lesson}` : null;
  }
  if (lessonId.startsWith('curriculum:')) {
    const [, genre, level] = lessonId.split(':');
    return genre && level
      ? genreLessonId(genre, level.replace(/^L/, ''))
      : null;
  }
  return null;
};
