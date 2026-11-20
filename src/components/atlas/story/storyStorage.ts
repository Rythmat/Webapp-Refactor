import { useSyncExternalStore } from 'react';
import {
  getLocalStoreUserKey,
  onLocalStoreUserChange,
  type UserKey,
} from '@/lib/local-store/userScope';
import {
  readStory,
  storyTargetKey,
  type Story,
  type StoryStop,
  type StoryTarget,
} from './storyTypes';

// ── A student's Stories, on this device ────────────────────────────────────
// Per user, in localStorage, as the Library's projects are
// (features/library/libraryLocalMeta.ts): the account has no place for them
// yet, so they stay on the device. Which Story is open is kept too; which
// stop is playing is the page's alone.

export interface StoryShelf {
  stories: Story[];
  /** The Story Add to Story adds to, or null for the list. */
  openId: string | null;
}

const EMPTY: StoryShelf = { stories: [], openId: null };

/** A first Story's name, when Add to Story makes one. */
export const FIRST_STORY_TITLE = 'My story';

const storageKey = (userKey: UserKey) => `musicAtlas:stories:${userKey}`;

function read(userKey: UserKey | null): StoryShelf {
  if (userKey === null) return EMPTY;
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return EMPTY;
    const value = JSON.parse(raw) as Partial<StoryShelf>;
    const stories = Array.isArray(value.stories)
      ? value.stories.map(readStory).filter((s): s is Story => s !== null)
      : [];
    const openId =
      typeof value.openId === 'string' &&
      stories.some((s) => s.id === value.openId)
        ? value.openId
        : null;
    return { stories, openId };
  } catch {
    return EMPTY;
  }
}

let cached: { userKey: UserKey | null; shelf: StoryShelf } | null = null;
const listeners = new Set<() => void>();

function current(): StoryShelf {
  const userKey = getLocalStoreUserKey();
  if (!cached || cached.userKey !== userKey) {
    cached = { userKey, shelf: read(userKey) };
  }
  return cached.shelf;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const off = onLocalStoreUserChange(() => listener());
  return () => {
    listeners.delete(listener);
    off();
  };
}

/** Change this user's Stories; nothing is kept while auth is unknown. */
function update(change: (shelf: StoryShelf) => StoryShelf): void {
  const userKey = getLocalStoreUserKey();
  if (userKey === null) return;
  const before = current();
  const shelf = change(before);
  if (shelf === before) return;
  cached = { userKey, shelf };
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(shelf));
  } catch {
    // Storage full or blocked: the change holds for this page.
  }
  listeners.forEach((fn) => fn());
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** One Story changed, its updatedAt moved; the rest as they were. */
function withStory(
  shelf: StoryShelf,
  storyId: string,
  change: (story: Story) => Story,
): StoryShelf {
  let changed = false;
  const stories = shelf.stories.map((s) => {
    if (s.id !== storyId) return s;
    const next = change(s);
    if (next === s) return s;
    changed = true;
    return { ...next, updatedAt: Date.now() };
  });
  return changed ? { ...shelf, stories } : shelf;
}

/* ── Stories ─────────────────────────────────────────────────────────────── */

/** A new, empty Story, opened. Returns its id (null while auth is unknown). */
export function createStory(title = 'Untitled story'): string | null {
  if (getLocalStoreUserKey() === null) return null;
  const now = Date.now();
  const story: Story = {
    id: newId(),
    title,
    description: '',
    stops: [],
    createdAt: now,
    updatedAt: now,
  };
  update((shelf) => ({ stories: [story, ...shelf.stories], openId: story.id }));
  return story.id;
}

/** Open a Story to build on, or null for the list. */
export function openStory(storyId: string | null): void {
  stopPlaying();
  update((shelf) =>
    shelf.openId === storyId ||
    (storyId !== null && !shelf.stories.some((s) => s.id === storyId))
      ? shelf
      : { ...shelf, openId: storyId },
  );
}

export function renameStory(storyId: string, title: string): void {
  update((shelf) =>
    withStory(shelf, storyId, (s) => (s.title === title ? s : { ...s, title })),
  );
}

