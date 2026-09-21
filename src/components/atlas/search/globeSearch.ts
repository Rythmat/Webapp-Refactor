import { CITIES, CITY_COUNTRY_TO_ISO } from '@/components/atlas/data';
import {
  getAtlasArtists,
  type AtlasArtist,
} from '@/components/atlas/data/artists';
import type {
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import { normCountry } from '@/components/atlas/utils/country';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { scoreKeywords } from '@/features/search/match';

/**
 * Search scoped to the globe: artists, events, songs, and places.
 *
 * The app-wide search (features/search) spans every section and navigates away
 * from wherever you are; this one keeps you on the globe, and every result is
 * a stop the globe can open in place.
 */

export type GlobeResult =
  | {
      kind: 'artist';
      id: string;
      title: string;
      subtitle: string;
      artist: AtlasArtist;
    }
  | {
      kind: 'event';
      id: string;
      title: string;
      subtitle: string;
      event: HistoricalEvent;
    }
  | {
      kind: 'song';
      id: string;
      title: string;
      subtitle: string;
      event: HistoricalEvent;
    }
  | {
      kind: 'place';
      id: string;
      title: string;
      subtitle: string;
      place: SelectedLocation;
    };

export interface GlobeResultGroup {
  kind: GlobeResult['kind'];
  label: string;
  results: GlobeResult[];
  total: number;
}

const GROUP_LABELS: Record<GlobeResult['kind'], string> = {
  artist: 'Artists',
  event: 'History',
  song: 'Songs',
  place: 'Places',
};

/** Order groups appear in — artists first, since that is what people type. */
const GROUP_ORDER: GlobeResult['kind'][] = ['artist', 'place', 'event', 'song'];

/** Case- and accent-insensitive, so "cesaria" finds Cesária Évora. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/* ── Places (static, so built once) ──────────────────────────────────────── */

const COUNTRY_DISPLAY: Record<string, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  CA: 'Canada',
};

interface PlaceEntry {
  place: SelectedLocation;
  title: string;
  subtitle: string;
  keywords: string[];
}

let placeIndex: PlaceEntry[] | null = null;

function getPlaceIndex(): PlaceEntry[] {
  if (placeIndex) return placeIndex;
  const entries: PlaceEntry[] = [];
  const states = new Map<string, { name: string; country: string }>();
  const countries = new Map<string, string>();

  for (const city of CITIES) {
    const country = COUNTRY_DISPLAY[city.country] ?? city.country;
    entries.push({
      place: { type: 'city', id: city.id },
      title: city.name,
      subtitle: city.subdivision ? `${city.subdivision}, ${country}` : country,
      keywords: [city.name],
    });

    const n = normCountry(city.country);
    if (city.subdivision && (n === 'US' || n === 'CA')) {
      const stateCountry = n === 'CA' ? 'Canada' : 'United States';
      states.set(`${city.subdivision}|${stateCountry}`, {
        name: city.subdivision,
        country: stateCountry,
      });
    }
    countries.set(city.country, country);
  }

  for (const { name, country } of states.values()) {
    entries.push({
      place: { type: 'state', name, country },
      title: name,
      subtitle: country === 'Canada' ? 'Province' : 'State',
      keywords: [name],
    });
  }

  for (const [code, display] of countries) {
    entries.push({
      place: {
        type: 'country',
        name: display,
        iso: CITY_COUNTRY_TO_ISO[code] ?? '',
      },
      title: display,
      subtitle: 'Country',
      keywords: code === display ? [display] : [display, code],
    });
  }

  placeIndex = entries;
  return entries;
}

/* ── Search ──────────────────────────────────────────────────────────────── */

type Scored = { result: GlobeResult; score: number };

function placeKey(place: SelectedLocation): string {
  return place.type === 'city'
    ? `city:${place.id}`
    : place.type === 'state'
      ? `state:${place.name}:${place.country}`
      : `country:${place.name}`;
}

/**
 * Every match for `query`, grouped and ranked. `cap` limits each group (the
 * dropdown shows a few per group; the results panel shows them all).
 */
export function searchGlobe(query: string, cap = Infinity): GlobeResultGroup[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];

  const buckets = new Map<GlobeResult['kind'], Scored[]>();
  const add = (result: GlobeResult, score: number) => {
    if (score < 0) return;
    const bucket = buckets.get(result.kind);
    if (bucket) bucket.push({ result, score });
    else buckets.set(result.kind, [{ result, score }]);
  };

  for (const artist of getAtlasArtists()) {
    const count = artist.eventIds.length;
    add(
      {
        kind: 'artist',
        id: `artist:${artist.slug}`,
        title: artist.name,
        subtitle: `${count} moment${count === 1 ? '' : 's'} on the globe`,
        artist,
      },
      scoreKeywords([fold(artist.name)], q),
    );
  }

  for (const entry of getPlaceIndex()) {
    add(
      {
        kind: 'place',
        id: `place:${placeKey(entry.place)}`,
        title: entry.title,
        subtitle: entry.subtitle,
        place: entry.place,
      },
      scoreKeywords(entry.keywords.map(fold), q),
    );
  }

  for (const event of MUSIC_HISTORY) {
    const isSong = event.id.startsWith('song-');
    // Titles outrank tags: a hit on "Thriller" in a title beats a hit on
    // "thriller" buried in some other event's tag list.
    const titleScore = scoreKeywords([fold(event.title)], q);
    const tagScore = scoreKeywords(
      [...event.tags, event.location.city].map(fold),
      q,
    );
    const score = Math.max(titleScore, tagScore >= 0 ? tagScore - 15 : -1);
    add(
      {
        kind: isSong ? 'song' : 'event',
        id: `event:${event.id}`,
        title: event.title,
        subtitle: `${event.year} · ${event.location.city}`,
        event,
      },
      score,
    );
  }

  const groups: GlobeResultGroup[] = [];
  for (const kind of GROUP_ORDER) {
    const scored = buckets.get(kind);
    if (!scored?.length) continue;
    scored.sort(
      (a, b) =>
        b.score - a.score || a.result.title.localeCompare(b.result.title),
    );
    groups.push({
      kind,
      label: GROUP_LABELS[kind],
      results: scored.slice(0, cap).map((s) => s.result),
      total: scored.length,
    });
  }
  return groups;
}
