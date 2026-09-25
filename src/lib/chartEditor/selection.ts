/**
 * What is selected in a chart, and what a click does to it.
 *
 * Pure: a selection is a value, and every gesture is a function from one
 * selection to the next. Nothing here knows about the DOM, so the same model
 * serves the back-office editor and the Studio.
 *
 * Bars are addressed by section and index, but ranged over **globally** — a
 * shift-click from the last bar of the verse to the second bar of the chorus
 * selects the bars between them, because that is the phrase the player sees.
 * Sections are a way of writing a chart down, not a wall.
 */

export interface BarRef {
  section: number;
  bar: number;
}

export interface ChordRef extends BarRef {
  chord: number;
}

export type ChartSelection =
  | { kind: 'none' }
  | { kind: 'bars'; anchor: BarRef; refs: BarRef[] }
  | { kind: 'chords'; anchor: ChordRef; refs: ChordRef[] };

export const NO_SELECTION: ChartSelection = { kind: 'none' };

/** Which modifier the click carried. */
export interface ClickMods {
  /** Extend from the anchor to here. */
  shift?: boolean;
  /** Add or remove this one, leaving the rest. */
  toggle?: boolean;
}

/** The shape this module needs of a song: sections of bars of chords. */
export interface ChartLike {
  sections: readonly { bars: readonly { chords: readonly unknown[] }[] }[];
}

export const sameBar = (a: BarRef, b: BarRef): boolean =>
  a.section === b.section && a.bar === b.bar;

export const sameChord = (a: ChordRef, b: ChordRef): boolean =>
  sameBar(a, b) && a.chord === b.chord;

/** Every bar in reading order, so a range can cross sections. */
export function chartBars(chart: ChartLike): BarRef[] {
  const refs: BarRef[] = [];
  chart.sections.forEach((section, si) =>
    section.bars.forEach((_, bi) => refs.push({ section: si, bar: bi })),
  );
  return refs;
}

/** Every chord in reading order. */
export function chartChords(chart: ChartLike): ChordRef[] {
  const refs: ChordRef[] = [];
  chart.sections.forEach((section, si) =>
    section.bars.forEach((bar, bi) =>
      bar.chords.forEach((_, ci) =>
        refs.push({ section: si, bar: bi, chord: ci }),
      ),
    ),
  );
  return refs;
}

const indexOfBar = (order: BarRef[], ref: BarRef) =>
  order.findIndex((r) => sameBar(r, ref));

const indexOfChord = (order: ChordRef[], ref: ChordRef) =>
  order.findIndex((r) => sameChord(r, ref));

/** The run between two points, whichever way round they were clicked. */
function between<T>(order: T[], a: number, b: number): T[] {
  if (a < 0 || b < 0) return [];
  const [from, to] = a <= b ? [a, b] : [b, a];
  return order.slice(from, to + 1);
}

/**
 * Click a bar.
 *
 * Plain click replaces the selection and moves the anchor. Shift extends from
 * the anchor without moving it, so a run can be widened and narrowed. Toggle
 * adds or removes one bar; removing the anchor leaves the anchor where it was,
 * so a later shift-click still means what the player expects.
 */
export function clickBar(
  chart: ChartLike,
  selection: ChartSelection,
  ref: BarRef,
  mods: ClickMods = {},
): ChartSelection {
  const order = chartBars(chart);
  if (indexOfBar(order, ref) < 0) return selection;

  if (selection.kind !== 'bars' || (!mods.shift && !mods.toggle))
    return { kind: 'bars', anchor: ref, refs: [ref] };

  if (mods.shift) {
    const refs = between(
      order,
      indexOfBar(order, selection.anchor),
      indexOfBar(order, ref),
    );
    return refs.length
      ? { kind: 'bars', anchor: selection.anchor, refs }
      : selection;
  }

  const has = selection.refs.some((r) => sameBar(r, ref));
  const refs = has
    ? selection.refs.filter((r) => !sameBar(r, ref))
    : [...selection.refs, ref].sort(
        (a, b) => indexOfBar(order, a) - indexOfBar(order, b),
      );
  return refs.length
    ? { kind: 'bars', anchor: selection.anchor, refs }
    : NO_SELECTION;
}

/** Click a chord. The same three gestures, over chords instead of bars. */
export function clickChord(
  chart: ChartLike,
  selection: ChartSelection,
  ref: ChordRef,
  mods: ClickMods = {},
): ChartSelection {
  const order = chartChords(chart);
  if (indexOfChord(order, ref) < 0) return selection;

  if (selection.kind !== 'chords' || (!mods.shift && !mods.toggle))
    return { kind: 'chords', anchor: ref, refs: [ref] };

  if (mods.shift) {
    const refs = between(
      order,
      indexOfChord(order, selection.anchor),
      indexOfChord(order, ref),
    );
    return refs.length
      ? { kind: 'chords', anchor: selection.anchor, refs }
      : selection;
  }

  const has = selection.refs.some((r) => sameChord(r, ref));
  const refs = has
    ? selection.refs.filter((r) => !sameChord(r, ref))
    : [...selection.refs, ref].sort(
        (a, b) => indexOfChord(order, a) - indexOfChord(order, b),
      );
  return refs.length
    ? { kind: 'chords', anchor: selection.anchor, refs }
    : NO_SELECTION;
}

export const isBarSelected = (
  selection: ChartSelection,
  ref: BarRef,
): boolean =>
  selection.kind === 'bars' && selection.refs.some((r) => sameBar(r, ref));

export const isChordSelected = (
  selection: ChartSelection,
  ref: ChordRef,
): boolean =>
  selection.kind === 'chords' && selection.refs.some((r) => sameChord(r, ref));

export const selectionSize = (selection: ChartSelection): number =>
  selection.kind === 'none' ? 0 : selection.refs.length;

/** Select everything of the kind already selected; bars if nothing is. */
export function selectAll(
  chart: ChartLike,
  selection: ChartSelection,
): ChartSelection {
  if (selection.kind === 'chords') {
    const refs = chartChords(chart);
    return refs.length
      ? { kind: 'chords', anchor: refs[0], refs }
      : NO_SELECTION;
  }
  const refs = chartBars(chart);
  return refs.length ? { kind: 'bars', anchor: refs[0], refs } : NO_SELECTION;
}

/**
 * Bring a selection back into range after the chart has changed under it.
 *
 * Deleting bars while three are selected must not leave the editor pointing at
 * bars that are not there — every later operation would read `undefined`.
 */
export function clampSelection(
  chart: ChartLike,
  selection: ChartSelection,
): ChartSelection {
  if (selection.kind === 'none') return selection;
  const exists = (r: BarRef) => !!chart.sections[r.section]?.bars[r.bar];

  if (selection.kind === 'bars') {
    const refs = selection.refs.filter(exists);
    if (refs.length === 0) return NO_SELECTION;
    return {
      kind: 'bars',
      anchor: exists(selection.anchor) ? selection.anchor : refs[0],
      refs,
    };
  }

  const chordExists = (r: ChordRef) =>
    !!chart.sections[r.section]?.bars[r.bar]?.chords[r.chord];
  const refs = selection.refs.filter(chordExists);
  if (refs.length === 0) return NO_SELECTION;
  return {
    kind: 'chords',
    anchor: chordExists(selection.anchor) ? selection.anchor : refs[0],
    refs,
  };
}
