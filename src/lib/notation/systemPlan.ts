// ── Planning systems and pages ─────────────────────────────────────────────
// How the bars of a score are dealt out into systems, and systems into pages.
//
// The default is a fixed number of bars a line. On top of that the user can
// say three things, and they compose:
//
//   system break  — this bar starts a new system; what follows flows on as
//                   usual, so a break at bar 3 gives 0–2, then 3–6, then 7–10
//   make a system — these exact bars are one system, however many they are
//   page break    — this bar starts a new page
//
// Keeping these as marks on bars, rather than as a list of row sizes, is what
// lets a break early in the piece leave the rest of it alone. A row-size list
// has to say something about every bar, so one break turned everything after
// it into a single enormous system.

export interface SystemMarks {
  /** Bars that must start a system. */
  breaks: ReadonlySet<number>;
  /** Bars that start a system of an exact length: start → bar count. */
  runs: ReadonlyMap<number, number>;
  /** Bars that must start a page. */
  pageBreaks: ReadonlySet<number>;
}

export const NO_MARKS: SystemMarks = {
  breaks: new Set(),
  runs: new Map(),
  pageBreaks: new Set(),
};

/** A bar starts a system when it is marked, or when the line before it is full. */
export function startsSystem(
  index: number,
  sinceStart: number,
  runStart: number | null,
  perSystem: number,
  marks: SystemMarks,
): boolean {
  if (index === 0) return true;
  if (marks.breaks.has(index) || marks.pageBreaks.has(index)) return true;
  if (marks.runs.has(index)) return true;
  const limit = runStart !== null ? marks.runs.get(runStart) : undefined;
  return sinceStart >= (limit ?? Math.max(1, perSystem));
}

export interface PlannedSystem {
  measures: number[];
  /** True when this system opens a page. */
  startsPage: boolean;
}

/**
 * Deal every bar out into systems. `perSystem` is the default bars a line;
 * a run set by "make into system" overrides it for its own bars.
 */
export function planSystems(
  measureCount: number,
  perSystem: number,
  marks: SystemMarks = NO_MARKS,
): PlannedSystem[] {
  return planSystemsOver(
    Array.from({ length: measureCount }, (_, i) => i),
    perSystem,
    marks,
  );
}

/**
 * The same, over whichever bars are actually drawn. A multi-bar rest is
 * written as one bar and swallows the ones it covers, so the renderer lays
 * out over its own list of slots rather than over every bar in the score.
 */
export function planSystemsOver(
  bars: readonly number[],
  perSystem: number,
  marks: SystemMarks = NO_MARKS,
): PlannedSystem[] {
  const systems: PlannedSystem[] = [];
  let current: number[] = [];
  let runStart: number | null = null;

  for (const index of bars) {
    if (
      current.length > 0 &&
      startsSystem(index, current.length, runStart, perSystem, marks)
    ) {
      systems.push({
        measures: current,
        startsPage: marks.pageBreaks.has(current[0]),
      });
      current = [];
      runStart = null;
    }
    if (current.length === 0) runStart = marks.runs.has(index) ? index : null;
    current.push(index);
  }
  if (current.length > 0) {
    systems.push({
      measures: current,
      startsPage: marks.pageBreaks.has(current[0]),
    });
  }
  return systems;
}

/** Toggle a forced system start at `bar`. */
export function withSystemBreak(
  breaks: readonly number[],
  bar: number,
  measureCount: number,
): number[] {
  if (bar <= 0 || bar >= measureCount) return [...breaks];
  const set = new Set(breaks);
  if (set.has(bar)) set.delete(bar);
  else set.add(bar);
  return [...set].sort((a, b) => a - b);
}

/** Toggle a forced page start at `bar`. */
export function withPageBreak(
  pageBreaks: readonly number[],
  bar: number,
  measureCount: number,
): number[] {
  if (bar <= 0 || bar >= measureCount) return [...pageBreaks];
  const set = new Set(pageBreaks);
  if (set.has(bar)) set.delete(bar);
  else set.add(bar);
  return [...set].sort((a, b) => a - b);
}

/**
 * Make `bars` into one system. The run is recorded by where it starts and how
 * long it is; any run or break that fell inside it is cleared, since those
 * would split the very system being asked for.
 */
export function withSystemRun(
  runs: ReadonlyArray<[number, number]>,
  breaks: readonly number[],
  bars: readonly number[],
): { runs: Array<[number, number]>; breaks: number[] } {
  const sorted = [...new Set(bars)].sort((a, b) => a - b);
  if (sorted.length === 0) return { runs: [...runs], breaks: [...breaks] };
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const length = end - start + 1;

  const keptRuns = runs.filter(([at]) => at <= start || at > end);
  const keptBreaks = breaks.filter((at) => at <= start || at > end);
  return {
    runs: (
      [...keptRuns.filter(([at]) => at !== start), [start, length]] as Array<
        [number, number]
      >
    ).sort((a, b) => a[0] - b[0]),
    // The run has to start a system, and the bar after it has to start the
    // next one, or the following bars would be swallowed into this system.
    breaks: [
      ...new Set([...keptBreaks, start, ...(end + 1 > start ? [end + 1] : [])]),
    ]
      .filter((at) => at > 0)
      .sort((a, b) => a - b),
  };
}

/** Whether the bars are already exactly one system. */
export function isOneSystem(
  systems: readonly PlannedSystem[],
  bars: readonly number[],
): boolean {
  const sorted = [...new Set(bars)].sort((a, b) => a - b);
  if (sorted.length === 0) return false;
  return systems.some(
    (system) =>
      system.measures.length === sorted.length &&
      system.measures.every((measure, i) => measure === sorted[i]),
  );
}
