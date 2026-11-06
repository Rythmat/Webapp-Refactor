/**
 * The Studio Production lessons written in the console: the JSON files its
 * lesson editor writes into src/curriculum/data/studioLessons/ (dev server
 * only, scripts/vite/devContentWriter.ts). Commit a file to ship it. A file
 * with a code lesson's id replaces that lesson; any other is a new lesson
 * (tutorialCatalog.ts and tutorials.ts merge them).
 *
 * Students get `live` lessons only. The console's mirror previews drafts too
 * (`setStudioLessonDrafts`), and this session's saves and deletes are laid
 * over the files until Vite reloads them, so a lesson just saved opens at
 * once, as musicLiteracy/literacySession.ts does for its lessons.
 *
 * Repo files for now; when the content API grows a studio_lesson kind this
 * is the one module that changes.
 */

import { useSyncExternalStore } from 'react';
import type { StudioLesson } from '@/content/studioLessons/schemas';

const files = import.meta.glob<StudioLesson>(
  '../../data/studioLessons/*.json',
  {
    eager: true,
    import: 'default',
  },
);

const FILES: readonly StudioLesson[] = Object.values(files);

const saved = new Map<string, StudioLesson>();
const deleted = new Set<string>();
const listeners = new Set<() => void>();
let drafts = false;
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

/** This session's save, ahead of the files' reload (instrumentStore.ts). */
export function rememberStudioLessonSaved(lesson: StudioLesson) {
  saved.set(lesson.id, lesson);
  deleted.delete(lesson.id);
  emit();
}

export function rememberStudioLessonDeleted(id: string) {
  saved.delete(id);
  deleted.add(id);
  emit();
}

/**
 * Whether drafts count as lessons on this page: on while the console shows
 * the app (ConsoleMirrorShell), so an admin previews a lesson before it goes
 * live. Never on in the student app.
 */
export function setStudioLessonDrafts(on: boolean) {
  if (drafts === on) return;
  drafts = on;
  emit();
}

let cache = { version: -1, all: [] as StudioLesson[] };

/** Every lesson file, drafts included, this session's changes applied. */
export function listStudioLessonFiles(): readonly StudioLesson[] {
  if (cache.version !== version) {
    const byId = new Map(FILES.map((l) => [l.id, l]));
    saved.forEach((l, id) => byId.set(id, l));
    deleted.forEach((id) => byId.delete(id));
    cache = { version, all: [...byId.values()] };
  }
  return cache.all;
}

/** The lesson files that count here: live ones, and drafts in the console. */
export function listStudioLessons(): readonly StudioLesson[] {
  return drafts
    ? listStudioLessonFiles()
    : listStudioLessonFiles().filter((l) => l.status === 'live');
}

/** A lesson file that counts here, by id. */
export function getStudioLesson(id: string): StudioLesson | undefined {
  return listStudioLessons().find((l) => l.id === id);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Re-render on a save, a delete or the drafts switch; returns a version. */
export function useStudioLessonsVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}
