import { useEffect, useState } from 'react';
import { getChordScales } from '@/components/learn/chordScaleData';
import { LearnRoutes, StudioRoutes } from '@/constants/routes';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { getSong } from '@/curriculum/data/songs';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { keyLabelToUrlParam, urlParamToKeyLabel } from '@/lib/musicKeyUrl';
import { studioProjectsApi } from '@/lib/studio-projects/api';
import type { PrismModeSlug } from './prism';
import { useProgressSummary } from './progress/useProgressSummary';

export type ActivityKind = 'lesson' | 'project' | 'song';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  category: string;
  title: string;
  subtitle: string;
  thumbnail?: string;
  route: string;
  touchedAt: number;
}

const MAX_ITEMS = 10;

const timeFromIso = (iso: string | null | undefined): number =>
  iso ? new Date(iso).getTime() || 0 : 0;

/**
 * Merged "Recent Activity" feed: recent lessons + recent Studio projects +
 * recently saved songs. No new backend — everything composes existing sources.
 */
export const useRecentActivity = (): ActivityItem[] => {
  const token = useAuthToken();
  const { data: progress } = useProgressSummary(true);
  const savedIds = useSavedSongsStore((s) => s.savedIds);
  const savedAt = useSavedSongsStore((s) => s.savedAt);

  const [projects, setProjects] = useState<ActivityItem[]>([]);
  useEffect(() => {
    if (!token) {
      setProjects([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await studioProjectsApi.list(token);
        if (cancelled) return;
        setProjects(
          list.slice(0, MAX_ITEMS).map((p) => ({
            id: `project:${p.id}`,
            kind: 'project' as const,
            category: 'Studio Project',
            title: p.name || 'Untitled Project',
            subtitle: p.composerName || `${p.bpm ?? '—'} BPM`,
            route: `${StudioRoutes.root.definition}?project=${encodeURIComponent(p.id)}`,
            touchedAt:
              (p.updatedAt instanceof Date
                ? p.updatedAt.getTime()
                : new Date(p.updatedAt as unknown as string).getTime()) || 0,
          })),
        );
      } catch (err) {
        console.error('Failed to load recent studio projects', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const lessons: ActivityItem[] = (progress?.lessons ?? [])
    .filter(
      (l) =>
        l.lessonId.startsWith('mode-lesson-flow') &&
        !!l.mode &&
        !!l.root &&
        (l.completedCount ?? 0) > 0,
    )
    .map((l) => {
      const mode = l.mode as PrismModeSlug;
      const modeName = getChordScales(mode)?.modeName ?? mode;
      const rootLabel = urlParamToKeyLabel(l.root!);
      return {
        id: `lesson:${l.lessonId}`,
        kind: 'lesson' as const,
        category: 'Lesson',
        title: `${modeName} in ${rootLabel}`,
        subtitle: `${l.completedCount}/${l.totalCount ?? '—'} activities`,
        route: LearnRoutes.lesson({
          mode,
          key: keyLabelToUrlParam(l.root!),
        }),
        touchedAt: timeFromIso(l.updatedAt),
      };
    });

  const songs: ActivityItem[] = Object.keys(savedIds)
    .map((songId) => {
      const song = getSong(songId);
      if (!song) return null;
      return {
        id: `song:${songId}`,
        kind: 'song' as const,
        category: 'Saved Song',
        title: song.title,
        subtitle: song.artist,
        thumbnail: song.artistImageRef,
        route: `/songs/${song.id}`,
        touchedAt: savedAt[songId] ?? 0,
      };
    })
    .filter((item): item is ActivityItem => item !== null);

  return [...lessons, ...projects, ...songs]
    .sort((a, b) => b.touchedAt - a.touchedAt)
    .slice(0, MAX_ITEMS);
};
