import { useEffect, useState } from 'react';
import { StudioRoutes } from '@/constants/routes';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { studioProjectsApi } from '@/lib/studio-projects/api';
import { studioTileAccent } from '@/lib/studioProjectTile';
import {
  useRecentLessons,
  useSavedSongsActivity,
  useViewedSongsActivity,
} from './useLearnActivity';

export type ActivityKind = 'lesson' | 'project' | 'song';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  category: string;
  title: string;
  subtitle: string;
  thumbnail?: string;
  /** Optional accent color (e.g. a Theory lesson's mode/key color). */
  accentColor?: string;
  /** Optional interactive hex-tile SVG path (a lesson's Genre/Theory tile art). */
  image?: string;
  route: string;
  touchedAt: number;
}

const MAX_ITEMS = 10;

/**
 * Merged "Recent Activity" feed for the Home dashboard — ALL learn activity:
 * recent lessons (theory + genre), recent Studio projects, and recently saved
 * OR viewed songs. Composes the shared Learn activity hooks so lesson mapping,
 * accent colors, and song tracking stay in one place.
 */
export const useRecentActivity = (): ActivityItem[] => {
  const token = useAuthToken();
  const lessons = useRecentLessons(1);
  const savedSongs = useSavedSongsActivity();
  const viewedSongs = useViewedSongsActivity();

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
            // Stripe colour from the same seed the tile SVG uses (item.id).
            accentColor: studioTileAccent(`project:${p.id}`),
            route: `${StudioRoutes.editor.definition}?project=${encodeURIComponent(p.id)}`,
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

  // Songs: merge saved + viewed, one entry per song (keep the more-recent touch).
  const songMap = new Map<string, ActivityItem>();
  for (const s of [...savedSongs, ...viewedSongs]) {
    const prev = songMap.get(s.id);
    if (!prev || s.touchedAt > prev.touchedAt) songMap.set(s.id, s);
  }

  return [...lessons, ...projects, ...Array.from(songMap.values())]
    .sort((a, b) => b.touchedAt - a.touchedAt)
    .slice(0, MAX_ITEMS);
};
