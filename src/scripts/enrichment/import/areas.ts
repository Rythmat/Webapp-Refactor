import {
  isMbid,
  type MbArea,
  type MbAreaFull,
  type MbRelation,
  type MusicBrainzClient,
  wikidataIdsOf,
} from './musicbrainz';

/**
 * A MusicBrainz area, made useful: what kind of place it is, and which
 * country it is in.
 *
 * The area an artist lookup embeds ("Detroit", "Tottenham") has no type and
 * no country. City needs the type — a City or Municipality can be an
 * artist's City, a Subdivision or a Country cannot — and mapping the name to
 * one of our places needs the country, because "Portland" and "Birmingham"
 * are two places each. So the area is looked up (`inc=area-rels+url-rels`),
 * and the areas it is part of are walked up until a country shows itself: an
 * area with an ISO 3166-1 code is a country, and one with an ISO 3166-2 code
 * ('US-MI', 'GB-HRY') names its country in its first two letters, which ends
 * most walks after one step.
 *
 * The same walk serves the fetch (where each lookup is a request, once) and
 * scoring (where each is a cache read, and a miss just leaves the country
 * unknown).
 */

/** Far enough for Tottenham → Haringey → London → England → United Kingdom. */
export const AREA_WALK_DEPTH = 4;

/** The area types that can be an artist's City. */
export const CITY_AREA_TYPES: readonly string[] = ['City', 'Municipality'];

export interface ResolvedArea {
  id: string;
  name: string;
  /** From the area's own lookup; 'Country' for a country; null when unknown. */
  type: string | null;
  isCountry: boolean;
  /** ISO 3166-1 alpha-2 of the country it is in, when known. */
  countryCode: string | null;
  /** The country's own area name, when the walk reached it ('United States'). */
  countryName: string | null;
  /** The area's Wikidata item (its url-rels): coordinates live there. */
  wikidata: string | null;
  /** [lat, lng] from that item, when scoring has it in hand. */
  coordinates?: [number, number] | null;
  /** The area and the areas it is part of, as walked: evidence for a person. */
  chain: string[];
  /** Every lookup the walk needed was in hand (false on a dry-run miss). */
  complete: boolean;
}

const countryCodeOf = (area: MbArea): string | null =>
  area['iso-3166-1-codes']?.[0] ?? null;

/** 'US-MI' → 'US'. */
const subdivisionCountryOf = (area: MbArea): string | null => {
  const code = area['iso-3166-2-codes']?.[0];
  return code && /^[A-Z]{2}-/.test(code) ? code.slice(0, 2) : null;
};

/**
 * The area this one is part of. MusicBrainz states "X is part of Y" with Y
 * first, so from X's side the relation runs backward. A current parent is
 * preferred to one the area has left (a relation with an end date).
 */
export function parentAreaOf(area: MbAreaFull): MbArea | null {
  const parents = (area.relations ?? []).filter(
    (r: MbRelation) =>
      r.type === 'part of' && r.direction === 'backward' && !!r.area,
  );
  const current = parents.find((r) => !r.end) ?? parents[0];
  return current?.area ?? null;
}

export async function resolveArea(
  mb: Pick<MusicBrainzClient, 'lookupArea'>,
  area: MbArea,
): Promise<ResolvedArea> {
  const code = countryCodeOf(area);
  if (code) {
    return {
      id: area.id,
      name: area.name,
      type: 'Country',
      isCountry: true,
      countryCode: code,
      countryName: area.name,
      wikidata: null,
      chain: [area.name],
      complete: true,
    };
  }
  const out: ResolvedArea = {
    id: area.id,
    name: area.name,
    type: area.type ?? null,
    isCountry: false,
    countryCode: subdivisionCountryOf(area),
    countryName: null,
    wikidata: null,
    chain: [area.name],
    complete: true,
  };
  // Never a malformed URL: a bad id would stop the whole fetch, not one area.
  const own = isMbid(area.id) ? await mb.lookupArea(area.id) : null;
  if (!own) return { ...out, complete: false };
  out.type = own.type ?? out.type;
  out.wikidata = wikidataIdsOf(own)[0] ?? null;
  out.countryCode ??= subdivisionCountryOf(own);

  let current: MbAreaFull = own;
  for (let depth = 0; !out.countryCode && depth < AREA_WALK_DEPTH; depth++) {
    const parent = parentAreaOf(current);
    if (!parent) break;
    out.chain.push(parent.name);
    const parentCode = countryCodeOf(parent);
    if (parentCode) {
      out.countryCode = parentCode;
      out.countryName = parent.name;
      break;
    }
    out.countryCode = subdivisionCountryOf(parent);
    if (out.countryCode) break;
    const next = isMbid(parent.id) ? await mb.lookupArea(parent.id) : null;
    if (!next) {
      out.complete = false;
      break;
    }
    const nextCode = countryCodeOf(next);
    if (nextCode) {
      out.countryCode = nextCode;
      out.countryName = next.name;
      break;
    }
    out.countryCode = subdivisionCountryOf(next);
    current = next;
  }
  return out;
}

/** The areas an artist lookup names that are worth resolving: not countries. */
export const areasToResolve = (artist: {
  area?: MbArea | null;
  'begin-area'?: MbArea | null;
}): MbArea[] =>
  [artist.area, artist['begin-area']].filter(
    (area): area is MbArea => !!area?.id,
  );
