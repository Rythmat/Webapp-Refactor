import type { WdEntity, WdStatement } from './wikidata';

/**
 * Reading what a Wikidata item says: the statements that count, and their
 * values in the shapes our bodies use.
 *
 * Wikidata keeps history beside the present. Oslo's country (P17) is Norway,
 * and also, with an end date, the Union between Sweden and Norway; a
 * birthplace can be stated twice, one of them deprecated. So a single value
 * comes from the preferred statements when there are any, else from the
 * current ones (no end time, P582), else from the rest; deprecated ones never.
 */

/** "end time": a statement that has one is about the past. */
const END_TIME = 'P582';

const isValue = (s: WdStatement) =>
  s.mainsnak.snaktype === 'value' && s.mainsnak.datavalue !== undefined;

/** Every statement that counts, preferred first, in the item's own order. */
export function statementsOf(
  entity: WdEntity,
  property: string,
): WdStatement[] {
  const all = (entity.claims?.[property] ?? []).filter(
    (s) => s.rank !== 'deprecated' && isValue(s),
  );
  return [
    ...all.filter((s) => s.rank === 'preferred'),
    ...all.filter((s) => s.rank !== 'preferred'),
  ];
}

/**
 * The statements that say what is true now: the preferred ones; failing
 * those, the ones with no end time; failing those, all of them.
 */
export function currentStatements(
  entity: WdEntity,
  property: string,
): WdStatement[] {
  const all = statementsOf(entity, property);
  const preferred = all.filter((s) => s.rank === 'preferred');
  if (preferred.length) return preferred;
  const current = all.filter((s) => !s.qualifiers?.[END_TIME]?.length);
  return current.length ? current : all;
}

const itemIdOf = (s: WdStatement): string | null => {
  const value = s.mainsnak.datavalue?.value as { id?: unknown } | undefined;
  return typeof value?.id === 'string' ? value.id : null;
};

/** The items a property points at, preferred first, each once. */
export const itemValues = (entity: WdEntity, property: string): string[] => [
  ...new Set(
    statementsOf(entity, property)
      .map(itemIdOf)
      .filter((id): id is string => !!id),
  ),
];

/** The items a property points at now (see `currentStatements`). */
export const currentItemValues = (
  entity: WdEntity,
  property: string,
): string[] => [
  ...new Set(
    currentStatements(entity, property)
      .map(itemIdOf)
      .filter((id): id is string => !!id),
  ),
];

/** The one country a place is in now: P17 from its preferred or current statement. */
export const currentCountryOf = (entity: WdEntity): string | null =>
  currentItemValues(entity, 'P17')[0] ?? null;

/** A date as our bodies write one: 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'. */
export interface WdDate {
  date: string;
  /** 9 year, 10 month, 11 day. */
  precision: 9 | 10 | 11;
}

/**
 * A Wikidata time as a date, precision kept: '+1939-04-02T00:00:00Z' at
 * precision 11 is '1939-04-02'; at 9 it is '1939'. Coarser than a year, or
 * before year 1, is no date for a birth or a formation.
 */
export function wdDate(value: unknown): WdDate | null {
  const time = value as { time?: unknown; precision?: unknown } | undefined;
  if (typeof time?.time !== 'string' || typeof time.precision !== 'number')
    return null;
  const match = /^\+(\d{1,4})-(\d{2})-(\d{2})T/.exec(time.time);
  if (!match || time.precision < 9) return null;
  const year = match[1].padStart(4, '0');
  if (year === '0000') return null;
  if (time.precision === 9) return { date: year, precision: 9 };
  if (match[2] === '00') return { date: year, precision: 9 };
  if (time.precision === 10 || match[3] === '00')
    return { date: `${year}-${match[2]}`, precision: 10 };
  return { date: `${year}-${match[2]}-${match[3]}`, precision: 11 };
}

/**
 * The dates a property states: the preferred statements' when there are any,
 * else every one that counts. Not "the current ones": an end time on a date
 * statement dates the statement, not the fact — ABBA's inception 1970 ends
 * in 1982, the break-up, and is still when ABBA formed; the reunion's 2018
 * has no end, and is not. A date and a coarser one that agrees with it
 * ('1912-02-16', '1912') are one, at the finer precision. In statement order.
 */
