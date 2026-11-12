import { useMemo } from 'react';
import type { LibraryItem } from '@/features/library/libraryItems';
import { studioHrefOf } from '@/features/library/libraryTypes';
import { useLibraryItems } from '@/features/library/useLibraryItems';
import {
  useRecentLessons,
  useSavedSongsActivity,
  useViewedSongsActivity,
} from '@/hooks/data/useLearnActivity';
import type { ActivityItem } from '@/hooks/data/useRecentActivity';
import type { WorkPlace } from '../../types';

// ── This class's work (owner, 2026-11-11) ──────────────────────────────────
// What a student touched since the lesson began, in the places the
// Individual Project opens: Studio sessions (made in the Studio or the
// Library), Learn lessons, and songs viewed or saved. At the end of class
// they pick one to show the class or send their teacher. The Globe keeps no
// work of its own yet (its mind map lives only while open), so it has none
// to offer.

export interface ClassWorkItem {
  /** Unique in the list. */
  key: string;
  place: WorkPlace;
  /** The item's own id (a Studio project's or draft's, a lesson's, a song's). */
  projectId: string;
  name: string;
  touchedAt: number;
  /** Where it opens in the app. */
  deepLink: string;
}

const studioWork = (item: LibraryItem): ClassWorkItem => ({
  key: `studio:${item.key}`,
  place: 'studio',
  projectId:
    item.source.kind === 'cloud' ? item.source.projectId : item.source.draftId,
  name: item.name,
  touchedAt: item.updatedAt,
  deepLink: studioHrefOf(item.source),
});

const activityWork =
  (place: WorkPlace) =>
  (item: ActivityItem): ClassWorkItem => ({
    key: `${place}:${item.id}`,
    place,
    projectId: item.id,
    name: item.title,
    touchedAt: item.touchedAt,
    deepLink: item.route,
  });

/**
 * Pure: the work touched since `since` (epoch ms), newest first, one entry
 * per thing (a song both viewed and saved counts once, at its latest touch).
 */
export function classWorkSince(
  sources: {
    studio: readonly LibraryItem[];
    lessons: readonly ActivityItem[];
    songs: readonly ActivityItem[];
  },
  since: number,
): ClassWorkItem[] {
  const all = [
    ...sources.studio.map(studioWork),
    ...sources.lessons.map(activityWork('learn')),
    ...sources.songs.map(activityWork('songs')),
  ];
  const latest = new Map<string, ClassWorkItem>();
  for (const item of all) {
    if (!(item.touchedAt >= since)) continue;
    const held = latest.get(item.key);
    if (!held || item.touchedAt > held.touchedAt) latest.set(item.key, item);
  }
  return [...latest.values()].sort((a, b) => b.touchedAt - a.touchedAt);
}

/** This class's work: what was touched since the session `startedAt`. */
export function useClassWork(startedAt: string | null | undefined) {
  const { items, loading } = useLibraryItems();
  // Any lesson touched, finished or not.
  const lessons = useRecentLessons(0);
  const saved = useSavedSongsActivity();
  const viewed = useViewedSongsActivity();
  const since = startedAt ? Date.parse(startedAt) : Number.NaN;

  const work = useMemo(
    () =>
      Number.isFinite(since)
        ? classWorkSince(
            { studio: items, lessons, songs: [...saved, ...viewed] },
            since,
          )
        : [],
    [items, lessons, saved, viewed, since],
  );
  return { work, loading };
}
