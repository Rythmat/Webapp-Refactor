import { AdminRoutes } from '@/constants/routes';

/**
 * Tesseract's view as a URL, the browser's copy of the last one, and the
 * links into and out of the map.
 *
 * THE VIEW IN THE URL
 *
 * The map's query says what it shows, so a view can be linked and reloaded:
 *
 * - `key`: the major key chords are named and coloured in (`Eb`), left out
 *   for C;
 * - `notation`: `hybrid` or `roman`, left out for the map's default, Jazz
 *   letter names;
 * - `list`: `1` while the list shows instead of the map;
 * - `depth`: how many chords deep every tree shows, `1` (the starting
 *   chords alone) to `7`, or `all`;
 * - `open`: the openings opened beyond that depth, and `fold`: the ones
 *   folded within it, each a comma-separated list of openings spelled as
 *   their node ids are (`1 major7|2 minor7`).
 *
 * `depth` is always written, so a URL the map wrote is never bare. A bare
 * URL (the pill, a link that names no view) restores the last view this
 * browser showed (`readStoredView`), and the page writes it into the URL.
 * Anything the query leaves out otherwise takes the map's default.
 *
 * None of these names is one the Table's query uses (q, sort, f, status,
 * view, more, narrow, field, link, new), so the row panel open beside the
 * map never reads the map's state as its own.
 *
 * THE LINKS
 *
 * - into the map from Cortex: a progression's row open beside it, in the
 *   last key and view (`tesseractHrefForProgression`);
 * - out to Cortex: the local graph round a progression (`showInCortexHref`);
 * - out to the Table: a new progression starting with an opening's chords
 *   (`newProgressionHref`).
 *
 * The module is light on purpose (the route constants and nothing else), so
 * Cortex's page can link here without loading the map.
 */

/** The query parameters Tesseract owns. */
export const TESSERACT_PARAMS = {
  key: 'key',
  notation: 'notation',
  list: 'list',
  depth: 'depth',
  open: 'open',
  fold: 'fold',
} as const;

/**
 * What points into an open row and means nothing once it closes or another
 * opens: the row panel's field to scroll to, and the Link… asked for.
 */
const ROW_PARAMS = ['field', 'link'] as const;

/** The table a progression's row is in, as the path names it. */
export const PROGRESSIONS_TABLE = 'progressions';

/** The Table's "New …" parameter (grid/tableQuery.ts `NEW_PARAM`). */
const NEW_PARAM = 'new';

/** How far the trees are open when nothing says otherwise. */
export const DEFAULT_OPEN_DEPTH = 2;

/** The deepest a tree goes (seven chords), so the most `depth` can say. */
const MAX_DEPTH = 7;

/**
 * Which openings are open, as a base depth and the differences from it:
 * every opening shallower than `depth` is open (Infinity for all), plus
 * `open`, minus `fold`.
 */
export interface OpenSpec {
  depth: number;
  open: readonly string[];
  fold: readonly string[];
}

/** What the map shows, as its URL says it. */
export interface TesseractView {
  /** The key as the URL spells it (`Eb`); the page checks it. */
  key: string;
  /** The notation as the URL spells it; the page checks it. */
  notation: string;
  list: boolean;
  open: OpenSpec;
}

export const DEFAULT_OPEN: OpenSpec = {
  depth: DEFAULT_OPEN_DEPTH,
  open: [],
  fold: [],
};

export const DEFAULT_VIEW: TesseractView = {
  key: 'C',
  notation: 'jazz',
  list: false,
  open: DEFAULT_OPEN,
};

/** A depth as the URL writes it: a whole number, or `all`. */
const depthText = (depth: number): string =>
  Number.isFinite(depth) ? String(depth) : 'all';

/** A depth the URL holds, or null when it holds none that reads as one. */
export function parseDepth(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  const value = text.trim().toLowerCase();
  if (value === 'all') return Infinity;
  if (!/^\d+$/.test(value)) return null;
  return Math.max(1, Math.min(Number(value), MAX_DEPTH + 1));
}

/** A comma-separated list of openings, empty parts dropped. */
const openings = (text: string | null): string[] =>
  text
    ? text
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

/** The URL names something about the view (anything but a row). */
export const hasViewParams = (params: URLSearchParams): boolean =>
  Object.values(TESSERACT_PARAMS).some((name) => params.has(name));

/**
 * The view a URL's query names, with the defaults where it names nothing.
 * The key and notation come back as written; the page checks them.
 */
export function parseTesseractView(params: URLSearchParams): TesseractView {
  return {
    key: params.get(TESSERACT_PARAMS.key) || DEFAULT_VIEW.key,
    notation: params.get(TESSERACT_PARAMS.notation) || DEFAULT_VIEW.notation,
    list: params.get(TESSERACT_PARAMS.list) === '1',
    open: {
      depth:
        parseDepth(params.get(TESSERACT_PARAMS.depth)) ?? DEFAULT_OPEN_DEPTH,
      open: openings(params.get(TESSERACT_PARAMS.open)),
      fold: openings(params.get(TESSERACT_PARAMS.fold)),
    },
  };
}

