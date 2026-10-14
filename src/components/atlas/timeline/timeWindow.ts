import {
  MUSICAL_ERAS,
  eraWindow,
  type MusicalEra,
} from '@/components/atlas/data/musicalEras';

/**
 * The span of years the Globe is looking at: the timeline's view, and the
 * filter the map and its bottom bar apply. `null` in the store means no
 * filter — all of time.
 *
 * Years may be fractional while a gesture runs; the URL keeps whole years.
 */
export interface TimeWindow {
  from: number;
  to: number;
}

const THIS_YEAR = new Date().getFullYear();

/** Everything the timeline can show: the first era to this year. */
export const DOMAIN: TimeWindow = {
  from: MUSICAL_ERAS[0].yearStart,
  to: THIS_YEAR,
};

/**
 * Where the timeline opens. Nine in ten events are from after 1946 and only a
 * dozen before 1400, so a view of all of time would be an empty river.
 */
export const DEFAULT_WINDOW: TimeWindow = { from: 1900, to: THIS_YEAR };

/** The closest the timeline zooms in: a few years across the screen. */
export const MIN_SPAN = 4;

export const spanOf = (w: TimeWindow): number => w.to - w.from;

/** Keep a window inside the domain and its span between the limits. */
export function clampWindow(w: TimeWindow, domain = DOMAIN): TimeWindow {
  const span = Math.min(Math.max(spanOf(w), MIN_SPAN), domain.to - domain.from);
  const from = Math.min(Math.max(w.from, domain.from), domain.to - span);
  return { from, to: from + span };
}

/**
 * Zoom by `factor` (over 1 zooms out) about `anchor`, a year that stays where
 * it is on screen — the pointer's, for a wheel.
 */
export function zoomAt(
  w: TimeWindow,
  anchor: number,
  factor: number,
  domain = DOMAIN,
): TimeWindow {
  const t = spanOf(w) ? (anchor - w.from) / spanOf(w) : 0.5;
  const span = Math.min(
    Math.max(spanOf(w) * factor, MIN_SPAN),
    domain.to - domain.from,
  );
  const from = anchor - t * span;
  return clampWindow({ from, to: from + span }, domain);
}

/** Move the window by `years` (positive is later), keeping its span. */
export function panBy(
  w: TimeWindow,
  years: number,
  domain = DOMAIN,
): TimeWindow {
  return clampWindow({ from: w.from + years, to: w.to + years }, domain);
}

/**
 * Pan the least that brings `year` into view with `margin` (a share of the
 * span) to spare; the window itself when it already shows it.
 */
export function ensureVisible(
  w: TimeWindow,
  year: number,
  margin = 0.1,
  domain = DOMAIN,
): TimeWindow {
  const pad = spanOf(w) * margin;
  if (year < w.from + pad) return panBy(w, year - pad - w.from, domain);
  if (year > w.to - pad) return panBy(w, year + pad - w.to, domain);
  return w;
}

/** The window as the URL writes it: whole years. */
export const roundWindow = (w: TimeWindow): TimeWindow => ({
  from: Math.round(w.from),
  to: Math.round(w.to),
});

/** Equal as the URL would write them (whole years), or both null. */
export function sameWindow(
  a: TimeWindow | null,
  b: TimeWindow | null,
): boolean {
  if (!a || !b) return a === b;
  return (
    Math.round(a.from) === Math.round(b.from) &&
    Math.round(a.to) === Math.round(b.to)
  );
}

/** "1946–1979"; "2000–present" for one that runs to this year. */
export function windowLabel(w: TimeWindow): string {
  const { from, to } = roundWindow(w);
  return to >= THIS_YEAR ? `${from}–present` : `${from}–${to}`;
}

/** The era a window is exactly, when it is one (the era rail's presets). */
export function eraOfWindow(w: TimeWindow | null): MusicalEra | undefined {
  if (!w) return undefined;
  return MUSICAL_ERAS.find((era) => sameWindow(eraWindow(era), w));
}

/** Whether a year falls in a window; every year does in no window. */
export const inWindow = (w: TimeWindow | null, year: number): boolean =>
  !w || (year >= w.from && year <= w.to);

/* ── The era rail's scale ─────────────────────────────────────────────────
 * The rail is a table of contents, not a ruler: each era gets a share of its
 * width by the square root of how many events it holds (and at least a
 * floor), so the four empty-ish early eras stay findable and the busy modern
 * ones get room. Within an era, years are spread evenly. */

export interface RailSegment {
  era: MusicalEra;
  /** The era's years, its last one capped at the domain's end. */
  from: number;
  to: number;
  /** Its share of the rail, 0–1. */
  x0: number;
  x1: number;
}

/**
 * The rail's segments for these per-era event counts (one per MUSICAL_ERAS
 * entry, in order). `floor` is the least share an era gets.
 */
export function railSegments(
  counts: readonly number[],
  floor = 0.06,
  domain = DOMAIN,
): RailSegment[] {
  const raw = MUSICAL_ERAS.map((_, i) =>
    Math.sqrt(Math.max(counts[i] ?? 0, 0)),
  );
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  // Lift every era to the floor, then share what is left by weight.
  const shares = raw.map((r) => r / total);
  const lifted = shares.map((s) => Math.max(s, floor));
  const over = lifted.reduce((a, b) => a + b, 0);
  const norm = lifted.map((s) => s / over);
  let x = 0;
  return MUSICAL_ERAS.map((era, i) => {
    const x0 = x;
    x += norm[i];
    return {
      era,
      from: Math.max(era.yearStart, domain.from),
      to: Math.min(era.yearEnd + 1, domain.to),
      x0,
      x1: i === MUSICAL_ERAS.length - 1 ? 1 : x,
    };
  });
}

/** A year's place on the rail, 0–1. */
export function yearToRail(
  year: number,
  segments: readonly RailSegment[],
): number {
  const first = segments[0];
  const last = segments.at(-1)!;
  if (year <= first.from) return 0;
  if (year >= last.to) return 1;
  const seg = segments.find((s) => year >= s.from && year < s.to) ?? last;
  const t = (year - seg.from) / (seg.to - seg.from || 1);
  return seg.x0 + t * (seg.x1 - seg.x0);
}

/** The year at a place on the rail, 0–1. */
export function railToYear(
  x: number,
  segments: readonly RailSegment[],
): number {
  const first = segments[0];
  const last = segments.at(-1)!;
  if (x <= 0) return first.from;
  if (x >= 1) return last.to;
  const seg = segments.find((s) => x >= s.x0 && x < s.x1) ?? last;
  const t = (x - seg.x0) / (seg.x1 - seg.x0 || 1);
  return seg.from + t * (seg.to - seg.from);
}
