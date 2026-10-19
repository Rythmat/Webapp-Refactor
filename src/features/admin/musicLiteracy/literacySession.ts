/**
 * Music Literacy lessons saved or deleted this session, laid over the
 * registry. The registry is a build-time glob of the JSON files, so a lesson
 * the editor just wrote only appears there once Vite reloads the module;
 * this keeps the list and the editor current in between, as
 * drumGrooves/grooveSession.ts does for grooves.
 */

import { useSyncExternalStore } from 'react';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import { listMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';

const saved = new Map<string, MusicLiteracyLesson>();
const deleted = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

/** This session's save, ahead of the files' reload (instrumentStore.ts). */
export function rememberLessonSaved(lesson: MusicLiteracyLesson) {
  saved.set(lesson.id, lesson);
  deleted.delete(lesson.id);
  emit();
}

export function rememberLessonDeleted(id: string) {
  saved.delete(id);
  deleted.add(id);
  emit();
}

/** In series order, as the registry and the Learn page list them. */
function current(): MusicLiteracyLesson[] {
  const byId = new Map(listMusicLiteracy().map((l) => [l.id, l]));
  saved.forEach((l, id) => byId.set(id, l));
  deleted.forEach((id) => byId.delete(id));
  return [...byId.values()].sort(
    (a, b) =>
      a.part - b.part ||
      (a.order ?? 0) - (b.order ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

let cache = { version: -1, list: [] as MusicLiteracyLesson[] };

/** Every lesson, drafts included, this session's saves and deletes applied. */
export function useLiteracyList(): MusicLiteracyLesson[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      if (cache.version !== version) cache = { version, list: current() };
      return cache.list;
    },
  );
}
