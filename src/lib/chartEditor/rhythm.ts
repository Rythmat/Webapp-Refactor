import type {
  ChordBar,
  NoteValue,
  RhythmEvent,
  SongSection,
} from '@/curriculum/types/songLibrary';

/**
 * A bar's rhythm in slashes (owner, 2026-11-12): hits, pushes, stops and
 * ties, as a chart writes them, and the edits the Score's Rhythmic palette
 * makes to them.
 *
 * Pure values, like the rest of lib/chartEditor. Positions are counted in
 * quarter notes; a chord's `beat` counts the metre's own beat (an eighth in
 * 6/8), so `beatAt` converts. A bar with no `rhythm` is one plain slash a
 * beat, and its first edit writes that out before changing it.
 */

export type Meter = readonly [number, number];

const EPS = 1e-6;

/** Quarter notes in an undotted value. */
export const VALUE_QUARTERS: Record<NoteValue, number> = {
  '1': 4,
  '2': 2,
  '4': 1,
  '8': 0.5,
  '16': 0.25,
  '32': 0.125,
};

/** Longest first, for filling a span. */
const LONGEST_FIRST: NoteValue[] = ['1', '2', '4', '8', '16', '32'];

/** The value a palette's length is, from its quarters (the Score's DURATIONS). */
export const valueOfQuarters = (quarters: number): NoteValue | null =>
  LONGEST_FIRST.find((v) => Math.abs(VALUE_QUARTERS[v] - quarters) < EPS) ??
  null;

export const eventQuarters = (event: RhythmEvent): number =>
  VALUE_QUARTERS[event.value] * (event.dot ? 1.5 : 1);

/** Quarter notes in a bar of this metre. */
export const barQuarters = ([beats, unit]: Meter): number => (beats * 4) / unit;

/** The value of one beat: what a standard slash lasts (a quarter in 4/4,
 *  an eighth in 6/8). Null for a metre no value can count. */
export const beatValue = (meter: Meter): NoteValue | null => {
  const unit = String(meter[1]) as NoteValue;
  return unit in VALUE_QUARTERS ? unit : null;
};

/** One standard slash a beat: what a bar with no rhythm of its own is. */
export function defaultRhythm(meter: Meter): RhythmEvent[] {
  const unit = beatValue(meter);
  if (unit)
    return Array.from({ length: meter[0] }, () => ({
      value: unit,
      plain: true,
    }));
  return fill(barQuarters(meter), '4').map((e) => ({ ...e, plain: true }));
}

/** A bar's rhythm, written out: its own, or a slash a beat. */
export const rhythmOf = (bar: ChordBar, meter: Meter): RhythmEvent[] =>
  bar.rhythm && bar.rhythm.length > 0 ? bar.rhythm : defaultRhythm(meter);

/** Where each event starts, in quarters from the barline. */
export function eventStarts(events: readonly RhythmEvent[]): number[] {
  const starts: number[] = [];
  let at = 0;
  for (const event of events) {
    starts.push(at);
    at += eventQuarters(event);
  }
  return starts;
}

/** The chord beat (1-based, in the metre's beats) a quarter position is. */
export const beatAt = (quarters: number, meter: Meter): number =>
  1 + (quarters * meter[1]) / 4;

/** The quarter position a chord beat is. */
export const quartersAt = (beat: number, meter: Meter): number =>
  ((beat - 1) * 4) / meter[1];

/**
 * A span filled with slashes: `first` as often as it fits, then the
 * longest values that do. An eighth's worth after a dotted quarter is an
 * eighth; a quarter shortened to an eighth leaves an eighth beside it.
 */
function fill(span: number, first: NoteValue): RhythmEvent[] {
  const out: RhythmEvent[] = [];
  let left = span;
  const firstQ = VALUE_QUARTERS[first];
  while (left + EPS >= firstQ && firstQ > 0) {
    out.push({ value: first });
    left -= firstQ;
  }
  for (const value of LONGEST_FIRST) {
    while (left + EPS >= VALUE_QUARTERS[value]) {
      out.push({ value });
      left -= VALUE_QUARTERS[value];
    }
  }
  return out;
}

/**
 * Give the event at `index` a new length, as MuseScore does a selected note:
 * longer takes the time from the events after it, shorter leaves its
 * remainder as slashes. It never runs past the barline: a length that
 * would is cut to the longest value that fits.
 */