export function setStoryDescription(storyId: string, description: string) {
  update((shelf) =>
    withStory(shelf, storyId, (s) =>
      s.description === description ? s : { ...s, description },
    ),
  );
}

export function deleteStory(storyId: string): void {
  if (playing?.storyId === storyId) stopPlaying();
  update((shelf) =>
    shelf.stories.some((s) => s.id === storyId)
      ? {
          stories: shelf.stories.filter((s) => s.id !== storyId),
          openId: shelf.openId === storyId ? null : shelf.openId,
        }
      : shelf,
  );
}

/* ── Stops ───────────────────────────────────────────────────────────────── */

export type AddResult =
  | { status: 'added'; storyId: string }
  | { status: 'already'; storyId: string }
  | { status: 'unavailable' };

/**
 * Add a stop to the open Story — a first one, "My story", when there is
 * none — at its end. The same thing twice is one stop.
 */
export function addStop(target: StoryTarget, title: string): AddResult {
  if (getLocalStoreUserKey() === null) return { status: 'unavailable' };
  const storyId = current().openId ?? createStory(FIRST_STORY_TITLE);
  if (!storyId) return { status: 'unavailable' };
  const story = current().stories.find((s) => s.id === storyId);
  const key = storyTargetKey(target);
  if (story?.stops.some((stop) => storyTargetKey(stop.target) === key)) {
    return { status: 'already', storyId };
  }
  const stop: StoryStop = {
    id: newId(),
    target,
    title,
    note: '',
    addedAt: Date.now(),
  };
  update((shelf) =>
    withStory(shelf, storyId, (s) => ({ ...s, stops: [...s.stops, stop] })),
  );
  return { status: 'added', storyId };
}

export function removeStop(storyId: string, stopId: string): void {
  update((shelf) =>
    withStory(shelf, storyId, (s) =>
      s.stops.some((stop) => stop.id === stopId)
        ? { ...s, stops: s.stops.filter((stop) => stop.id !== stopId) }
        : s,
    ),
  );
}

/** Move a stop up (-1) or down (+1) the Story. */
export function moveStop(storyId: string, stopId: string, by: -1 | 1): void {
  update((shelf) =>
    withStory(shelf, storyId, (s) => {
      const from = s.stops.findIndex((stop) => stop.id === stopId);
      const to = from + by;
      if (from < 0 || to < 0 || to >= s.stops.length) return s;
      const stops = [...s.stops];
      [stops[from], stops[to]] = [stops[to], stops[from]];
      return { ...s, stops };
    }),
  );
}

export function editStop(
  storyId: string,
  stopId: string,
  patch: Partial<Pick<StoryStop, 'title' | 'note'>>,
): void {
  update((shelf) =>
    withStory(shelf, storyId, (s) => {
      const stop = s.stops.find((x) => x.id === stopId);
      if (
        !stop ||
        ((patch.title ?? stop.title) === stop.title &&
          (patch.note ?? stop.note) === stop.note)
      ) {
        return s;
      }
      return {
        ...s,
        stops: s.stops.map((x) => (x.id === stopId ? { ...x, ...patch } : x)),
      };
    }),
  );
}

export function useStoryShelf(): StoryShelf {
  return useSyncExternalStore(subscribe, current, () => EMPTY);
}

/* ── Playing: the page's alone ───────────────────────────────────────────── */

export interface StoryPlayback {
  storyId: string;
  step: number;
}

let playing: StoryPlayback | null = null;
const playListeners = new Set<() => void>();

function setPlaying(next: StoryPlayback | null) {
  if (
    next === playing ||
    (next &&
      playing &&
      next.storyId === playing.storyId &&
      next.step === playing.step)
  ) {
    return;
  }
  playing = next;
  playListeners.forEach((fn) => fn());
}

export const playStory = (storyId: string, step = 0) =>
  setPlaying({ storyId, step });

export function stopPlaying(): void {
  setPlaying(null);
}

export function useStoryPlayback(): StoryPlayback | null {
  return useSyncExternalStore(
    (listener) => {
      playListeners.add(listener);
      return () => playListeners.delete(listener);
    },
    () => playing,
    () => null,
  );
}

/** Tests: forget the page's copy and stop playing. */
export function resetStoriesForTests(): void {
  cached = null;
  playing = null;
}
