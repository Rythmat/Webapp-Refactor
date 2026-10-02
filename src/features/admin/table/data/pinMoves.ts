import { artistSlug } from '@/content/graph/slugs';
import { distanceKm } from '@/content/linking/samePlace';

/**
 * The pin-move report (design §5.1 "Pin moves"): what setting an act's
 * City does to the globe. A song is pinned where its lead act's City is,
 * once that City is live — until then where the act's song pins say
 * (`artist_location`), often a birthplace. So accepting a City moves every
 * song the act leads to it: the next Artists publish derives the songs'
 * events again (contract §5b), and students see the pins move with the
 * Globe events publish after it. The owner sees each move before accepting
 * it.
 *
 * The lead act is read as the server reads it: the song's
 * `origin.artistGlobeId`, else its primary credit's, else its billing's
 * slug. Where a song is pinned now is its derived event's (`song-<id>`)
 * `location`. Pure.
 */

type Body = Readonly<Record<string, unknown>>;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const records = (value: unknown): Body[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Body =>
          !!item && typeof item === 'object' && !Array.isArray(item),
      )
    : [];

/** The act a song is pinned by. */
export function leadActOf(song: Body): string {
  const origin = (song.origin ?? {}) as Body;
  const primary = records(song.credits).find(
    (credit) => credit.primary && text(credit.artistGlobeId),
  );
  return (
    text(origin.artistGlobeId) ??
    text(primary?.artistGlobeId) ??
    artistSlug(String(song.artist ?? ''))
  );
}

/** A place as a pin needs it: a name and where it is. */
export interface PinPlace {
  name: string;
  at: readonly [number, number];
}

/** A place's body (`globe_city`) as a pin: null without coordinates. */
export function pinPlaceOf(body: Body | null | undefined): PinPlace | null {
  const at = body?.coordinates;
  if (
    !Array.isArray(at) ||
    at.length !== 2 ||
    !at.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
    return null;
  return {
    name: text(body?.name) ?? '',
    at: [at[0] as number, at[1] as number],
  };
}

export interface PinMove {
  /** The song's id. */
  song: string;
  title: string;
  /** Where it is pinned now: its city, or its coordinates. */
  from: string;
  km: number;
}

export interface PinReport {
  /** The songs whose pins move, the farthest first. */
  moves: PinMove[];
  /** Led by the act, and pinned there already (within a kilometre). */
  staying: number;
  /** Led by the act, with no pin yet: placed there when it gets one. */
  unpinned: number;
}

/**
 * Where an act's songs are pinned, against `place`: each song that moves,
 * and by how far.
 */
export function pinMoves(
  artist: string,
  place: PinPlace,
  songs: Iterable<{ slug: string; body: Body | null }>,
  events: ReadonlyMap<string, Body | null>,
): PinReport {
  const report: PinReport = { moves: [], staying: 0, unpinned: 0 };
  for (const { slug, body } of songs) {
    if (!body || leadActOf(body) !== artist) continue;
    const location = (events.get(`song-${slug}`)?.location ??
      null) as Body | null;
    const lat = location?.lat;
    const lng = location?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      report.unpinned += 1;
      continue;
    }
    const km = distanceKm([lat, lng], place.at);
    if (km < 1) {
      report.staying += 1;
      continue;
    }
    report.moves.push({
      song: slug,
      title: text(body.title) ?? slug,
      from: text(location?.city) ?? `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      km: Math.round(km),
    });
  }
  report.moves.sort((a, b) => b.km - a.km || a.title.localeCompare(b.title));
  return report;
}
