import type { SelectedLocation } from '@/components/atlas/types';

/**
 * One addressable position in the globe — the unit of both the URL and the
 * history trail.
 *
 * Everything a user can click their way into is a stop, and every stop
 * round-trips through the query string. That is what makes a spot bookmarkable
 * (a teacher saves a link to a lesson's starting point) and what lets browser
 * Back / Forward walk the trail without us reimplementing history.
 */
export type AtlasStop =
  | { kind: 'event'; eventId: string }
  | { kind: 'artist'; artist: string }
  | { kind: 'place'; place: SelectedLocation }
  | { kind: 'search'; query: string }
  | { kind: 'pathway'; pathwayId: string }
  | { kind: 'tour'; tourId: string }
  | { kind: 'home' };

/**
 * Query-string keys a stop owns — replaced wholesale on every navigation.
 *
 * `era` is deliberately absent. It is a filter over whatever the stop shows
 * (the dashboard arms it, the timeline narrows to it), so it has to survive a
 * click from one place to the next rather than being wiped by it.
 */
export const STOP_PARAM_KEYS = [
  'event',
  'artist',
  'place',
  'q',
  'pathway',
  'tour',
] as const;

/* ── SelectedLocation ⇄ `place` param ─────────────────────────────────────── */

/**
 * `city:new-orleans` · `state:Indiana:United States` · `country:Japan:JPN`.
 *
 * Colon-delimited because no city id, subdivision, or country name in the
 * dataset contains one, and it stays readable in a bookmark.
 */
export function encodePlace(place: SelectedLocation): string {
  if (place.type === 'city') return `city:${place.id}`;
  if (place.type === 'state') {
    return `state:${place.name}:${place.country ?? 'United States'}`;
  }
  return `country:${place.name}:${place.iso}`;
}

export function decodePlace(raw: string): SelectedLocation | null {
  const [type, a, b] = raw.split(':');
  if (type === 'city' && a) return { type: 'city', id: a };
  if (type === 'state' && a) return { type: 'state', name: a, country: b };
  if (type === 'country' && a) {
    return { type: 'country', name: a, iso: b ?? '' };
  }
  return null;
}

/* ── AtlasStop ⇄ URLSearchParams ──────────────────────────────────────────── */

/**
 * The stop the current URL addresses.
 *
 * Checked most-specific first: a sequence (`pathway` / `tour`) that also
 * carries an `event` is still a sequence, because the progress bar owns the
 * navigation from there.
 */
export function stopFromSearchParams(params: URLSearchParams): AtlasStop {
  const pathwayId = params.get('pathway');
  if (pathwayId) return { kind: 'pathway', pathwayId };

  const tourId = params.get('tour');
  if (tourId) return { kind: 'tour', tourId };

  const eventId = params.get('event');
  if (eventId) return { kind: 'event', eventId };

  const artist = params.get('artist');
  if (artist) return { kind: 'artist', artist };

  const place = params.get('place');
  if (place) {
    const decoded = decodePlace(place);
    if (decoded) return { kind: 'place', place: decoded };
  }

  const query = params.get('q');
  if (query) return { kind: 'search', query };

  return { kind: 'home' };
}

/**
 * Rewrite `params` to address `stop`, clearing whichever stop keys it does not
 * use. Everything else on the URL — the era filter in particular — carries
 * over untouched.
 */
export function applyStopToSearchParams(
  params: URLSearchParams,
  stop: AtlasStop,
): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of STOP_PARAM_KEYS) next.delete(key);

  switch (stop.kind) {
    case 'event':
      next.set('event', stop.eventId);
      break;
    case 'artist':
      next.set('artist', stop.artist);
      break;
    case 'place':
      next.set('place', encodePlace(stop.place));
      break;
    case 'search':
      next.set('q', stop.query);
      break;
    case 'pathway':
      next.set('pathway', stop.pathwayId);
      break;
    case 'tour':
      next.set('tour', stop.tourId);
      break;
    case 'home':
      break;
  }
  return next;
}

/**
 * Identity of a stop, for comparing trail entries.
 *
 * Artist keys are lowercased so `?artist=wes montgomery` and
 * `?artist=Wes Montgomery` are one entry rather than two.
 */
export function stopKey(stop: AtlasStop): string {
  switch (stop.kind) {
    case 'event':
      return `event:${stop.eventId}`;
    case 'artist':
      return `artist:${stop.artist.toLowerCase()}`;
    case 'place':
      return `place:${encodePlace(stop.place)}`;
    case 'search':
      return `search:${stop.query.toLowerCase()}`;
    case 'pathway':
      return `pathway:${stop.pathwayId}`;
    case 'tour':
      return `tour:${stop.tourId}`;
    case 'home':
      return 'home';
  }
}
