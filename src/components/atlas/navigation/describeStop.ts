import {
  CITIES,
  CITY_COUNTRY_TO_ISO,
  HISTORICAL_MODULES,
  MUSIC_HISTORY,
  getTour,
} from '@/components/atlas/data';
import { getArtist, getEventsForArtist } from '@/components/atlas/data/artists';
import { getCountryColor } from '@/components/atlas/data/continentColors';
import type { HistoricalEvent } from '@/components/atlas/types';
import type { AtlasStop } from './atlasStop';

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

export function youtubeThumb(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function eventThumb(event: HistoricalEvent | undefined): string | undefined {
  return event?.videoId ? youtubeThumb(event.videoId) : undefined;
}

const COUNTRY_DISPLAY: Record<string, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  CA: 'Canada',
};

export function describeStop(stop: AtlasStop): StopPresentation {
  switch (stop.kind) {
    case 'event': {
      const event = MUSIC_HISTORY.find((e) => e.id === stop.eventId);
      return {
        kind: 'event',
        title: event?.title ?? 'Event',
        subtitle: event ? `${event.year} · ${event.location.city}` : '',
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
        const city = CITIES.find((c) => c.id === place.id);
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
      const mod = HISTORICAL_MODULES.find((m) => m.id === stop.pathwayId);
      const first = MUSIC_HISTORY.find((e) => e.id === mod?.eventIds[0]);
      return {
        kind: 'pathway',
        title: mod?.title ?? 'Pathway',
        subtitle: 'Pathway',
        thumb: eventThumb(first),
        emoji: mod?.emoji,
      };
    }

    case 'tour': {
      const tour = getTour(stop.tourId);
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
