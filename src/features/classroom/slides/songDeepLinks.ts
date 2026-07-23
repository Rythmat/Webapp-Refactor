/**
 * Pure song → deep-link / featured-visual helpers for the slides feature.
 *
 * No React — this is the data half of the wizard's "auto-fill from a song"
 * step, extracted from `useSongActions` (`openInLesson` / `openInGlobe`) and
 * `SongDetailPage` (`extractYouTubeId`) so deck templates can run outside a
 * component tree and be unit-tested. The lesson/globe routes are consumed by
 * Phase 2 app-route slides; they're exported now for API stability.
 */
import { AtlasRoutes, LearnRoutes } from '@/constants/routes';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import type { SlideMedia } from './types';

/** Extract a YouTube video id from a watch / share / embed URL. Ported from `SongDetailPage`. */
const extractYouTubeId = (uri: string): string | null => {
  const match = uri.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
};

/**
 * Find the song's YouTube audio source and extract its video id. `startSec`
 * mirrors `AudioSource.startOffsetSec` (seconds into the recording where bar 1
 * begins) so a media slide can start where the chart starts. Returns null when
 * the song has no parseable YouTube source — templates skip the media slide.
 */
export const getYouTubeVideoId = (
  song: Song,
): { videoId: string; startSec?: number } | null => {
  for (const source of song.audioSources) {
    if (source.provider !== 'youtube') continue;
    const videoId = extractYouTubeId(source.uri);
    if (!videoId) continue;
    return {
      videoId,
      ...(source.startOffsetSec !== undefined
        ? { startSec: source.startOffsetSec }
        : {}),
    };
  }
  return null;
};

/**
 * The featured visual shown beside a media slide's video: the artist portrait
 * when the song ships one, else the Pathways mini-globe.
 *
 * `GlobeOrigin` is string metadata only (region / country / era / scene — no
 * lat/lng anywhere on the type), so no marker coordinates are derivable here;
 * the Phase 2 content-ref resolver owns origin → coordinates. Until then the
 * globe renders unmarked.
 */
export const getFeaturedVisual = (song: Song): SlideMedia =>
  song.artistImageRef
    ? { type: 'artistImage', songId: song.id }
    : { type: 'globePreview' };

/** `useSongActions.openInLesson`'s mode mapping — major/minor → church-mode slugs. */
const normalizeLessonMode = (mode: SongMode): string => {
  if (mode === 'major') return 'ionian';
  if (mode === 'minor') return 'aeolian';
  return mode;
};

/**
 * The Theory lesson route `openInLesson` navigates to (`/learn/:mode/:key`).
 *
 * `song.key` is a full label ('C major', 'B♭ minor'); the Lesson page parses
 * `:key` as a bare letter+accidental token (`urlParamToKeyLabel`), so it MUST
 * be canonicalized — passing the raw label silently resolves accidental keys
 * to the wrong note (e.g. 'B♭ major' → 'B' natural).
 */
export const songLessonRoute = (song: Song): string =>
  LearnRoutes.lesson({
    mode: normalizeLessonMode(song.mode),
    key: keyLabelToUrlParam(song.key.trim().split(/\s+/)[0] ?? ''),
  });

/**
 * The Globe route `openInGlobe` navigates to — lands with the song's pin
 * selected. Targets `/atlas/globe` (NOT the `/atlas` dashboard, which ignores
 * `?event=`); the full globe consumes the param and flies to the pin.
 */
export const songGlobeRoute = (song: Song): string =>
  `${AtlasRoutes.globe()}?event=song-${song.id}`;