export function setEventLength(
  events: readonly RhythmEvent[],
  index: number,
  value: NoteValue,
  dot: boolean,
  meter: Meter,
): RhythmEvent[] {
  const target = events[index];
  if (!target) return [...events];
  const total = barQuarters(meter);
  const starts = eventStarts(events);
  const from = starts[index];
  let length = VALUE_QUARTERS[value] * (dot ? 1.5 : 1);
  let chosen: NoteValue = value;
  let dotted = dot;
  if (from + length > total + EPS) {
    const room = total - from;
    const fits = LONGEST_FIRST.find((v) => VALUE_QUARTERS[v] <= room + EPS);
    if (!fits) return [...events];
    chosen = fits;
    dotted = false;
    length = VALUE_QUARTERS[fits];
  }
  const end = from + length;
  // A length is rhythm notation: a standard slash given one stops being one.
  const edited: RhythmEvent = { ...target, value: chosen };
  delete edited.plain;
  if (dotted) edited.dot = true;
  else delete edited.dot;

  const after: RhythmEvent[] = [];
  // What the old event left over, when it got shorter.
  const oldEnd = from + eventQuarters(target);
  if (oldEnd > end + EPS) after.push(...fill(oldEnd - end, chosen));
  for (let i = index + 1; i < events.length; i++) {
    const s = starts[i];
    const e = s + eventQuarters(events[i]);
    if (s + EPS >= end) after.push(events[i]);
    else if (e > end + EPS) {
      // Straddles the new end: its tail is kept, its tie with it.
      const tail = fill(e - end, events[i].value);
      if (events[i].tie && tail.length) tail[tail.length - 1].tie = true;
      after.push(...tail);
    }
  }
  return [...events.slice(0, index), edited, ...after];
}

/** A slash becomes a rest of its length, or back. A rest ties nothing. */
export function toggleRest(
  events: readonly RhythmEvent[],
  index: number,
): RhythmEvent[] {
  return events.map((event, i) => {
    if (i !== index) return event;
    const next: RhythmEvent = { ...event };
    if (next.rest) delete next.rest;
    else {
      next.rest = true;
      delete next.tie;
    }
    return next;
  });
}

/** Tie a slash to the one after it (across the barline from a bar's last). */
export function toggleTie(
  events: readonly RhythmEvent[],
  index: number,
): RhythmEvent[] {
  return events.map((event, i) => {
    if (i !== index || event.rest) return event;
    const next: RhythmEvent = { ...event };
    if (next.tie) delete next.tie;
    else next.tie = true;
    return next;
  });
}

/** The dot on or off, the time it takes or gives taken from what follows. */
export const toggleDot = (
  events: readonly RhythmEvent[],
  index: number,
  meter: Meter,
): RhythmEvent[] =>
  events[index]
    ? setEventLength(
        events,
        index,
        events[index].value,
        !events[index].dot,
        meter,
      )
    : [...events];

const isPlain = (events: readonly RhythmEvent[], meter: Meter) => {
  const plain = defaultRhythm(meter);
  return (
    events.length === plain.length &&
    events.every(
      (e, i) =>
        e.plain &&
        e.value === plain[i].value &&
        !e.dot &&
        !e.rest &&
        !e.tie &&
        !e.stem,
    )
  );
};

/**
 * A beat as a standard slash, or back to rhythm notation (owner,
 * 2026-11-12): beats 1–3 can stay slashes while beat 4 is two eighths.
 * A standard slash becomes a slash of its value with a stem. Rhythm
 * becomes standard slashes over the whole beats it covers: two eighths on
 * 4 are one slash on 4; a dotted quarter across 1 and 2 is two.
 */
export function togglePlain(
  events: readonly RhythmEvent[],
  index: number,
  meter: Meter,
): RhythmEvent[] {
  const event = events[index];
  if (!event) return [...events];
  if (event.plain)
    return events.map((e, i) => {
      if (i !== index) return e;
      const next = { ...e };
      delete next.plain;
      return next;
    });
  const unit = beatValue(meter);
  if (!unit) return [...events];
  const beat = VALUE_QUARTERS[unit];
  const starts = eventStarts(events);
  const ends = events.map((e, i) => starts[i] + eventQuarters(e));
  let from = Math.floor((starts[index] + EPS) / beat) * beat;
  let to = Math.ceil((ends[index] - EPS) / beat) * beat;
  // Widen to whole events: one straddling the edge comes in, whole beats
  // and all.
  for (let grew = true; grew; ) {
    grew = false;
    events.forEach((_, i) => {
      const inside = starts[i] < to - EPS && ends[i] > from + EPS;
      if (!inside) return;
      if (starts[i] < from - EPS) {
        from = Math.floor((starts[i] + EPS) / beat) * beat;
        grew = true;
      }
      if (ends[i] > to + EPS) {
        to = Math.ceil((ends[i] - EPS) / beat) * beat;
        grew = true;
      }
    });
  }
  const covered = events
    .map((_, i) => i)
    .filter((i) => starts[i] < to - EPS && ends[i] > from + EPS);
  const first = covered[0];
  const last = covered[covered.length - 1];
  const slashes: RhythmEvent[] = Array.from(
    { length: Math.round((to - from) / beat) },
    () => ({ value: unit, plain: true }),
  );
  // A tie out of the last of them still ties.
  if (events[last]?.tie && slashes.length)
    slashes[slashes.length - 1].tie = true;
  return [...events.slice(0, first), ...slashes, ...events.slice(last + 1)];
}

