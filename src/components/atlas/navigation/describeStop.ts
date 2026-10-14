import { CITY_COUNTRY_TO_ISO } from '@/components/atlas/data';
import { getArtist, getEventsForArtist } from '@/components/atlas/data/artists';
import { getCountryColor } from '@/components/atlas/data/continentColors';
import { eventImage, posterUrl } from '@/components/atlas/data/eventImage';
import { guidesData } from '@/components/atlas/data/loaders';
import { getCityById, getEventById } from '@/components/atlas/data/lookups';
import type { HistoricalEvent } from '@/components/atlas/types';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';
import { contentGeneration } from '@/content/contentStore';
import { stopKey, type AtlasStop } from './atlasStop';

/**
 * How a stop presents itself in the trail strip and in search results: a
 * title, a one-line subtitle, and a thumbnail.
 *
 * Thumbnails come from YouTube for anything with a video — which after the
 * video backfill is nearly every event — so the trail reads as a strip of
 * pictures rather than a list of words. Places have no picture of their own
 * and get a swatch in their country's globe colour instead, so a place on the
 * trail looks like the place on the globe.
 */
export interface StopPresentation {
  title: string;
  subtitle: string;
  /** Image URL, when the stop has one. */
  thumb?: string;
  /** Fallback tile colour and glyph when it does not. */
  kind: AtlasStop['kind'];
  color?: string;
  emoji?: string;
}

/**
 * A video's smallest thumbnail (120×90): thumbnails show at 56–80 px, and the
 * 320×180 one they used to load is several times the bytes for no visible
 * gain.
 */
export function youtubeThumb(videoId: string): string {
  return posterUrl(videoId, 'thumb');
}

function eventThumb(event: HistoricalEvent | undefined): string | undefined {
  return eventImage(event, 'thumb');
}

const COUNTRY_DISPLAY: Record<string, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  CA: 'Canada',
};

// The trail and the search lists describe the same stops on every render;
// remember each one until the content changes.
const cache = new Map<string, StopPresentation>();
let cacheGeneration = contentGeneration;

/** stopKey, but keeping the case the title shows. */
function presentationKey(stop: AtlasStop): string {
  if (stop.kind === 'artist') return `artist:${stop.artist}`;
  if (stop.kind === 'search') return `search:${stop.query}`;
  return stopKey(stop);
}

export function describeStop(stop: AtlasStop): StopPresentation {
  if (cacheGeneration !== contentGeneration) {
    cache.clear();
    cacheGeneration = contentGeneration;
  }
  const key = presentationKey(stop);
  let presentation = cache.get(key);
  if (!presentation) {
    presentation = present(stop);
    // A tour or pathway named before the tours have loaded gets a generic
    // title; don't keep it. Readers that show one subscribe to guidesData.
    if (isGuideStop(stop) && !guidesData.peek()) {
      guidesData.load().catch(() => undefined);
      return presentation;
    }
    // A long session of searching could otherwise grow this without end.
    if (cache.size >= 2000) cache.clear();
    cache.set(key, presentation);
  }
  return presentation;
}

/** Stops whose titles come from the on-demand tours and pathways. */
export function isGuideStop(stop: AtlasStop): boolean {
  return stop.kind === 'tour' || stop.kind === 'pathway';
}

function present(stop: AtlasStop): StopPresentation {
  switch (stop.kind) {
    case 'event': {
      const event = getEventById(stop.eventId);
      return {
        kind: 'event',
        title: event?.title ?? 'Event',
        subtitle: event ? `${event.year} · ${eventPlaceName(event)}` : '',
        thumb: eventThumb(event),
      };
    }

    case 'artist': {
      const artist = getArtist(stop.artist);
      const events = getEventsForArtist(stop.artist);
      return {
        kind: 'artist',
        title: artist?.name ?? stop.artist,
        subtitle: `Artist · ${events.length} moment${events.length === 1 ? '' : 's'}`,
        // Their earliest event that has a video stands in for a portrait.
        thumb: eventThumb(events.find((e) => e.videoId)),
      };
    }

    case 'place': {
      const { place } = stop;
      if (place.type === 'city') {
        const city = getCityById(place.id);
        return {
          kind: 'place',
          title: city?.name ?? place.id,
          subtitle: city?.subdivision
            ? `${city.subdivision}, ${COUNTRY_DISPLAY[city.country] ?? city.country}`
            : (COUNTRY_DISPLAY[city?.country ?? ''] ?? city?.country ?? ''),
          color: getCountryColor(
            CITY_COUNTRY_TO_ISO[city?.country ?? ''] ?? '',
          ),
        };
      }
      if (place.type === 'state') {
        return {
          kind: 'place',
          title: place.name,
          subtitle: place.country ?? 'United States',
          color: getCountryColor(place.country === 'Canada' ? 'CAN' : 'USA'),
        };
      }
      return {
        kind: 'place',
        title: COUNTRY_DISPLAY[place.name] ?? place.name,
        subtitle: 'Country',
        color: getCountryColor(place.iso),
      };
    }

    case 'search':
      return {
        kind: 'search',
        title: `“${stop.query}”`,
        subtitle: 'Search',
      };

    case 'pathway': {
      const mod = guidesData.peek()?.getModuleById(stop.pathwayId);
      const first = getEventById(mod?.eventIds[0]);
      return {
        kind: 'pathway',
        title: mod?.title ?? 'Pathway',
        subtitle: 'Pathway',
        thumb: eventThumb(first),
        emoji: mod?.emoji,
      };
    }

    case 'tour': {
      const tour = guidesData.peek()?.getTour(stop.tourId);
      return {
        kind: 'tour',
        title: tour?.title ?? 'Guided tour',
        subtitle: 'Guided tour',
      };
    }

    case 'home':
      return { kind: 'home', title: 'The globe', subtitle: 'Start' };
  }
}
