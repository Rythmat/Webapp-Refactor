import { stableJson, suggestionId } from '@/content/suggestions/keys';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionSource,
  SuggestionTier,
} from '@/content/suggestions/types';
import { getInstrument } from '@/curriculum/data/instruments';
import { CITY_AREA_TYPES, type ResolvedArea } from './areas';
import { genreIdOf, mapGenre } from './genreMap';
import { MEMBERSHIP_ATTRIBUTES, mapInstrument } from './instrumentMap';
import {
  cityCoordinates,
  distanceKm,
  type PlaceBook,
  type PlaceFact,
  type PlaceMatch,
  SAME_PLACE_KM,
} from './placeMap';
import {
  type ArtistEvidence,
  type CandidateFacts,
  type IdentityResult,
  NOT_SURE_CAP,
  parentGenres,
  SURE,
  sameCityName,
} from './scoreIdentity';
import type { WdEntity } from './wikidata';
import {
  coordinatesOf,
  currentCountryOf,
  datesOf,
  earliestDate,
  isHuman,
  itemValues,
  labelOf,
  latestDate,
  PLACE_KIND_WORDS,
  type PlaceKind,
  placeKindOf,
  statementsOf,
} from './wikidataClaims';

/**
 * The suggestions for one of our artists, once we know which MusicBrainz
 * artist it is (design §5.2, the field map):
 *
 * | Field            | Path                     | From                                                   |
 * |------------------|--------------------------|--------------------------------------------------------|
 * | Identity         | externalIds.mbid, .wikidata | the pick; its url-rels or P434                      |
 * | Band             | group                    | MusicBrainz type Group/Orchestra/Choir                 |
 * | Born             | born.date                | person: life-span begin, P569; group: formed (earliest P571), year only |
 * |                  | born.placeId             | person: begin-area, P19 (+ the song pin when it agrees) |
 * | City             | basedInPlaceId           | person: area of type City, P740 (P551 only to agree); group: begin-area, P740 |
 * | Years Active     | activeFrom, activeTo     | group: life-span; earliest P2031 / latest P2032; never a person's life-span |
 * | Genres           | genreIds[]               | P136 through the genre map, top 3 (MusicBrainz genres a signal only) |
 * | Instruments      | instrumentIds[]          | P1303; a person's "member of band" attributes          |
 *
 * Every field suggestion rests on the identity (`dependsOn`) and is no surer
 * than it. Two sources giving one value make one suggestion, +0.1; two giving
 * different values make one each, and neither is sure. City is sure only
 * where the song pin agrees (C23): it moves students' pins once published.
 * Genre tags, keys, progressions, bio and display text are never imported.
 *
 * Some values are offered but never sure, whatever the identity:
 *  - an end to an act's work (P2032) while MusicBrainz says it has not ended
 *    — a hiatus a reunion undid, a retirement announced (Toto 2019, OutKast
 *    2007): `activeTo` means "absent while active";
 *  - a place to create that Wikidata doesn't say the kind of (its classes
 *    not named, or naming nothing we read), unless MusicBrainz's typed area
 *    or the song pins name it too;
 *  - a birth date Wikidata states two ways (Machito: 1908 and 1912, both
 *    preferred): both are shown.
 * And P551, residence, never offers a City on its own — Bel Air, Maui and
 * Encino are where stars live, not their hometown or scene. It only agrees
 * with another source's City or with the song pin.
 */

/** What the fields read from Wikidata, all of it already in hand. */
export interface WikidataView {
  /** An artist's item, with claims. */
  item(id: string): WdEntity | undefined;
  /** A place's item, with claims. */
  place(id: string): WdEntity | undefined;
  /** Any item's English label. */
  label(id: string): string | null;
}

export interface FieldInput {
  artist: ArtistEvidence;
  identity: IdentityResult;
  /** The facts of the pick; absent for none, weak and ambiguous. */
  pick: CandidateFacts | null;
  /** Every candidate's facts, for the ambiguous row. */
  candidates: readonly CandidateFacts[];
  wd: WikidataView;
  places: PlaceBook;
  batch: string;
}