/**
 * Flip a slash's stem, down or back up, and its whole beamed group with it,
 * so a group never splits. A standard slash has no stem to flip.
 */
export function toggleStem(
  events: readonly RhythmEvent[],
  index: number,
  meter: Meter,
): RhythmEvent[] {
  const event = events[index];
  if (!event || event.plain) return [...events];
  const group = beamGroups(events, meter).find((g) => g.includes(index)) ?? [
    index,
  ];
  const down = event.stem !== 'down';
  return events.map((e, i) => {
    if (!group.includes(i)) return e;
    const next = { ...e };
    if (down) next.stem = 'down';
    else delete next.stem;
    return next;
  });
}

/**
 * Write a rhythm onto a bar: a slash a beat is the bar's own default, so
 * it is stored as nothing, and a chart that was never given a rhythm
 * stays the size it was.
 */
export function withRhythm(
  bar: ChordBar,
  events: readonly RhythmEvent[],
  meter: Meter,
): ChordBar {
  const next: ChordBar = { ...bar };
  if (events.length === 0 || isPlain(events, meter)) delete next.rhythm;
  else next.rhythm = events.map((e) => ({ ...e }));
  return next;
}

/** One bar's rhythm edited in place, in a chart's sections. */
export function editBarRhythm(
  sections: readonly SongSection[],
  sectionIdx: number,
  barIdx: number,
  meter: Meter,
  edit: (events: RhythmEvent[]) => RhythmEvent[],
): SongSection[] {
  return sections.map((section, si) =>
    si !== sectionIdx
      ? section
      : {
          ...section,
          bars: section.bars.map((bar, bi) =>
            bi !== barIdx
              ? bar
              : withRhythm(bar, edit(rhythmOf(bar, meter)), meter),
          ),
        },
  );
}

/**
 * Which slashes are beamed together: eighths and shorter, side by side
 * within one beat (a dotted quarter in 3/8, 6/8, 9/8 and 12/8). Each group
 * is the events' indexes; a lone eighth keeps its flag.
 */
export function beamGroups(
  events: readonly RhythmEvent[],
  meter: Meter,
): number[][] {
  // A dotted quarter in 3/8, 6/8, 9/8 and 12/8; a quarter everywhere else.
  const beat = meter[1] === 8 && meter[0] % 3 === 0 ? 1.5 : 1;
  const starts = eventStarts(events);
  const groups: number[][] = [];
  let current: number[] = [];
  let currentBeat = -1;
  events.forEach((event, i) => {
    const short =
      !event.rest && !event.plain && VALUE_QUARTERS[event.value] <= 0.5;
    const b = Math.floor((starts[i] + EPS) / beat);
    const ends = starts[i] + eventQuarters(event);
    const crosses = Math.floor((ends - EPS) / beat) !== b;
    if (!short || crosses) {
      if (current.length > 1) groups.push(current);
      current = [];
      currentBeat = -1;
      return;
    }
    if (b !== currentBeat) {
      if (current.length > 1) groups.push(current);
      current = [];
      currentBeat = b;
    }
    current.push(i);
  });
  if (current.length > 1) groups.push(current);
  return groups;
}

/**
 * How long a chord added on this slash lasts, in the metre's beats: up to
 * the next chord in the bar, or the barline.
 */
export function chordLengthFrom(
  bar: ChordBar,
  beat: number,
  meter: Meter,
): number {
  const next = bar.chords
    .map((c) => c.beat)
    .filter((b) => b > beat + EPS)
    .sort((a, b) => a - b)[0];
  return (next ?? meter[0] + 1) - beat;
}
