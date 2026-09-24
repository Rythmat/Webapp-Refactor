import { useCallback, useSyncExternalStore } from 'react';

/**
 * How a set list reads on the stand: whole pages, or one long scroll.
 *
 * Page view is the default — it is what a player turns with a pedal, and what
 * a tablet swipes. Device-level, like the app's other view preferences.
 */

export type SetViewMode = 'page' | 'scroll';

const KEY = 'musicAtlas:setListView';
const EVENT = 'setlist-view-change';

export function getSetViewMode(): SetViewMode {
  try {
    return localStorage.getItem(KEY) === 'scroll' ? 'scroll' : 'page';
  } catch {
    return 'page';
  }
}

export function setSetViewMode(mode: SetViewMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Private mode or a full quota: the session still switches.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSetViewMode(): [SetViewMode, (mode: SetViewMode) => void] {
  const mode = useSyncExternalStore(
    subscribe,
    getSetViewMode,
    () => 'page' as const,
  );
  return [mode, useCallback((next: SetViewMode) => setSetViewMode(next), [])];
}

/**
 * How many staves a page holds.
 *
 * A page is a fixed number of systems, not a fixed number of pixels: the
 * chart is zoomed so that the fullest page fills the stand. Eight reads
 * comfortably on a laptop and ten is closer to a printed page; four is for a
 * beginner following along, or for eyes that want the staff big.
 *
 * A value that is no longer offered falls back to the default, so a stand
 * that remembers an old choice still opens on something readable.
 */

export const STAVES_PER_PAGE = [4, 6, 8, 10] as const;
export type StavesPerPage = (typeof STAVES_PER_PAGE)[number];

const STAVES_KEY = 'musicAtlas:setListStaves';
const STAVES_EVENT = 'setlist-staves-change';
const DEFAULT_STAVES: StavesPerPage = 8;

const asStaves = (raw: string | null): StavesPerPage => {
  const value = Number(raw);
  return (STAVES_PER_PAGE as readonly number[]).includes(value)
    ? (value as StavesPerPage)
    : DEFAULT_STAVES;
};

export function getStavesPerPage(): StavesPerPage {
  try {
    return asStaves(localStorage.getItem(STAVES_KEY));
  } catch {
    return DEFAULT_STAVES;
  }
}

export function setStavesPerPage(value: StavesPerPage): void {
  try {
    localStorage.setItem(STAVES_KEY, String(value));
  } catch {
    // Private mode or a full quota: the session still changes.
  }
  window.dispatchEvent(new CustomEvent(STAVES_EVENT));
}

function subscribeStaves(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STAVES_KEY) listener();
  };
  window.addEventListener(STAVES_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(STAVES_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useStavesPerPage(): [
  StavesPerPage,
  (value: StavesPerPage) => void,
] {
  const value = useSyncExternalStore(
    subscribeStaves,
    getStavesPerPage,
    () => DEFAULT_STAVES,
  );
  return [
    value,
    useCallback((next: StavesPerPage) => setStavesPerPage(next), []),
  ];
}

/**
 * Which way the chart is drawn on the stand.
 *
 * 'staff' is the lead sheet as it prints. 'chords' is bars of chord symbols,
 * the format a phone can be read from: the staff chart draws its symbols
 * inside the SVG, so four bars across a phone puts them at about five pixels,
 * while a box of text stays the size it needs to be.
 *
 * 'auto' is the default and picks by how much room the stand actually has —
 * not by the size of the window, since the set rail and the Atlas sidebar
 * take their share first.
 */

export const CHART_FORMATS = ['auto', 'staff', 'chords'] as const;
export type ChartFormat = (typeof CHART_FORMATS)[number];

const FORMAT_KEY = 'musicAtlas:setListChartFormat';
const FORMAT_EVENT = 'setlist-format-change';

/** Below this, a staff chart's chord symbols stop being readable. */
export const STAFF_MIN_WIDTH = 620;
/**
 * Below this, a staff chart shows barely two systems and the page is mostly
 * turning. A phone held sideways is wide enough for the staff and nowhere
 * near tall enough for it, so height has to count as well as width.
 */
export const STAFF_MIN_HEIGHT = 420;
/**
 * Below this, even a compactly-set symbol has no room in a quarter of the row.
 * Deliberately small: a phone reads four bars across, as iRealPro does, and it
 * is the typography that makes them fit rather than fewer bars.
 */
export const TWO_BAR_MAX_WIDTH = 330;

/** What `auto` resolves to for a stand of this width. */
export function resolveChartFormat(
  format: ChartFormat,
  standWidth: number,
  standHeight = 0,
): 'staff' | 'chords' {
  if (format !== 'auto') return format;
  // Zero means "not measured yet"; assume the roomy case so a desktop does
  // not flash the phone format on its first paint.
  if (standWidth === 0) return 'staff';
  if (standWidth < STAFF_MIN_WIDTH) return 'chords';
  if (standHeight > 0 && standHeight < STAFF_MIN_HEIGHT) return 'chords';
  return 'staff';
}

/** Bars to a row in the chord grid, for a stand of this width. */
export const gridBarsPerRow = (standWidth: number): number =>
  standWidth > 0 && standWidth < TWO_BAR_MAX_WIDTH ? 2 : 4;

/** A phone's stand, so the chart is the chart and not a column of two bars. */
export const PHONE_KEEPS_FOUR_BARS = true;

const asFormat = (raw: string | null): ChartFormat =>
  (CHART_FORMATS as readonly string[]).includes(raw ?? '')
    ? (raw as ChartFormat)
    : 'auto';

export function getChartFormat(): ChartFormat {
  try {
    return asFormat(localStorage.getItem(FORMAT_KEY));
  } catch {
    return 'auto';
  }
}

export function setChartFormat(value: ChartFormat): void {
  try {
    localStorage.setItem(FORMAT_KEY, value);
  } catch {
    // Private mode or a full quota: the session still changes.
  }
  window.dispatchEvent(new CustomEvent(FORMAT_EVENT));
}

function subscribeFormat(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === FORMAT_KEY) listener();
  };
  window.addEventListener(FORMAT_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(FORMAT_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useChartFormat(): [ChartFormat, (v: ChartFormat) => void] {
  const value = useSyncExternalStore(
    subscribeFormat,
    getChartFormat,
    () => 'auto' as const,
  );
  return [value, useCallback((next: ChartFormat) => setChartFormat(next), [])];
}
