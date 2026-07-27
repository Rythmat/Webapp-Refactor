/**
 * Phase 2 — the ONE shared resolver from an app-route target to a real in-SPA
 * route. App-route slides (and legacy Launch tiles) carry a `{ module,
 * activityRef }` pair; songs carry `ContentRef`s. This module maps both to a
 * concrete href WITHIN this SPA — no external module deployment, no MSP token
 * (the launcher appends the token separately, see `msp/mspLaunchParams.ts`).
 *
 * Pure — no React, no response hooks — so it is safe to import from `slides/`
 * components and unit-test without the song library.
 *
 * activityRef conventions (namespaced, colon-delimited):
 *   song:<id>:lesson | song:<id>:chart
 *   learn:<mode>:<key>[:activity]
 *   curriculum:<GENRE>:<L#>[:A|B|C|D]
 *   globe:event:<id> | globe:pathway:<id>
 *   studio:song:<id> | studio:template:<id>
 * Legacy bare refs (no recognized `<ns>:` prefix) are interpreted via `module`
 * (e.g. an annual-plan globe LaunchTile whose activityRef is a bare event id).
 */
import {
  AtlasRoutes,
  CurriculumRoutes,
  LearnRoutes,
  SongRoutes,
  StudioRoutes,
} from '@/constants/routes';
import {
  CURRICULUM_GENRE_SLUGS,
  SLUG_TO_CURRICULUM_GENRE,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import type { ContentRef, Song } from '@/curriculum/types/songLibrary';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { songLessonRoute } from './songDeepLinks';

export interface ResolveContentDeps {
  /** Injected so the resolver never static-imports the 650-song library. */
  getSong?: (id: string) => Song | null;
}

type AtlasModule = 'globe' | 'learn' | 'studio' | 'arcade';

const KNOWN_NAMESPACES = new Set([
  'song',
  'learn',
  'curriculum',
  'globe',
  'studio',
]);

/**
 * Canonicalize a music key to the bare URL-param token the Lesson page parses
 * (`urlParamToKeyLabel` reads letter+accidental only). Handles full labels
 * ('C major' → 'c', 'B♭ minor' → 'bflat') and is idempotent on already-
 * canonical tokens ('fsharp' → 'fsharp').
 */
export const canonicalLessonKeyParam = (raw: string): string =>
  keyLabelToUrlParam((raw ?? '').trim().split(/\s+/)[0] ?? '');

/** Uppercase-normalize a genre segment to a `CurriculumGenreId`, accepting slug form too. */
const toCurriculumGenreId = (segment: string): CurriculumGenreId | null => {
  const upper = segment.toUpperCase();
  if (upper in CURRICULUM_GENRE_SLUGS) return upper as CurriculumGenreId;
  const bySlug = SLUG_TO_CURRICULUM_GENRE[segment.toLowerCase()];
  return bySlug ?? null;
};

/** `L1` | `1` → `'1'`; anything else → null. */
const levelDigits = (segment: string): string | null => {
  const m = segment.match(/^L?(\d)$/i);
  return m ? m[1] : null;
};

const isSection = (
  segment: string | undefined,
): segment is 'A' | 'B' | 'C' | 'D' =>
  segment === 'A' || segment === 'B' || segment === 'C' || segment === 'D';

/**
 * Resolve a `{ module, activityRef }` pair (atlas Interaction OR LaunchTile) to
 * an in-SPA href, or null when unresolvable (caller falls back).
 */
export const resolveActivityRefHref = (
  module: AtlasModule,
  activityRef: string | null | undefined,
  deps?: ResolveContentDeps,
): string | null => {
  const ref = activityRef?.trim();
  if (!ref) return null;

  const parts = ref.split(':');
  const ns = parts[0];

  // Legacy / bare refs: no recognized namespace → interpret via module.
  if (!KNOWN_NAMESPACES.has(ns) || parts.length < 2) {
    if (module === 'globe')
      return `${AtlasRoutes.globe()}?event=${encodeURIComponent(ref)}`;
    return null;
  }

  switch (ns) {
    case 'song': {
      const songId = parts[1];
      const kind = parts[2];
      if (kind === 'chart') return SongRoutes.song({ songId });
      // 'lesson' (default) → the song's Theory lesson for its key/mode.
      const song = deps?.getSong?.(songId) ?? null;
      return song ? songLessonRoute(song) : null;
    }
    case 'learn': {
      const mode = parts[1];
      const key = parts[2];
      const activity = parts[3];
      if (!mode || !key) return null;
      return LearnRoutes.lesson(
        { mode, key: canonicalLessonKeyParam(key) },
        activity ? { activity } : undefined,
      );
    }
    case 'curriculum': {
      const genreId = toCurriculumGenreId(parts[1] ?? '');
      const level = levelDigits(parts[2] ?? '');
      if (!genreId || !level) return null;
      const slug = CURRICULUM_GENRE_SLUGS[genreId];
      const section = parts[3];
      return CurriculumRoutes.genreLevel(
        { genre: slug, level },
        isSection(section) ? { section } : undefined,
      );
    }
    case 'globe': {
      const sub = parts[1];
      const id = parts.slice(2).join(':');
      if (sub === 'pathway' && id)
        return `${AtlasRoutes.globe()}?pathway=${encodeURIComponent(id)}`;
      if (sub === 'event' && id)
        return `${AtlasRoutes.globe()}?event=${encodeURIComponent(id)}`;
      return AtlasRoutes.globe();
    }
    case 'studio': {
      const sub = parts[1];
      const id = parts.slice(2).join(':');
      if (sub === 'song' && id)
        return `${StudioRoutes.editor()}?song=${encodeURIComponent(id)}`;
      if (sub === 'template' && id)
        return `${StudioRoutes.editor()}?template=${encodeURIComponent(id)}`;
      return StudioRoutes.editor();
    }
    default:
      return null;
  }
};

/**
 * Best-effort map of a song `ContentRef` (curriculum module vocabulary) to an
 * in-SPA href. Used where a slide/tile references song content directly.
 */
export const resolveContentRefHref = (ref: ContentRef): string | null => {
  switch (ref.module) {
    case 'theory': {
      // topicId convention 'modes_<mode>' → the mode overview page.
      const mode = ref.topicId?.startsWith('modes_')
        ? ref.topicId.slice('modes_'.length)
        : undefined;
      return mode ? LearnRoutes.overview({ mode }) : null;
    }
    case 'genre': {
      if (!ref.genre) return null;
      const genreId = toCurriculumGenreId(ref.genre);
      if (!genreId) return null;
      const slug = CURRICULUM_GENRE_SLUGS[genreId];
      const level = ref.level ? String(ref.level).replace(/^L/i, '') : null;
      return level
        ? CurriculumRoutes.genreLevel({ genre: slug, level })
        : CurriculumRoutes.genre({ genre: slug });
    }
    case 'globe':
      // Origin strings are not event ids — land on the globe without a param.
      return AtlasRoutes.globe();
    case 'studio':
      return ref.studioPreset
        ? `${StudioRoutes.editor()}?template=${encodeURIComponent(ref.studioPreset)}`
        : StudioRoutes.editor();
    default:
      return null;
  }
};
