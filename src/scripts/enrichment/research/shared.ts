import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The research fill of the Artists table's five core columns (Born, City,
 * Genres, Years Active, Instruments) for the globe roster: shared paths and
 * shapes. The run, in order:
 *
 *   gaps.ts           which roster cells are empty in the live store
 *   wikipedia.ts      each gap artist's infobox → fills (with sources)
 *   (research agents) what is still empty or in conflict → fills/batch-*.json
 *   validateFills.ts  every fill checked → merged.json + report.md
 *   pushFills.ts      merged.json → PUT /items, empty paths only
 *
 * Sources stay in `_work/` (gitignored): no outside catalogue's name, link
 * or id ever goes into a body (owner rule, 30 September 2026).
 */

export const RESEARCH_DIR = fileURLToPath(new URL('.', import.meta.url));
export const WORK_DIR = join(RESEARCH_DIR, '_work');
export const GAPS_FILE = join(WORK_DIR, 'gaps.json');
export const WIKIPEDIA_FILE = join(WORK_DIR, 'fills-wikipedia.json');
export const AGENT_FILLS_DIR = join(WORK_DIR, 'fills');
export const MERGED_FILE = join(WORK_DIR, 'merged.json');
export const REPORT_FILE = join(WORK_DIR, 'report.md');
export const PUSH_LOG = join(WORK_DIR, 'push-log.json');

/** The cells this fill owns. `group` is set only where a source says band. */
export const CORE_PATHS = [
  'born.date',
  'born.placeId',
  'basedInPlaceId',
  'activeFrom',
  'activeTo',
  'genreIds',
  'instrumentIds',
  'group',
] as const;
export type CorePath = (typeof CORE_PATHS)[number];

export interface CoreValues {
  group?: boolean;
  born?: { date?: string; placeId?: string };
  basedInPlaceId?: string;
  activeFrom?: number;
  activeTo?: number;
  genreIds?: string[];
  instrumentIds?: string[];
}

export interface GapArtist {
  slug: string;
  name: string;
  group: boolean;
  /** The store's item id and revision (API gaps only), for the push. */
  id?: string;
  revision?: number;
  current: CoreValues;
  /**
   * Empty cells to fill. `activeTo` is listed for every act without one, but
   * filled only where a source gives an end: absent means still active.
   */
  empty: CorePath[];
}

export interface GapsFile {
  generatedAt: string;
  from: 'api' | 'repo';
  artists: GapArtist[];
}

export interface Source {
  url: string;
  /** What in the source says it: 'infobox birth_date', 'lead paragraph'. */
  field: string;
}

export interface Fill {
  slug: string;
  path: CorePath;
  value: unknown;
  sources: Source[];
  via: 'wikipedia' | 'importer' | 'research';
  note?: string;
}

/** A `pin: false` place a fill needs made first (the importer's shape). */
export interface NewPlace {
  slug: string;
  body: Record<string, unknown>;
  sources: Source[];
}

export interface Unresolved {
  slug: string;
  path: CorePath;
  why: string;
  sources?: Source[];
}

export const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(file, 'utf8')) as T;

export function writeJson(file: string, value: unknown): void {
  if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** The value at a core path, or undefined. */
export function valueAt(values: CoreValues, path: CorePath): unknown {
  if (path === 'born.date') return values.born?.date;
  if (path === 'born.placeId') return values.born?.placeId;
  return values[path as keyof CoreValues];
}

export const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

/** The empty core cells of a body. A group has no birthplace to fill. */
export function emptyPaths(values: CoreValues, group: boolean): CorePath[] {
  return CORE_PATHS.filter((path) => {
    if (path === 'group') return !group;
    if (path === 'born.placeId' && group) return false;
    return isEmpty(valueAt(values, path));
  });
}

/** The core fields of a stored body. */
export function coreOf(body: Record<string, unknown>): CoreValues {
  const out: CoreValues = {};
  if (body.group === true) out.group = true;
  const born = body.born as CoreValues['born'] | undefined;
  if (born && (born.date || born.placeId))
    out.born = {
      ...(born.date ? { date: born.date } : {}),
      ...(born.placeId ? { placeId: born.placeId } : {}),
    };
  for (const key of [
    'basedInPlaceId',
    'activeFrom',
    'activeTo',
    'genreIds',
    'instrumentIds',
  ] as const) {
    const v = body[key];
    if (!isEmpty(v)) (out as Record<string, unknown>)[key] = v;
  }
  return out;
}

/** Sets a core path on a body, leaving everything else as it is. */
export function setPath(
  body: Record<string, unknown>,
  path: CorePath,
  value: unknown,
): void {
  if (path === 'born.date' || path === 'born.placeId') {
    const born = { ...((body.born as Record<string, unknown>) ?? {}) };
    born[path === 'born.date' ? 'date' : 'placeId'] = value;
    body.born = born;
  } else {
    body[path] = value;
  }
}

/**
 * Places that are part of a city, not a city: a City (`basedInPlaceId`) is
 * the city itself (owner, 2026-10-16: "Queens is a county in New York City.
 * A Tribe Called Quest's City is New York City"). Boroughs, districts and
 * neighbourhoods inside a city's limits only; separate municipalities next
 * to one (Compton, Oakland, Hoboken, Jersey City) are cities of their own.
 */
export const PART_OF_CITY: Readonly<Record<string, string>> = {
  // New York City
  manhattan: 'new-york',
  brooklyn: 'new-york',
  queens: 'new-york',
  bronx: 'new-york',
  'the-bronx': 'new-york',
  'staten-island': 'new-york',
  harlem: 'new-york',
  'hells-kitchen': 'new-york',
  'bedford-stuyvesant': 'new-york',
  hollis: 'new-york',
  'upper-east-side': 'new-york',
  // London
  barnes: 'london',
  bow: 'london',
  brixton: 'london',
  'east-finchley': 'london',
  hounslow: 'london',
  islington: 'london',
  'london-borough-of-brent': 'london',
  'london-borough-of-ealing': 'london',
  marylebone: 'london',
  paddington: 'london',
  pinner: 'london',
  southgate: 'london',
  stanmore: 'london',
  tottenham: 'london',
  // Elsewhere
  'algiers-us': 'new-orleans',
  cojimar: 'havana',
  santurce: 'san-juan',
  'saint-james': 'port-of-spain',
  walton: 'liverpool',
  'van-nuys': 'los-angeles',
  takapuna: 'auckland',
};
