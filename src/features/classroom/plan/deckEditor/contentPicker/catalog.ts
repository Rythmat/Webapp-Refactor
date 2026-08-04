/**
 * Pickable-content catalog — enumerates app content as a common `PickableItem`
 * shape whose `ref` is built via `contentRefs` (so every emitted ref resolves)
 * and whose `keywords` feed the search scorer. Enumerators are pure and called
 * lazily per active tab; nothing is snapshotted at module scope.
 */
import { regionCities } from '@/components/ClassroomLayout/globe/data/regionCities';
import { REGION_HINTS } from '@/components/ClassroomLayout/globe/data/regionHints';
import { CITIES, MUSICAL_ERAS, REGIONS } from '@/components/atlas/data';
import type { HistoricalEvent, RegionId } from '@/components/atlas/types';
import {
  CURRICULUM_GENRE_IDS,
  CURRICULUM_GENRE_SLUGS,
} from '@/curriculum/bridge/genreIdMap';
import { getAllLinkedModes } from '@/curriculum/bridge/learnCurriculumLinks';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import type { Song } from '@/curriculum/types/songLibrary';
import { PROJECT_TEMPLATES } from '@/daw/data/projectTemplates';
import { scoreKeywords } from '@/features/search/match';
import {
  curriculumRef,
  eventRef,
  globeCityRef,
  globeEraRef,
  globeRegionRef,
  learnRef,
  songChartRef,
  songLessonRef,
  studioTemplateRef,
} from '../../../slides/contentRefs';
import type { SlideMedia } from '../../../slides/types';
import type { LaunchTile } from '../../../types';

/** A ready-to-slot tile minus its id (the caller assigns the uid). */
export type PickedTile = Omit<LaunchTile, 'id'>;

/**
 * Media a picked item embeds on the slide, alongside its launch tile. A globe
 * pathway emits `{ media }`; a song emits `{ media: youtube, sideMedia:
 * artistImage }` so both become independent freeform blocks.
 */
export interface SlideMediaEmbed {
  media?: SlideMedia;
  sideMedia?: SlideMedia;
}

export interface PickableThumb {
  imageUrl?: string;
  emoji?: string;
  /** Accent color for a fallback dot/tile. */
  color?: string;
}

export interface PickableItem {
  /** Stable React key + de-dupe key. */
  key: string;
  module: LaunchTile['module'];
  /** Namespaced activityRef built via contentRefs. */
  ref: string;
  /** Primary line + default tile label. */
  title: string;
  subtitle?: string;
  thumb?: PickableThumb;
  /** Natural-case tokens; the scorer lowercases the haystack itself. */
  keywords: string[];
  /** Song items only — lets the Songs tab resolve the Song to embed its video. */
  songId?: string;
}

const MAX_RESULTS = 40;