export function datesOf(entity: WdEntity, property: string): WdDate[] {
  const all = statementsOf(entity, property);
  const preferred = all.filter((s) => s.rank === 'preferred');
  const dates = (preferred.length ? preferred : all)
    .map((s) => wdDate(s.mainsnak.datavalue?.value))
    .filter((d): d is WdDate => d !== null);
  return dates.filter(
    (date, i) =>
      !dates.some(
        (other, j) =>
          (other.date.length > date.date.length &&
            other.date.startsWith(date.date)) ||
          (j < i && other.date === date.date),
      ),
  );
}

const byDate = (a: WdDate, b: WdDate) =>
  a.date.slice(0, 4).localeCompare(b.date.slice(0, 4)) ||
  a.date.localeCompare(b.date);

/**
 * The earliest date a property states (see `datesOf`): when a group formed
 * (P571) or started work (P2031), whatever re-formations came after.
 */
export const earliestDate = (
  entity: WdEntity,
  property: string,
): WdDate | null => [...datesOf(entity, property)].sort(byDate)[0] ?? null;

/**
 * The latest date a property states: when work last stopped (P2032) — a
 * hiatus a later reunion ended is not the end.
 */
export const latestDate = (entity: WdEntity, property: string): WdDate | null =>
  [...datesOf(entity, property)].sort(byDate).at(-1) ?? null;

/** [lat, lng] from P625, rounded to four places (about 10 m). */
export function coordinatesOf(entity: WdEntity): [number, number] | null {
  for (const statement of currentStatements(entity, 'P625')) {
    const value = statement.mainsnak.datavalue?.value as
      | { latitude?: unknown; longitude?: unknown }
      | undefined;
    if (
      typeof value?.latitude === 'number' &&
      typeof value.longitude === 'number'
    ) {
      const round = (n: number) => Math.round(n * 1e4) / 1e4;
      return [round(value.latitude), round(value.longitude)];
    }
  }
  return null;
}

export const labelOf = (entity: WdEntity | undefined): string | null =>
  entity?.labels?.en?.value ?? null;

/**
 * What an item's classes (P31) say it is. Wikidata's classes are many and
 * specific ("city of Ohio", "neighborhood of Manhattan", "county of
 * Tennessee"), so beside the few listed by id, a class is read by its name
 * once the fetch has named the places' classes.
 *
 * A class that names a town — a city, a village, a neighbourhood — settles
 * it, whatever else the item is: San Francisco is a city and a county, a
 * village called Hospital is a village. "Human settlement" settles it only
 * when nothing says otherwise, since Wikidata puts it on counties too
 * (Somerset is a ceremonial county and a human settlement).
 */
const SETTLEMENT_CLASSES = new Set([
  'Q515', // city
  'Q1549591', // big city
  'Q5119', // capital
  'Q1637706', // city with millions of inhabitants
  'Q200250', // metropolis
  'Q208511', // global city
  'Q174844', // megacity
  'Q1093829', // city in the United States
  'Q62049', // county seat
  'Q3957', // town
  'Q532', // village
  'Q15284', // municipality
  'Q7930989', // city/town
  'Q123705', // neighbourhood
  'Q188509', // suburb
]);
/** A settlement, unless another class says it is something bigger or smaller. */
const WEAK_SETTLEMENT_CLASSES = new Set([
  'Q486972', // human settlement
]);
const COUNTRY_CLASSES = new Set([
  'Q6256', // country
  'Q3624078', // sovereign state
  'Q3336843', // country of the United Kingdom
  'Q112099', // island nation
]);
/** Counties and regions: bigger than a hometown, and no City. */
const SUBDIVISION_CLASSES = new Set([
  'Q28575', // county
  'Q47168', // county of the United States
  'Q13410508', // county of a US state
  'Q180673', // ceremonial county of England
  'Q1907114', // metropolitan area
  'Q82794', // geographic region
]);
/**
 * Buildings and streets — Wikidata's P19 is sometimes the hospital, its P551
 * the house or the street. A spot is not a place anyone is from.
 */
const BUILDING_CLASSES = new Set([
  'Q16917', // hospital
  'Q1774898', // general hospital
  'Q210999', // teaching hospital
  'Q64578911', // infirmary
  'Q3947', // house
  'Q41176', // building
  'Q811979', // architectural structure
  'Q1802963', // mansion
  'Q19979289', // birth house
  'Q12292478', // estate
  'Q2087181', // historic house museum
  'Q33506', // museum
  'Q16970', // church building
  'Q3914', // school
  'Q3918', // university
  'Q40357', // prison
  'Q79007', // street
]);

/** Class names, as the fetch names them (see the note above SETTLEMENT_CLASSES). */
const COUNTRY_WORDS =
  /^(country|sovereign state)$|\bcountry of the united kingdom\b|\bisland (nation|country)\b/i;
