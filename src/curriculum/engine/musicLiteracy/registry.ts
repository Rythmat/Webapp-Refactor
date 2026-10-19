/**
 * Every Music Literacy lesson, read from the JSON files the console's Music
 * Literacy editor writes into src/curriculum/data/musicLiteracy/ (dev server
 * only, scripts/vite/devContentWriter.ts). Commit a file to ship it.
 *
 * Repo files for now; when the content API grows a music_literacy kind this
 * is the one module that changes.
 */

import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';

const files = import.meta.glob<MusicLiteracyLesson>(
  '../../data/musicLiteracy/*.json',
  { eager: true, import: 'default' },
);

const ALL: MusicLiteracyLesson[] = Object.values(files).sort(
  (a, b) =>
    a.part - b.part ||
    (a.order ?? 0) - (b.order ?? 0) ||
    a.name.localeCompare(b.name),
);

const BY_ID = new Map(ALL.map((lesson) => [lesson.id, lesson]));

/** Every lesson file, drafts included: the console. */
export function listMusicLiteracy(): readonly MusicLiteracyLesson[] {
  return ALL;
}

/** A lesson by id, drafts included: the console and its preview. */
export function getMusicLiteracy(id: string): MusicLiteracyLesson | undefined {
  return BY_ID.get(id);
}

/** The lessons students see: published ones only. */
export function listLiveMusicLiteracy(): readonly MusicLiteracyLesson[] {
  return ALL.filter((lesson) => lesson.status === 'live');
}

/** A lesson a student may open: undefined for a draft or an unknown id. */
export function getLiveMusicLiteracy(
  id: string,
): MusicLiteracyLesson | undefined {
  const lesson = BY_ID.get(id);
  return lesson?.status === 'live' ? lesson : undefined;
}