/** Rank items by keyword score for a query; browse (empty query) returns head. */
export const searchItems = (
  items: PickableItem[],
  query: string,
  cap = MAX_RESULTS,
): PickableItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, cap);
  return items
    .map((item) => ({ item, score: scoreKeywords(item.keywords, q) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
    .map((r) => r.item);
};

// ── Songs ────────────────────────────────────────────────────────────────
const songThumb = (song: Song): PickableThumb =>
  song.artistImageSource !== 'none' && song.artistImageRef
    ? { imageUrl: song.artistImageRef }
    : {};

export type SongDestination = 'chart' | 'lesson';

export const songItems = (
  songs: Song[],
  dest: SongDestination,
): PickableItem[] =>
  songs.map((song) => ({
    key: `song:${song.id}:${dest}`,
    module: 'learn' as const,
    ref: dest === 'chart' ? songChartRef(song.id) : songLessonRef(song.id),
    title: dest === 'lesson' ? `${song.title} — Theory` : song.title,
    subtitle: song.artist,
    thumb: songThumb(song),
    keywords: [song.title, song.artist, ...(song.genreTags ?? [])],
    songId: song.id,
  }));

// ── Theory: Learn modes × keys ─────────────────────────────────────────────
const MODE_LABELS: Record<string, string> = {
  ionian: 'Ionian (Major)',
  aeolian: 'Aeolian (Minor)',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  pentatonicMajor: 'Pentatonic Major',
  pentatonicMinor: 'Pentatonic Minor',
  blues: 'Blues',
  harmonicMinor: 'Harmonic Minor',
};
const modeLabel = (mode: string): string => MODE_LABELS[mode] ?? mode;

/** Display label + canonical URL token, one per chromatic pitch. */
const KEYS: { token: string; label: string }[] = [
  { token: 'c', label: 'C' },
  { token: 'csharp', label: 'C♯' },
  { token: 'd', label: 'D' },
  { token: 'eflat', label: 'E♭' },
  { token: 'e', label: 'E' },
  { token: 'f', label: 'F' },
  { token: 'fsharp', label: 'F♯' },
  { token: 'g', label: 'G' },
  { token: 'aflat', label: 'A♭' },
  { token: 'a', label: 'A' },
  { token: 'bflat', label: 'B♭' },
  { token: 'b', label: 'B' },
];

/** Every Learn-linked mode × the 12 keys (~120 items). */
export const learnModeItems = (): PickableItem[] => {
  const items: PickableItem[] = [];
  for (const mode of getAllLinkedModes()) {
    const label = modeLabel(mode);
    for (const key of KEYS) {
      const title = `${key.label} ${label}`;
      items.push({
        key: `learn:${mode}:${key.token}`,
        module: 'learn',
        ref: learnRef(mode, key.token),
        title,
        subtitle: 'Theory lesson',
        keywords: [title, key.label, label, mode],
      });
    }
  }
  return items;
};

// ── Genre: one entry per curriculum genre (whole-genre entry = level 1) ─────
export const genreItems = (): PickableItem[] =>
  CURRICULUM_GENRE_IDS.map((id) => {
    const slug = CURRICULUM_GENRE_SLUGS[id];
    const profile = getGenreProfile(slug);
    const title = profile?.displayName ?? id;
    return {
      key: `genre:${id}`,
      module: 'learn' as const,
      ref: curriculumRef(id, 1),
      title,
      subtitle: 'Genre curriculum',
      thumb: profile?.accentColor ? { color: profile.accentColor } : {},
      keywords: [title, id, slug, 'genre'],
    };
  });

// ── Studio: project-template starters ──────────────────────────────────────
export const studioTemplateItems = (): PickableItem[] =>
  PROJECT_TEMPLATES.map((t) => ({
    key: `studio:template:${t.id}`,
    module: 'studio' as const,
    ref: studioTemplateRef(t.id),
    title: t.label,
    subtitle: `${t.bpm} BPM · ${t.genre}`,
    thumb: t.color ? { color: t.color } : {},
    keywords: [t.label, t.genre, 'studio', 'project', 'create'],
  }));

// ── Events: historical events (MUSIC_HISTORY is hydrated; pass it lazily) ────
export const eventItems = (events: HistoricalEvent[]): PickableItem[] =>
  events.map((e) => ({
    key: `globe:event:${e.id}`,
    module: 'globe' as const,
    ref: eventRef(e.id),
    title: e.title,
    subtitle: `${e.year} · ${e.location.city}`,
    keywords: [
      e.title,
      e.location.city,
      e.location.country,
      String(e.year),
      ...e.genre,
      ...e.tags,
    ],
  }));

export const eventGlobeEmbed = (event: HistoricalEvent): SlideMediaEmbed => ({
  media: {
    type: 'globePreview',
    markers: [
      { location: [event.location.lat, event.location.lng], size: 0.09 },
    ],
  },
});

// ── Regions & Cities ───────────────────────────────────────────────────────
export const regionItems = (): PickableItem[] =>
  REGIONS.map((r) => ({
    key: `globe:region:${r.id}`,
    module: 'globe' as const,
    ref: globeRegionRef(r.id),
    title: r.label,
    subtitle: REGION_HINTS[r.id],
    thumb: { emoji: '🗺️' },
    keywords: [r.label, r.id.replace(/-/g, ' '), 'region'],
  }));

/** Curated music cities (marquee + region-tour stops), optionally one region. */
export const cityItems = (regionId?: RegionId): PickableItem[] => {
  const cities = regionId
    ? regionCities(regionId)
    : REGIONS.flatMap((r) => regionCities(r.id));
  return cities.map((c) => ({
    key: `globe:city:${c.id}`,
    module: 'globe' as const,
    ref: globeCityRef(c.id),
    title: c.name,
    subtitle: c.genres.slice(0, 3).join(' · '),
    thumb: { emoji: '📍' },
    keywords: [c.name, c.country, c.subdivision, ...c.genres],
  }));
};

export const regionGlobeEmbed = (regionId: string): SlideMediaEmbed => {
  const region = REGIONS.find((r) => r.id === regionId);
  const cities = regionCities(regionId).slice(0, 6);
  return {
    media: {
      type: 'globePreview',
      markers: cities.map((c) => ({ location: c.coordinates, size: 0.06 })),
      ...(region
        ? {
            arcs: cities.map((c) => ({
              from: region.center,
              to: c.coordinates,
            })),
          }
        : {}),
    },
  };
};

export const cityGlobeEmbed = (cityId: string): SlideMediaEmbed => {
  const city = CITIES.find((c) => c.id === cityId);
  return city
    ? {
        media: {
          type: 'globePreview',
          markers: [{ location: city.coordinates, size: 0.09 }],
        },
      }
    : {};
};

// ── Eras ───────────────────────────────────────────────────────────────────
export const eraItems = (): PickableItem[] =>
  MUSICAL_ERAS.map((e) => ({
    key: `globe:era:${e.id}`,
    module: 'globe' as const,
    ref: globeEraRef(e.id),
    title: e.label,
    subtitle: `${e.yearStart}–${e.yearEnd}`,
    thumb: { emoji: '🕰️' },
    keywords: [
      e.label,
      String(e.yearStart),
      String(e.yearEnd),
      'era',
      'history',
    ],
  }));