const BUILDING_WORDS =
  /\b(hospital|infirmary|clinic|building|house|mansion|estate|palace|museum|church|cathedral|hall|school|university|college|campus|prison|ranch|hotel|structure|street|road|avenue|boulevard|square|station|airport|stadium|arena|venue|apartments?|farm|plantation|park)\b/i;
const SETTLEMENT_WORDS =
  /\b(city|cities|town|village|hamlet|borough|municipality|commune|suburb|neighbou?rhood|quarter|locality|community|township|barrio|capital|metropolis|megacity|county seat|census-designated place|area of london)\b/i;
const WEAK_SETTLEMENT_WORDS = /\b(human )?settlement\b/i;
const SUBDIVISION_WORDS =
  /\b(county|region|metropolitan area|urban area|state|province|prefecture|oblast|canton|department|territory|voivodeship|governorate)\b/i;

/**
 * Words in the item's own name that say what it is when its classes don't:
 * "Walton Hospital", "Rivington Street", "Williamson County", "San Francisco
 * Bay Area". Read only when no class names a town, so the village of
 * Hospital stays a village.
 */
const OWN_BUILDING_WORDS =
  /\b(hospital|infirmary|clinic|university|college|school|street|avenue|boulevard|apartments|station)\b/i;
const OWN_SUBDIVISION_WORDS =
  /\b(county|bay area|metropolitan area|region|province)\b/i;

type ClassSignal =
  | 'settlement'
  | 'weakSettlement'
  | 'country'
  | 'building'
  | 'subdivision'
  | null;

function classSignal(id: string, name: string | null): ClassSignal {
  if (COUNTRY_CLASSES.has(id)) return 'country';
  if (SETTLEMENT_CLASSES.has(id)) return 'settlement';
  if (BUILDING_CLASSES.has(id)) return 'building';
  if (SUBDIVISION_CLASSES.has(id)) return 'subdivision';
  if (WEAK_SETTLEMENT_CLASSES.has(id)) return 'weakSettlement';
  if (!name) return null;
  // "town hall" is a building before it is a town; "consolidated
  // city-county" is a city before it is a county.
  if (COUNTRY_WORDS.test(name)) return 'country';
  if (BUILDING_WORDS.test(name)) return 'building';
  if (SETTLEMENT_WORDS.test(name)) return 'settlement';
  if (SUBDIVISION_WORDS.test(name)) return 'subdivision';
  if (WEAK_SETTLEMENT_WORDS.test(name)) return 'weakSettlement';
  return null;
}

/**
 * - `settlement`: a city, town, village or part of one — a Born or a City;
 * - `unclassified`: nothing read says what it is (its classes not named
 *   yet, or named nothing we know): offered, but never sure;
 * - `subdivision`: a county, state, region or metropolitan area — too big;
 * - `country`: too big;
 * - `building`: a building or a street — not a place at all.
 */
export type PlaceKind =
  | 'settlement'
  | 'unclassified'
  | 'subdivision'
  | 'country'
  | 'building';

/**
 * What kind of place an item is, as Born and City need to know. `label`
 * names a class, once the fetch has named the places' classes; before that,
 * only the classes listed here by id, the ISO codes and the item's own name
 * say anything, and most places stay `unclassified`.
 */
export function placeKindOf(
  entity: WdEntity,
  label: (id: string) => string | null = () => null,
): PlaceKind {
  const signals = new Set(
    itemValues(entity, 'P31').map((c) => classSignal(c, label(c))),
  );
  const own = labelOf(entity) ?? '';
  if (signals.has('settlement')) return 'settlement';
  if (statementsOf(entity, 'P297').length || signals.has('country'))
    return 'country';
  if (signals.has('building') || OWN_BUILDING_WORDS.test(own))
    return 'building';
  if (
    statementsOf(entity, 'P300').length ||
    signals.has('subdivision') ||
    OWN_SUBDIVISION_WORDS.test(own)
  )
    return 'subdivision';
  if (signals.has('weakSettlement')) return 'settlement';
  return 'unclassified';
}

/** What each kind is, for the report of places not taken. */
export const PLACE_KIND_WORDS: Record<PlaceKind, string> = {
  settlement: 'a town',
  unclassified: 'a place of unknown kind',
  subdivision: 'a county or region',
  country: 'a country',
  building: 'a building or a street',
};

/** The item is a person (P31 human), as against a group. */
export const isHuman = (entity: WdEntity): boolean =>
  itemValues(entity, 'P31').includes('Q5');
