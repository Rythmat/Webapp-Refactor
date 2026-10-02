/**
 * The console's mirror of the app lives under one prefix: the app's `/songs/africa`
 * is the console's `/console/content/songs/africa`. These functions translate
 * between the two, and nothing else — they are pure so the router, the auth
 * guard's backstop and the tests all share one definition.
 */

export const MIRROR_BASE = '/console/content';

/**
 * App segments the mirror renders. A link to any other app path still lands
 * inside the mirror (it shows "not mirrored yet" rather than leaving /console).
 */
export const MIRRORED_PREFIXES = [
  '/home',
  '/learn',
  '/songs',
  '/curriculum',
  '/studio',
  '/atlas',
  '/arcade',
  '/search',
  '/classrooms',
  '/office',
] as const;

/**
 * Console pages under the mirror's prefix that are not app paths. None of
 * them may collide with an app segment, or a mirrored link would open a
 * console page instead. `graph` is the graph's old home: it moved to
 * Cortex (/console/cortex) on 1 Oct 2026, and its old links redirect there.
 */
export const RESERVED_CONSOLE_SEGMENTS = [
  'records',
  'graph',
  'publishing',
] as const;

/** The six content kinds whose tables used to live at /console/content/:kind. */
export const LEGACY_KIND_SEGMENTS = [
  'activity_flow',
  'fundamentals_flow',
  'song',
  'globe_event',
  'artist_location',
  'globe_city',
] as const;

const segmentOf = (pathname: string) => pathname.split('/')[1] ?? '';

/** Is this app pathname one the mirror renders? */
export const isMirroredPrefix = (pathname: string): boolean =>
  MIRRORED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

/**
 * An app path (with its search and hash) → the console path that mirrors it.
 * Paths already under /console pass through, so console links rendered inside
 * mirrored pages (an editor's "Records" link) keep working.
 */
export function toConsolePath(appPath: string): string {
  if (!appPath.startsWith('/')) return appPath;
  if (appPath === '/console' || appPath.startsWith('/console/')) return appPath;
  if (appPath.startsWith('/?') || appPath.startsWith('/#') || appPath === '/')
    return `${MIRROR_BASE}/home${appPath.slice(1)}`;
  return `${MIRROR_BASE}${appPath}`;
}

/** The app pathname a console pathname mirrors, or null if it mirrors none. */
export function toAppPathname(consolePathname: string): string | null {
  if (
    consolePathname !== MIRROR_BASE &&
    !consolePathname.startsWith(`${MIRROR_BASE}/`)
  )
    return null;
  const rest = consolePathname.slice(MIRROR_BASE.length) || '/';
  const first = segmentOf(rest);
  if ((RESERVED_CONSOLE_SEGMENTS as readonly string[]).includes(first))
    return null;
  return rest;
}

type LocationLike = {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  key: string;
};

/**
 * The outer (console) location as the mirrored app sees it. `key` and `state`
 * are carried over: react-router would otherwise give every location the key
 * "default", and the atlas's trail records its steps by key.
 */
export function toAppLocation(outer: LocationLike): LocationLike {
  return {
    pathname: toAppPathname(outer.pathname) ?? '/',
    search: outer.search,
    hash: outer.hash,
    state: outer.state,
    key: outer.key,
  };
}

/**
 * The app section a content kind is seen in, for the sidebar's highlight on a
 * console page that is not itself a mirrored page (a kind's table). Kept here,
 * away from kinds.ts, so the sidebar does not pull in the editors.
 */
export function segmentForKind(kind: string): string | null {
  switch (kind) {
    case 'song':
    case 'activity_flow':
    case 'fundamentals_flow':
    case 'chord_progression':
      return '/learn';
    case 'globe_event':
    case 'globe_city':
    case 'artist_location':
    case 'artist':
    case 'release':
    case 'studio':
    case 'label':
      return '/atlas';
    default:
      return null;
  }
}

/**
 * The app section a console page belongs to, or null: a mirrored page is its
 * own app path; a kind's table belongs to the section that kind lives in; the
 * lesson course editor belongs to Learn.
 */
export function consoleAppPath(pathname: string): string | null {
  const app = toAppPathname(pathname);
  if (app !== null) return app;
  const records = new RegExp(`^${MIRROR_BASE}/records/([^/]+)`).exec(pathname);
  if (records) return segmentForKind(records[1]);
  if (pathname.startsWith('/console/lessons/')) return '/learn';
  return null;
}