/**
 * The query for a view (`?key=Eb&depth=2`), written one way: the defaults
 * left out but the depth, which is always there. Anything else `keep`
 * holds is kept as it is.
 */
export function tesseractSearch(
  view: TesseractView,
  keep: URLSearchParams = new URLSearchParams(),
): string {
  const next = new URLSearchParams(keep);
  for (const name of Object.values(TESSERACT_PARAMS)) next.delete(name);
  if (view.key && view.key !== DEFAULT_VIEW.key)
    next.set(TESSERACT_PARAMS.key, view.key);
  if (view.notation && view.notation !== DEFAULT_VIEW.notation)
    next.set(TESSERACT_PARAMS.notation, view.notation);
  if (view.list) next.set(TESSERACT_PARAMS.list, '1');
  next.set(TESSERACT_PARAMS.depth, depthText(view.open.depth));
  if (view.open.open.length)
    next.set(TESSERACT_PARAMS.open, view.open.open.join(','));
  if (view.open.fold.length)
    next.set(TESSERACT_PARAMS.fold, view.open.fold.join(','));
  const text = next.toString();
  return text ? `?${text}` : '';
}

/** The search without what pointed into an open row. */
export function outsideRow(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const name of ROW_PARAMS) next.delete(name);
  return next;
}

/** Two open specs that say the same thing. */
export const sameOpenSpec = (a: OpenSpec, b: OpenSpec): boolean =>
  a.depth === b.depth &&
  a.open.length === b.open.length &&
  a.fold.length === b.fold.length &&
  a.open.every((id, i) => id === b.open[i]) &&
  a.fold.every((id, i) => id === b.fold[i]);

/* ── The browser's copy ─────────────────────────────────────────────── */

/**
 * Where the browser keeps the last view the map showed. A convenience
 * only: the URL is what a view is; this fills in a bare one.
 */
export const TESSERACT_VIEW_KEY = 'ma-console-tesseract-view-v1';

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v !== '')
    : [];

/**
 * The last view this browser showed, or null when it kept none (or the
 * browser refuses storage, as a private window may).
 */
export function readStoredView(): TesseractView | null {
  try {
    const raw = window.localStorage.getItem(TESSERACT_VIEW_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    if (!stored || typeof stored !== 'object') return null;
    const open = (stored.open ?? {}) as Record<string, unknown>;
    return {
      key: typeof stored.key === 'string' ? stored.key : DEFAULT_VIEW.key,
      notation:
        typeof stored.notation === 'string'
          ? stored.notation
          : DEFAULT_VIEW.notation,
      list: stored.list === true,
      open: {
        depth:
          parseDepth(
            typeof open.depth === 'string' ? open.depth : String(open.depth),
          ) ?? DEFAULT_OPEN_DEPTH,
        open: strings(open.open),
        fold: strings(open.fold),
      },
    };
  } catch {
    return null;
  }
}

/** Keep `view` as the last one shown; nothing happens where storage is refused. */
export function storeView(view: TesseractView): void {
  try {
    window.localStorage.setItem(
      TESSERACT_VIEW_KEY,
      JSON.stringify({
        key: view.key,
        notation: view.notation,
        list: view.list,
        open: {
          depth: depthText(view.open.depth),
          open: view.open.open,
          fold: view.open.fold,
        },
      }),
    );
  } catch {
    // Not remembered; the URL still holds the view.
  }
}

/* ── Links ──────────────────────────────────────────────────────────── */

/** A progression's id from its graph node (`progression:12` → 12), or null. */
export function progressionOfNode(id: string): number | null {
  const match = /^progression:(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

/**
 * Tesseract with a progression's row open beside it, in the last key and
 * view this browser showed (C, two deep, when it kept none). The map opens
 * the way to it, flies there and rings it. The list is left out: arriving
 * from Cortex, the map is the point.
 */
export function tesseractHrefForProgression(
  progressionId: number,
  stored: TesseractView | null = readStoredView(),
): string {
  const view = { ...(stored ?? DEFAULT_VIEW), list: false };
  return `${AdminRoutes.cortexTesseractRow({
    table: PROGRESSIONS_TABLE,
    row: String(progressionId),
  })}${tesseractSearch(view)}`;
}

/** Cortex's local graph round a progression: its songs, vibes and genres. */
export const showInCortexHref = (progressionId: number): string =>
  AdminRoutes.cortex(undefined, { focus: `progression:${progressionId}` });

/**
 * The Table's New flow for a progression starting with `chords` (degrees,
 * "1 major7"), written as the New panel reads a progression's chords:
 * a dash between them.
 */
export function newProgressionHref(chords: readonly string[]): string {
  const query = new URLSearchParams({ [NEW_PARAM]: chords.join(' - ') });
  return `${AdminRoutes.tableList({ table: PROGRESSIONS_TABLE })}?${query}`;
}
