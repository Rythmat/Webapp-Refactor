import { getChordScales } from '@/components/learn/chordScaleData';
import { CurriculumRoutes, LearnRoutes } from '@/constants/routes';
import {
  CURRICULUM_GENRE_SLUGS,
  curriculumToEngineGenre,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import {
  getGenreTileImage,
  getTheoryTileImage,
} from '@/curriculum/data/learnTileImages';
import { getSong } from '@/curriculum/data/songs';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { useViewedSongsStore } from '@/features/songs/useViewedSongsStore';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { keyLabelToUrlParam, urlParamToKeyLabel } from '@/lib/musicKeyUrl';
import type { PrismModeSlug } from './prism';
import { useProgressSummary } from './progress/useProgressSummary';
import type { ActivityItem } from './useRecentActivity';

const MAX_LESSONS = 10;

const timeFromIso = (iso: string | null | undefined): number =>
  iso ? new Date(iso).getTime() || 0 : 0;

/**
 * Recent lessons for the Learn hub — theory (mode) lessons AND genre curriculum
 * lessons, most-recent first. Reuses the same progress source + mapping as the
 * dashboard RecentActivity feed, but scoped to Learn (no Studio projects) and
 * extended to cover `curriculum:{GENRE}:{LEVEL}` entries.
 *
 * `minCompleted` filters by completed-activity count: the default of 1 keeps
 * only lessons with real progress (the Recent Lessons section); pass 0 to
 * include started-but-unfinished lessons (the "Continue" bar).
 */
export const useRecentLessons = (minCompleted = 1): ActivityItem[] => {
  const { data: progress } = useProgressSummary(true);

  return (progress?.lessons ?? [])
    .filter((l) => (l.completedCount ?? 0) >= minCompleted)
    .map((l): ActivityItem | null => {
      // Theory (mode) lesson
      if (l.lessonId.startsWith('mode-lesson-flow') && l.mode && l.root) {
        const mode = l.mode as PrismModeSlug;
        const modeName = getChordScales(mode)?.modeName ?? mode;
        const rootLabel = urlParamToKeyLabel(l.root);
        return {
          id: `lesson:${l.lessonId}`,
          kind: 'lesson',
          category: 'Theory',
          title: `${modeName} in ${rootLabel}`,
          subtitle: `${l.completedCount}/${l.totalCount ?? '—'} activities`,
          accentColor: colorForKeyMode(rootLabel, mode),
          image: getTheoryTileImage(mode),
          route: LearnRoutes.lesson({ mode, key: keyLabelToUrlParam(l.root) }),
          touchedAt: timeFromIso(l.updatedAt),
        };
      }

      // Genre curriculum lesson: `curriculum:{GENRE}:{LEVEL}`
      if (l.lessonId.startsWith('curriculum:')) {
        const parts = l.lessonId.split(':');
        if (parts.length !== 3) return null;
        const genreId = parts[1] as CurriculumGenreId;
        const slug = CURRICULUM_GENRE_SLUGS[genreId];
        if (!slug) return null; // unknown genre (e.g. fundamentals) — skip
        const level = parts[2].replace(/^L/, '');
        return {
          id: `lesson:${l.lessonId}`,
          kind: 'lesson',
          category: 'Genre',
          title: `${curriculumToEngineGenre(genreId)} · Level ${level}`,
          subtitle: `${l.completedCount}/${l.totalCount ?? '—'} activities`,
          accentColor: getGenreProfile(slug)?.accentColor,
          image: getGenreTileImage(slug),
          route: CurriculumRoutes.genreLevel({ genre: slug, level }),
          touchedAt: timeFromIso(l.updatedAt),
        };
      }

      return null;
    })
    .filter((item): item is ActivityItem => item !== null)
    .sort((a, b) => b.touchedAt - a.touchedAt)
    .slice(0, MAX_LESSONS);
};

/**
 * Saved songs as activity items, most-recently-saved first. Same mapping the
 * dashboard RecentActivity feed uses for its `song` branch.
 */
export const useSavedSongsActivity = (): ActivityItem[] => {
  const savedIds = useSavedSongsStore((s) => s.savedIds);
  const savedAt = useSavedSongsStore((s) => s.savedAt);

  return Object.keys(savedIds)
    .map((songId): ActivityItem | null => {
      const song = getSong(songId);
      if (!song) return null;
      return {
        id: `song:${songId}`,
        kind: 'song',
        category: 'Saved Song',
        title: song.title,
        subtitle: song.artist,
        thumbnail: song.artistImageRef,
        route: `/songs/${song.id}`,
        touchedAt: savedAt[songId] ?? 0,
      };
    })
    .filter((item): item is ActivityItem => item !== null)
    .sort((a, b) => b.touchedAt - a.touchedAt);
};

/**
 * Songs the user has recently *looked at* (opened the detail page for), saved or
 * not, most-recent first.
 */
export const useViewedSongsActivity = (): ActivityItem[] => {
  const viewedAt = useViewedSongsStore((s) => s.viewedAt);

  return Object.entries(viewedAt)
    .map(([songId, ts]): ActivityItem | null => {
      const song = getSong(songId);
      if (!song) return null;
      return {
        id: `song:${songId}`,
        kind: 'song',
        category: 'Song',
        title: song.title,
        subtitle: song.artist,
        thumbnail: song.artistImageRef,
        route: `/songs/${song.id}`,
        touchedAt: ts,
      };
    })
    .filter((item): item is ActivityItem => item !== null)
    .sort((a, b) => b.touchedAt - a.touchedAt);
};

/**
 * The single most-recent Learn activity — the last song looked at (saved or
 * not) OR the last lesson interacted with (finished or not), whichever is newer.
 * Learn-only: excludes Studio projects. Powers the Learn hub's "Continue" bar.
 */
export const useLastLearnActivity = (): ActivityItem | undefined => {
  const viewedSongs = useViewedSongsActivity();
  const lessons = useRecentLessons(0); // include started-but-unfinished lessons
  return [...viewedSongs, ...lessons].sort(
    (a, b) => b.touchedAt - a.touchedAt,
  )[0];
};
