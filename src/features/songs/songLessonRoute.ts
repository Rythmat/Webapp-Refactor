// ── A song's lesson ────────────────────────────────────────────────────────
// Where "Open in Lesson" goes: the Theory lesson of the song's mode in its
// key, on piano (/learn/:mode/:key) or on guitar (/learn/guitar/:mode/:key).

import { guitarLessonRoute } from '@/components/learn/guitarTheory';
import { LearnRoutes } from '@/constants/routes';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';

/** A song's mode as a Theory slug: major/minor → their church-mode names. */
export const normalizeLessonMode = (mode: SongMode): string => {
  if (mode === 'major') return 'ionian';
  if (mode === 'minor') return 'aeolian';
  return mode;
};

/** The song key's tonic: 'B♭ major' → 'B♭'. */
const tonicOf = (song: Song): string => song.key.trim().split(/\s+/)[0] ?? '';

/**
 * The piano Theory lesson (`/learn/:mode/:key`).
 *
 * `song.key` is a full label ('C major', 'B♭ minor'); the Lesson page parses
 * `:key` as a bare letter+accidental token (`urlParamToKeyLabel`), so it MUST
 * be canonicalized — passing the raw label silently resolves accidental keys
 * to the wrong note (e.g. 'B♭ major' → 'B' natural).
 */
export const songLessonRoute = (song: Song): string =>
  LearnRoutes.lesson({
    mode: normalizeLessonMode(song.mode),
    key: keyLabelToUrlParam(tonicOf(song)),
  });

/** The guitar Theory lesson (`/learn/guitar/:mode/:key`). */
export const songGuitarLessonRoute = (song: Song): string =>
  guitarLessonRoute(normalizeLessonMode(song.mode), tonicOf(song));