/** What could not be mapped, for the run's report. */
export interface FieldReport {
  genres: string[];
  instruments: string[];
  places: string[];
  /** Residences (P551) no other source named: not offered as a City. */
  residences: string[];
}

export const MB_ARTIST = 'https://musicbrainz.org/artist/';
export const MB_AREA = 'https://musicbrainz.org/area/';
export const WD_ITEM = 'https://www.wikidata.org/wiki/';

/**
 * A source. Its id is in its URL; it is spelled out only where the Table
 * needs it without parsing one — the identity rows, whose sources are the
 * artists to choose between — to keep ten thousand rows small.
 */
const mbSource = (
  mbid: string,
  label: string,
  withId = false,
): SuggestionSource => ({
  provider: 'musicbrainz',
  url: `${MB_ARTIST}${mbid}`,
  label,
  ...(withId ? { externalId: mbid } : {}),
});
const wdSource = (qid: string, label: string): SuggestionSource => ({
  provider: 'wikidata',
  url: `${WD_ITEM}${qid}`,
  label,
});

/** One source's word on one field. */
interface Offer {
  path: string;
  op: 'set' | 'add';
  value: unknown;
  display: string;
  source: SuggestionSource;
  evidence: string;
  requires?: RequiredRecord[];
  /** Where it lands, for comparing with the song pin. */
  place?: { name: string; coordinates: [number, number] | null };
  /** Confidence a signal adds without being a source (MusicBrainz genres). */
  signal?: number;
  /** Why this value can never be sure, however many sources agree. */
  disputed?: string;
  /**
   * The place's kind is unknown: never sure unless another source that
   * knows the kind (a typed MusicBrainz area, the song pins) gives the same
   * place.
   */
  unclassified?: string;
  /** Only agrees with others (P551): no suggestion of its own. */
  corroborateOnly?: boolean;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** '1939-04-02' → '2 Apr 1939'; '1939-04' → 'Apr 1939'; '1939' → '1939'. */
export function displayDate(date: string): string {
  const [year, month, day] = date.split('-');
  if (!month) return year;
  const name = MONTHS[Number(month) - 1] ?? month;
  return day ? `${Number(day)} ${name} ${year}` : `${name} ${year}`;
}

const yearOf = (date: string | null | undefined): number | null => {
  const match = /^(\d{4})/.exec(date ?? '');
  return match ? Number(match[1]) : null;
};

/** A MusicBrainz life-span date, as our bodies write one. */
const mbDate = (date: string | null | undefined): string | null =>
  date && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(date) ? date : null;

type Kind = 'person' | 'group' | null;

function kindOf(pick: CandidateFacts, item: WdEntity | undefined): Kind {
  if (pick.type === 'Person' || pick.type === 'Character') return 'person';
  if (pick.type && ['Group', 'Orchestra', 'Choir'].includes(pick.type))
    return 'group';
  if (item && isHuman(item)) return 'person';
  return null;
}

/**
 * The area types a birthplace can be: a town or a part of one (Tottenham is a
 * District). A Subdivision or a County says less than a birthplace, and an
 * area whose type is unknown (its lookup not in hand) might be either.
 */
const BIRTH_AREA_TYPES: readonly string[] = [...CITY_AREA_TYPES, 'District'];

/** Wikidata classes of a group of musicians, for agreeing with MusicBrainz. */
const GROUP_CLASSES = new Set([
  'Q215380', // musical group
  'Q5741069', // rock band
  'Q2088357', // musical ensemble
  'Q9212979', // musical duo
  'Q281643', // trio
  'Q641066', // girl group
  'Q216337', // boy band
]);

function placeOffer(
  match: PlaceMatch,
  base: Omit<Offer, 'value' | 'display' | 'requires' | 'place'>,
  display: (name: string) => string,
): Offer | string {
  if (match.kind === 'none') return match.reason;
  const coordinates =
    match.kind === 'existing'
      ? cityCoordinates(match.placeId)
      : match.place.body.coordinates;
  return {
    ...base,
    value: match.placeId,
    display: display(match.name),
    place: { name: match.name, coordinates },
    ...(match.kind === 'create'
      ? {
          requires: [
            { kind: 'globe_city', slug: match.placeId, body: match.place.body },
          ],
        }
      : {}),
  };
}

/** A MusicBrainz area as a place fact: coordinates from its Wikidata item. */
function areaFact(area: ResolvedArea, wd: WikidataView): PlaceFact {
  const item = area.wikidata ? wd.place(area.wikidata) : undefined;
  return {
    name: area.name,
    country: area.countryName ?? area.countryCode,
    coordinates: item ? coordinatesOf(item) : null,
    wikidata: area.wikidata,
    mbArea: area.id,
  };
}

/** A Wikidata place item as a place fact, and whether it can be a City. */
function itemFact(
  qid: string,
  wd: WikidataView,
): { fact: PlaceFact; kind: PlaceKind } | null {
  const item = wd.place(qid);
  const name = labelOf(item);
  if (!item || !name) return null;
  const country = currentCountryOf(item);
  return {
    fact: {
      name,
      country: country ? wd.label(country) : null,
      coordinates: coordinatesOf(item),
      wikidata: qid,
    },
    kind: placeKindOf(item, wd.label),
  };
}

/**
 * A Wikidata place as an offer for Born or City: a town, or a place of
 * unknown kind (offered, never sure on its own); anything else is reported
 * and not offered.
 */
function wikidataPlaceOffer(
  placeQid: string,
  wd: WikidataView,
  resolve: (fact: PlaceFact) => PlaceMatch,
  report: FieldReport,
  { property, what }: { property: string; what: string },
  base: Omit<Offer, 'value' | 'display' | 'requires' | 'place' | 'source'>,
  display: (name: string) => string,
): Offer | string | null {
  const found = itemFact(placeQid, wd);
  if (!found) return null;
  if (found.kind !== 'settlement' && found.kind !== 'unclassified') {
    report.places.push(
      `${found.fact.name}: ${PLACE_KIND_WORDS[found.kind]}, not a ${what}`,
    );
    return null;
  }
  const match = resolve(found.fact);
  return placeOffer(
    match,
    {
      ...base,
      source: wdSource(placeQid, property),
      // One of our cities is a city, whatever Wikidata's classes say; a
      // place to create is only as good as what we know of it.
      ...(found.kind === 'unclassified' && match.kind === 'create'
        ? {
            unclassified: `Wikidata doesn't say what kind of place ${found.fact.name} is`,
          }
        : {}),
    },
    display,
  );
}

/** The song pin names the same place as an offer. */
function pinAgrees(
  pin: NonNullable<ArtistEvidence['pin']>,
  offer: Offer,
): boolean {
  if (pin.placeId && pin.placeId === offer.value) return true;
  const place = offer.place;
  if (!place?.coordinates) return false;
  return (
    distanceKm(pin.coordinates, place.coordinates) <= SAME_PLACE_KM &&
    sameCityName(pin.city, place.name, { near: true })
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function artistSuggestions(input: FieldInput): {
  suggestions: Suggestion[];
  report: FieldReport;
} {
  const { artist, identity, pick, wd, places, batch } = input;
  const report: FieldReport = {
    genres: [],
    instruments: [],
    places: [],
    residences: [],
  };
  const target = { kind: 'artist', slug: artist.slug };
  const make = (
    s: Omit<Suggestion, 'id' | 'target' | 'batch'>,
  ): Suggestion => ({
    id: suggestionId({ target, path: s.path, op: s.op, value: s.value }),
    target,
    ...s,
    batch,
  });

  if (identity.tier === 'ambiguous') {
    const top = identity.ranked.slice(0, 5);
    const facts = new Map(input.candidates.map((c) => [c.mbid, c]));
    return {
      suggestions: [
        make({
          path: 'externalIds.mbid',
          op: 'set',
          value: identity.pick!.mbid,
          display: `Pick the MusicBrainz artist: ${top
            .map(
              (c) =>
                `${c.name}${c.disambiguation ? ` (${c.disambiguation})` : ''}`,
            )
            .join(' | ')}`,
          sources: top.map((c) =>
            mbSource(
              c.mbid,
              `${c.name}${c.disambiguation ? ` (${c.disambiguation})` : ''}${facts.get(c.mbid)?.type ? `, ${facts.get(c.mbid)!.type}` : ''}`,
              true,
            ),
          ),
          evidence: [
            ...identity.notes,
            ...top.map(
              (c) =>
                `${c.name}${c.disambiguation ? ` (${c.disambiguation})` : ''}: ${c.score} — ${c.reasons.join('; ') || 'no evidence'}`,
            ),
          ],
          confidence: identity.confidence,
          tier: 'ambiguous',
        }),
      ],
      report,
    };
  }
  if (!pick || (identity.tier !== 'sure' && identity.tier !== 'likely'))
    return { suggestions: [], report };

  const identitySure = identity.tier === 'sure';
  const mbidSuggestion = make({
    path: 'externalIds.mbid',
    op: 'set',
    value: pick.mbid,
    display: `MusicBrainz: ${pick.name}${pick.disambiguation ? ` (${pick.disambiguation})` : ''}`,
    sources: [
      mbSource(pick.mbid, pick.type ? `artist, ${pick.type}` : 'artist', true),
    ],
    evidence: [...identity.pick!.reasons, ...identity.notes],
    confidence: identity.confidence,
    tier: identity.tier,
  });
  const dependsOn = mbidSuggestion.id;
  const out: Suggestion[] = [mbidSuggestion];

  // An item Wikidata has deleted since MusicBrainz linked it is no item.
  const qids = pick.wikidata.filter((q) => wd.item(q)?.missing === undefined);
  const qid = qids.find((q) => wd.item(q)) ?? qids[0];
  const item = qid ? wd.item(qid) : undefined;
  const kind = kindOf(pick, item);
  const offers: Offer[] = [];
  const add = (offer: Offer | string | null) => {
    if (typeof offer === 'string') report.places.push(offer);
    else if (offer) offers.push(offer);
  };

  // Wikidata identity.
  for (const q of qids) {
    const stated =
      item && q === qid
        ? statementsOf(item, 'P434').some(
            (s) => s.mainsnak.datavalue?.value === pick.mbid,
          )
        : false;
    const label = labelOf(wd.item(q));
    const display = `Wikidata: ${q}${label ? ` (${label})` : ''}`;
    if (pick.wikidataVia === 'P434') {
      offers.push({
        path: 'externalIds.wikidata',
        op: 'set',
        value: q,
        display,
        source: wdSource(q, 'P434'),
        evidence: `Wikidata ${q} names this MusicBrainz artist (P434)`,
      });
      continue;
    }
    offers.push({
      path: 'externalIds.wikidata',
      op: 'set',
      value: q,
      display,
      source: mbSource(pick.mbid, 'url-rels'),
      evidence: `MusicBrainz links Wikidata ${q}`,
    });
    if (stated)
      offers.push({
        path: 'externalIds.wikidata',
        op: 'set',
        value: q,
        display,
        source: wdSource(q, 'P434'),
        evidence: `Wikidata ${q} names the same MusicBrainz artist (P434)`,
      });
  }

  // Band.
  if (kind === 'group' && pick.type) {
    offers.push({
      path: 'group',
      op: 'set',
      value: true,
      display: `A group (${pick.type})`,
      source: mbSource(pick.mbid, `type ${pick.type}`),
      evidence: `MusicBrainz type ${pick.type}`,
    });
    const classes = item ? itemValues(item, 'P31') : [];
    const cls = classes.find((c) => GROUP_CLASSES.has(c));
    if (qid && cls)
      offers.push({
        path: 'group',
        op: 'set',
        value: true,
        display: `A group (${pick.type})`,
        source: wdSource(qid, 'P31'),
        evidence: `Wikidata: instance of ${wd.label(cls) ?? cls}`,
      });
  }

  // Born: the date.
  const begin = mbDate(pick.lifeSpan?.begin);
  if (kind === 'person') {
    if (begin)
      offers.push({
        path: 'born.date',
        op: 'set',
        value: begin,
        display: `Born ${displayDate(begin)}`,
        source: mbSource(pick.mbid, 'life-span begin'),
        evidence: `MusicBrainz life-span begins ${begin}`,
      });
    // Two birth dates Wikidata both stands by are two values, side by side.
    for (const born of item && qid ? datesOf(item, 'P569') : [])
      offers.push({
        path: 'born.date',
        op: 'set',
        value: born.date,
        display: `Born ${displayDate(born.date)}`,
        source: wdSource(qid!, 'P569'),
        evidence: `Wikidata date of birth ${born.date}`,
      });
  } else if (kind === 'group') {
    const year = yearOf(begin);
    if (year)
      offers.push({
        path: 'born.date',
        op: 'set',
        value: String(year),
        display: `Formed ${year}`,
        source: mbSource(pick.mbid, 'life-span begin (formed)'),
        evidence: `MusicBrainz: formed ${begin}`,
      });
    // The first formation, not a reunion (ABBA: 1970, not 2018).
    const formed = item ? earliestDate(item, 'P571') : null;
    if (formed && qid)
      offers.push({
        path: 'born.date',
        op: 'set',
        value: formed.date.slice(0, 4),
        display: `Formed ${formed.date.slice(0, 4)}`,
        source: wdSource(qid, 'P571'),
        evidence: `Wikidata inception ${formed.date}`,
      });
  }

  // Born: the place (a person's; a group's birthplace is its City).
  if (kind === 'person') {
    const area = pick.beginArea;
    if (area?.type && BIRTH_AREA_TYPES.includes(area.type))
      add(
        placeOffer(
          places.place(areaFact(area, wd)),
          {
            path: 'born.placeId',
            op: 'set',
            source: {
              provider: 'musicbrainz',
              url: `${MB_AREA}${area.id}`,
              label: 'begin-area',
            },
            evidence: `MusicBrainz begin-area ${area.chain.join(' < ')}`,
          },
          (name) => `Born in ${name}`,
        ),
      );
    for (const placeQid of item ? itemValues(item, 'P19').slice(0, 1) : []) {
      add(
        wikidataPlaceOffer(
          placeQid,
          wd,
          places.place,
          report,
          { property: 'P19', what: 'birthplace' },
          {
            path: 'born.placeId',
            op: 'set',
            evidence: `Wikidata place of birth ${labelOf(wd.place(placeQid)) ?? placeQid}`,
          },
          (name) => `Born in ${name}`,
        ),
      );
    }
  }

  // City.
  const cityAreas =
    kind === 'group' ? [pick.beginArea, pick.area] : [pick.area];
  for (const area of cityAreas) {
    if (
      !area ||
      area.isCountry ||
      !area.type ||
      !CITY_AREA_TYPES.includes(area.type)
    )
      continue;
    const which = area === pick.beginArea ? 'begin-area' : 'area';
    add(
      placeOffer(
        places.place(areaFact(area, wd)),
        {
          path: 'basedInPlaceId',
          op: 'set',
          source: {
            provider: 'musicbrainz',
            url: `${MB_AREA}${area.id}`,
            label: which,
          },
          evidence: `MusicBrainz ${which} ${area.chain.join(' < ')} (${area.type})`,
        },
        (name) => (kind === 'group' ? `Formed in ${name}` : `City: ${name}`),
      ),
    );
  }
  // P551 (residence) is where a person lives now or lived once — a mansion
  // in Bel Air, a ranch on Maui — so it only agrees with another source.
  const cityProps = kind === 'group' ? ['P740'] : ['P740', 'P551'];
  for (const property of cityProps) {
    for (const placeQid of item ? itemValues(item, property) : []) {
      const offer = wikidataPlaceOffer(
        placeQid,
        wd,
        // A residence creates no place: it can only agree with a place
        // another source named, or one of ours.
        property === 'P551' ? places.find : places.place,
        // A residence that is a house or a county is not worth a line.
        property === 'P551'
          ? { genres: [], instruments: [], places: [], residences: [] }
          : report,
        { property, what: 'city' },
        {
          path: 'basedInPlaceId',
          op: 'set',
          evidence: `Wikidata ${property === 'P740' ? 'location of formation' : 'residence'} ${labelOf(wd.place(placeQid)) ?? placeQid}`,
          ...(property === 'P551' ? { corroborateOnly: true } : {}),
        },
        (name) => (kind === 'group' ? `Formed in ${name}` : `City: ${name}`),
      );
      if (property === 'P551' && typeof offer === 'string') {
        // A place no other source asked for: a residence and nothing more.
        report.residences.push(labelOf(wd.place(placeQid)) ?? placeQid);
        continue;
      }
      add(offer);
    }
  }

  // Years Active: a group's life-span, or P2031/P2032 — never a person's
  // life-span, which is birth to death.
  const notEnded = pick.lifeSpan?.ended === false;
  if (kind === 'group') {
    const from = yearOf(begin);
    const to = pick.lifeSpan?.ended ? yearOf(pick.lifeSpan.end) : null;
    if (from)
      offers.push({
        path: 'activeFrom',
        op: 'set',
        value: from,
        display: `Active from ${from}`,
        source: mbSource(pick.mbid, 'life-span begin'),
        evidence: `MusicBrainz: group active from ${begin}`,
      });
    if (to)
      offers.push({
        path: 'activeTo',
        op: 'set',
        value: to,
        display: `Active until ${to}`,
        source: mbSource(pick.mbid, 'life-span end'),
        evidence: `MusicBrainz: group ended ${pick.lifeSpan?.end}`,
      });
  }
  // The first start and the last stop: a reunion is not a start, a hiatus
  // it ended is not the end.
  for (const [property, path, word] of [
    ['P2031', 'activeFrom', 'from'],
    ['P2032', 'activeTo', 'until'],
  ] as const) {
    const date = item
      ? property === 'P2031'
        ? earliestDate(item, property)
        : latestDate(item, property)
      : null;
    if (!date || !qid) continue;
    const year = Number(date.date.slice(0, 4));
    offers.push({
      path,
      op: 'set',
      value: year,
      display: `Active ${word} ${year}`,
      source: wdSource(qid, property),
      evidence: `Wikidata work period ${word === 'from' ? 'start' : 'end'} ${date.date}`,
      // MusicBrainz says the act has not ended (for a person: is alive).
      ...(property === 'P2032' && notEnded
        ? {
            disputed:
              kind === 'group'
                ? 'MusicBrainz says the group has not ended'
                : 'MusicBrainz gives no end: a living artist may still be working',
          }
        : {}),
    });
  }

  // Genres: P136, top three that map. MusicBrainz genres only raise
  // confidence (they are CC BY-NC-SA and never become ours).
  const mbGenres = parentGenres(pick.genres);
  const genreIds: string[] = [];
  for (const genreQid of item ? itemValues(item, 'P136') : []) {
    if (genreIds.length >= 3) break;
    const name = wd.label(genreQid);
    const resolved = name ? mapGenre(name) : null;
    if (!resolved) {
      report.genres.push(name ?? genreQid);
      continue;
    }
    const id = genreIdOf(resolved);
    if (genreIds.includes(id)) continue;
    genreIds.push(id);
    offers.push({
      path: 'genreIds[]',
      op: 'add',
      value: id,
      display: `Genre: ${id}`,
      source: wdSource(qid!, 'P136'),
      evidence:
        `Wikidata genre "${name}"` +
        (mbGenres.has(resolved.genre)
          ? '; MusicBrainz genres agree (a signal only)'
          : ''),
      ...(mbGenres.has(resolved.genre) ? { signal: 0.05 } : {}),
    });
  }

  // Instruments: P1303, and the instruments a person played in their bands.
  for (const instrumentQid of item ? itemValues(item, 'P1303') : []) {
    const name = wd.label(instrumentQid);
    const id = name ? mapInstrument(name) : null;
    if (!id) {
      report.instruments.push(name ?? instrumentQid);
      continue;
    }
    offers.push({
      path: 'instrumentIds[]',
      op: 'add',
      value: id,
      display: `Plays ${getInstrument(id)?.name ?? id}`,
      source: wdSource(qid!, 'P1303'),
      evidence: `Wikidata instrument "${name}"`,
    });
  }
  if (kind === 'person') {
    const played = new Map<string, string[]>();
    for (const band of pick.memberOf) {
      for (const attribute of band.attributes) {
        if (MEMBERSHIP_ATTRIBUTES.has(attribute)) continue;
        const id = mapInstrument(attribute);
        if (!id) {
          report.instruments.push(attribute);
          continue;
        }
        played.set(id, [...(played.get(id) ?? []), band.name]);
      }
    }
    for (const [id, bands] of played) {
      offers.push({
        path: 'instrumentIds[]',
        op: 'add',
        value: id,
        display: `Plays ${getInstrument(id)?.name ?? id}`,
        source: mbSource(pick.mbid, 'member of band'),
        evidence: `MusicBrainz: ${getInstrument(id)?.name ?? id} in ${[...new Set(bands)].slice(0, 3).join(', ')}`,
      });
    }
  }

  out.push(
    ...combine(offers, {
      artist,
      identitySure,
      confidence: identity.confidence,
      dependsOn,
      make,
      report,
    }),
  );
  return { suggestions: out, report };
}

/** At most this many instruments per artist, agreed ones first. */
const MAX_INSTRUMENTS = 5;

/**
 * Offers → suggestions: one per path and value, with every source that gave
 * it. Dates that agree as far as the coarser one goes are one suggestion at
 * the finer precision. A value only corroborating sources give (P551) is
 * dropped unless the song pin gives it too.
 */
function combine(
  offers: Offer[],
  ctx: {
    artist: ArtistEvidence;
    identitySure: boolean;
    confidence: number;
    dependsOn: string;
    make: (s: Omit<Suggestion, 'id' | 'target' | 'batch'>) => Suggestion;
    report: FieldReport;
  },
): Suggestion[] {
  // A year and a full date that agree on the year are one date.
  const dates = offers.filter((o) => o.path === 'born.date');
  const exactly = new Map<Offer, unknown>();
  for (const offer of dates) {
    exactly.set(offer, offer.value);
    const finer = dates
      .filter(
        (o) =>
          String(o.value).length > String(offer.value).length &&
          String(o.value).startsWith(`${String(offer.value)}`),
      )
      .sort((a, b) => String(b.value).length - String(a.value).length)[0];
    if (finer) {
      offer.value = finer.value;
      offer.display = finer.display;
    }
  }

  const byValue = new Map<string, Offer[]>();
  for (const offer of offers) {
    const k = `${offer.path} ${stableJson(offer.value)}`;
    byValue.set(k, [...(byValue.get(k) ?? []), offer]);
  }

  // The song pin: agreeing with City makes it sure; agreeing with a
  // birthplace makes it one more source.
  const pin = ctx.artist.pin;
  const groups: { list: Offer[]; pinAgreed: boolean }[] = [];
  for (const list of byValue.values()) {
    const [first] = list;
    const pinAgreed =
      !!pin &&
      (first.path === 'basedInPlaceId' || first.path === 'born.placeId') &&
      pinAgrees(pin, first);
    if (list.every((o) => o.corroborateOnly) && !pinAgreed) {
      ctx.report.residences.push(first.place?.name ?? String(first.value));
      continue;
    }
    groups.push({ list, pinAgreed });
  }
  const valuesByPath = new Map<string, number>();
  for (const { list } of groups) {
    const path = list[0].path;
    valuesByPath.set(path, (valuesByPath.get(path) ?? 0) + 1);
  }

  const out: Suggestion[] = [];
  let instruments = 0;
  const sortedGroups = [...groups].sort((a, b) => {
    // Agreed instruments first, so the cap keeps them.
    if (
      a.list[0].path === b.list[0].path &&
      a.list[0].path === 'instrumentIds[]'
    )
      return (
        new Set(b.list.map((o) => o.source.provider)).size -
        new Set(a.list.map((o) => o.source.provider)).size
      );
    return 0;
  });
  for (const { list, pinAgreed } of sortedGroups) {
    const [first] = list;
    const { path, op, value } = first;
    if (path === 'instrumentIds[]' && ++instruments > MAX_INSTRUMENTS) continue;
    const sources: SuggestionSource[] = [];
    const seen = new Set<string>();
    for (const offer of list) {
      const k = stableJson(offer.source);
      if (seen.has(k)) continue;
      seen.add(k);
      sources.push(offer.source);
    }
    const evidence = [...new Set(list.map((o) => o.evidence))];
    const requires = list.find((o) => o.requires)?.requires;

    if (pinAgreed && pin) {
      sources.push({
        provider: 'app',
        label: `artist_location "${pin.key}" city`,
      });
      evidence.push(`the song pins say ${pin.city} too`);
    } else if (pin && path === 'basedInPlaceId') {
      evidence.push(`the song pins say ${pin.city}`);
    }

    const providers = new Set(sources.map((s) => s.provider));
    const exact =
      path !== 'born.date' ||
      new Set(list.map((o) => stableJson(exactly.get(o)))).size === 1;
    const agreed = providers.size >= 2 && exact;
    const signal = Math.max(0, ...list.map((o) => o.signal ?? 0));
    const confidence = round2(
      Math.min(1, ctx.confidence + (agreed ? 0.1 : 0) + signal),
    );
    const competing = op === 'set' && (valuesByPath.get(path) ?? 0) > 1;
    if (competing) evidence.push('the sources give another value too');
    // Held back from sure: a value some source disputes; a place whose kind
    // no source that gave it knows (the song pins name towns, so their
    // agreeing says what kind it is).
    const disputed = [
      ...new Set(list.flatMap((o) => (o.disputed ? [o.disputed] : []))),
    ];
    evidence.push(...disputed);
    const unclassified = !pinAgreed && list.every((o) => o.unclassified);
    if (unclassified)
      evidence.push(
        ...new Set(
          list.flatMap((o) => (o.unclassified ? [o.unclassified] : [])),
        ),
      );

    let sure =
      ctx.identitySure &&
      !competing &&
      !disputed.length &&
      !unclassified &&
      confidence >= SURE;
    if (path === 'basedInPlaceId' && !pinAgreed) sure = false;
    const tier: SuggestionTier = sure ? 'sure' : 'likely';
    out.push(
      ctx.make({
        path,
        op,
        value,
        display: first.display,
        sources,
        evidence,
        confidence: sure ? confidence : Math.min(confidence, NOT_SURE_CAP),
        tier,
        ...(requires ? { requires } : {}),
        dependsOn: ctx.dependsOn,
      }),
    );
  }
  return out;
}
