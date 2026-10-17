// ── Inserting and deleting bars ─────────────────────────────────────────────
// The Lead Sheet's + Measure and − Measure, as one edit to everything that
// sits on a bar: the chord lane, the roadmap (sections, repeats, rests,
// fermatas, row sizes), the Score's layout marks and text, the markers, and
// the melody's notes when the sheet shows them. They used to shift the chord
// lane alone, by a 4/4 bar whatever the metre, so in 3/4 every later chord
// slid off its downbeat and in any metre the section letters, rests and
// fermatas stayed on their old bars (leadsheet-07, prism-ui-21,
// state-reload-09).
//
// Bars are real bars of the song (timeModel.ts): a multi-bar rest stands
// for its bars, so inserting inside one makes it longer. The chart's row
// sizes are its layout, counted in chart slots (a rest is one slot, as the
// chart export writes them), so a bar inside a rest adds no slot.
//
// Pure: the slice applies the patch in one write, one undo step.

import type { AllSlices } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { isTrackLockedByRemote } from '@/daw/store/trackLock';
import type { MidiClip, Track } from '@/daw/store/tracksSlice';
import {
  barSlots,
  shiftBarIndex,
  shiftTickForBars,
  slotOfBar,
  ticksPerBar,
  timeSignatureOf,
  type TimeSignature,
} from './timeModel';

/** The bars a chart shows when it has no chords: a blank sheet. */
export const BLANK_CHART_BARS = 4;

/** The store keys a bar edit reads. */
export type MeasureEditState = Pick<
  AllSlices,
  | 'chordRegions'
  | 'leadSheetBars'
  | 'leadSheetSections'
  | 'leadSheetRepeats'
  | 'measureRestMap'
  | 'measureFermatas'
  | 'measureRowSizes'
  | 'scoreSystemBreaks'
  | 'scorePageBreaks'
  | 'scoreSystemRuns'
  | 'scoreTextMarks'
  | 'markers'
  | 'tracks'
  | 'remoteUsers'
  | 'timeSignatureNumerator'
  | 'timeSignatureDenominator'
>;

/** What a bar edit writes. */
export type MeasureEditPatch = Partial<
  Pick<
    AllSlices,
    | 'chordRegions'
    | 'leadSheetBars'
    | 'leadSheetSections'
    | 'leadSheetRepeats'
    | 'measureRestMap'
    | 'measureFermatas'
    | 'measureRowSizes'
    | 'scoreSystemBreaks'
    | 'scorePageBreaks'
    | 'scoreSystemRuns'
    | 'scoreTextMarks'
    | 'markers'
    | 'tracks'
  >
>;

/**
 * How many bars the chart has: as many as its chords reach (at least a
 * blank sheet's four), or more when bars were added past the last chord.
 */
export function chartBarCount(
  regions: readonly Pick<ChordRegion, 'endTick'>[],
  leadSheetBars: number | null,
  ts: TimeSignature,
): number {
  let end = 0;
  for (const r of regions) end = Math.max(end, r.endTick);
  return Math.max(
    BLANK_CHART_BARS,
    Math.ceil(end / ticksPerBar(ts)),
    leadSheetBars ?? 0,
  );
}

/**
 * The bars [first, last] (inclusive) of a span after the edit, or null when
 * the edit deleted all of it. An insert inside the span makes it longer.
 */
function shiftBarSpan(
  first: number,
  last: number,
  at: number,
  count: number,
): [number, number] | null {
  if (count >= 0) {
    return [
      first >= at ? first + count : first,
      last >= at ? last + count : last,
    ];
  }
  const end = at - count; // first bar after the deleted ones
  const from = first < at ? first : first < end ? at : first + count;
  const to = last < at ? last : last < end ? at - 1 : last + count;
  return to < from ? null : [from, to];
}

/** `indices` after the edit, the deleted ones gone; the same array if unmoved. */
function shiftIndices(
  indices: readonly number[],
  at: number,
  count: number,
): number[] {
  const out: number[] = [];
  for (const i of indices) {
    const next = shiftBarIndex(i, at, count);
    if (next !== null) out.push(next);
  }
  return out;
}

/** A note's song span moved for the edit; null when it is deleted. */
function shiftNote(
  start: number,
  end: number,
  from: number,
  removedEnd: number,
  delta: number,
): [number, number] | null {
  if (delta >= 0) {
    if (start >= from) return [start + delta, end + delta];
    return [start, end];
  }
  if (start >= removedEnd) return [start + delta, end + delta];
  if (start >= from) return null;
  // Starts before the deleted bars: it now ends where they began, at most.
  return [start, Math.min(end, from)];
}

/** A melody clip after the edit (song ticks from..removedEnd), or null. */
function shiftMelodyClip(
  clip: MidiClip,
  from: number,
  removedEnd: number,
  delta: number,
): MidiClip | null {
  const events: MidiClip['events'] = [];
  // Notes stay where the edit leaves them in song time; the clip keeps its
  // start unless the edit moved or removed what was before its first tick.
  const clipStart =
    delta >= 0
      ? clip.startTick >= from
        ? clip.startTick + delta
        : clip.startTick
      : clip.startTick >= removedEnd
        ? clip.startTick + delta
        : Math.min(clip.startTick, from);
  for (const e of clip.events) {
    const start = clip.startTick + e.startTick;
    const moved = shiftNote(
      start,
      start + e.durationTicks,
      from,
      removedEnd,
      delta,
    );
    if (!moved || moved[1] <= moved[0]) continue;
    events.push({
      ...e,
      startTick: moved[0] - clipStart,
      durationTicks: moved[1] - moved[0],
    });
  }
  const clipEnd = clip.startTick + (clip.durationTicks ?? 0);
  let durationTicks = clip.durationTicks;
  if (durationTicks !== undefined) {
    const movedEnd =
      delta >= 0
        ? clipEnd > from
          ? clipEnd + delta
          : clipEnd
        : clipEnd >= removedEnd
          ? clipEnd + delta
          : Math.min(clipEnd, from);
    durationTicks = Math.max(0, movedEnd - clipStart);
  }
  const removedWhole =
    delta < 0 &&
    clip.startTick >= from &&
    clipEnd <= removedEnd &&
    events.length === 0;
  if (removedWhole) return null;
  return {
    ...clip,
    startTick: clipStart,
    ...(durationTicks !== undefined ? { durationTicks } : {}),
    events,
    ccEvents: clip.ccEvents
      ?.map((c) => {
        const song = clip.startTick + c.tick;
        if (delta >= 0)
          return {
            ...c,
            tick: (song >= from ? song + delta : song) - clipStart,
          };
        if (song >= from && song < removedEnd) return null;
        return {
          ...c,
          tick: (song >= removedEnd ? song + delta : song) - clipStart,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null && c.tick >= 0),
  };
}

/** The chart's row sizes (in slots) after the edit, or null when unset. */
function shiftRowSizes(
  rowSizes: readonly number[] | null,
  restMap: Readonly<Record<number, number>> | null,
  barCount: number,
  at: number,
  count: number,
): number[] | null {
  if (!rowSizes || rowSizes.length === 0) return rowSizes ? [] : null;
  const slots = barSlots(barCount, restMap);
  const sizes = [...rowSizes];
  /** The row holding slot `pos`; past the rows, the last one. */
  const rowOf = (pos: number): number => {
    let end = 0;
    for (let r = 0; r < sizes.length; r++) {
      end += sizes[r];
      if (pos < end) return r;
    }
    return sizes.length - 1;
  };
  if (count > 0) {
    const pos = at >= barCount ? slots.length : slotOfBar(slots, at);
    const inRest = pos >= 0 && pos < slots.length && slots[pos].realIndex < at;
    if (!inRest) sizes[rowOf(Math.max(0, pos))] += count;
  } else {
    const end = at - count;
    // A slot goes when the bar it starts at is deleted (a rest that starts
    // before the deleted bars only gets shorter).
    for (let pos = slots.length - 1; pos >= 0; pos--) {
      const s = slots[pos];
      if (s.realIndex >= at && s.realIndex < end) sizes[rowOf(pos)] -= 1;
    }
  }
  return sizes.filter((size) => size > 0);
}

/**
 * The patch that inserts `count` bars before bar `at` (count > 0) or
 * deletes bars [at, at − count) (count < 0). `melodyTrackIds` are the
 * melody tracks the sheet shows (one id, or several, a staff each), whose
 * notes move with the bars; a track a collaborator holds is left alone,
 * like every edit to it. Null when there is nothing to do (no bars, or a
 * delete past the end).
 */
export function measureEditPatch(
  state: MeasureEditState,
  at: number,
  count: number,
  melodyTrackIds?: string | readonly string[] | null,
): MeasureEditPatch | null {
  const ts = timeSignatureOf(state);
  const bar = ticksPerBar(ts);
  const barCount = chartBarCount(state.chordRegions, state.leadSheetBars, ts);
  if (count === 0 || at < 0) return null;
  if (count < 0) {
    if (at >= barCount) return null;
    // Never delete past the end, nor the last bar.
    count = Math.max(count, -(barCount - at), -(barCount - 1));
    if (count === 0) return null;
  } else {
    at = Math.min(at, barCount);
  }
  const from = at * bar;
  const delta = count * bar;
  const removedEnd = count < 0 ? from - delta : from;
  const tick = (t: number) => shiftTickForBars(t, at, count, ts);
  // A region that ends right where bars go in stays as long as it was.
  const endTick = (t: number) => (count > 0 && t === from ? t : tick(t));

  const chordRegions = state.chordRegions
    .map((r) => {
      const startTick = tick(r.startTick);
      const next: ChordRegion = {
        ...r,
        startTick,
        endTick: endTick(r.endTick),
      };
      if (r.rawStartTick !== undefined) {
        next.rawStartTick = r.rawStartTick + (startTick - r.startTick);
      }
      return next;
    })
    .filter((r) => r.startTick < r.endTick);

  const restMap: Record<number, number> = {};
  for (const [key, bars] of Object.entries(state.measureRestMap ?? {})) {
    const first = Number(key);
    const span = shiftBarSpan(first, first + bars - 1, at, count);
    if (span) restMap[span[0]] = span[1] - span[0] + 1;
  }

  const patch: MeasureEditPatch = {
    chordRegions,
    leadSheetBars: barCount + count,
    leadSheetSections: state.leadSheetSections.flatMap((s) => {
      const measureIdx = shiftBarIndex(s.measureIdx, at, count);
      return measureIdx === null ? [] : [{ ...s, measureIdx }];
    }),
    leadSheetRepeats: state.leadSheetRepeats.flatMap((r) => {
      const span = shiftBarSpan(r.startMeasure, r.endMeasure, at, count);
      return span ? [{ startMeasure: span[0], endMeasure: span[1] }] : [];
    }),
    measureRestMap: state.measureRestMap ? restMap : null,
    measureFermatas: state.measureFermatas
      ? shiftIndices(state.measureFermatas, at, count)
      : null,
    measureRowSizes: shiftRowSizes(
      state.measureRowSizes,
      state.measureRestMap,
      barCount,
      at,
      count,
    ),
    scoreSystemBreaks: shiftIndices(state.scoreSystemBreaks, at, count),
    scorePageBreaks: shiftIndices(state.scorePageBreaks, at, count),
    scoreSystemRuns: state.scoreSystemRuns.flatMap(([start, bars]) => {
      const span = shiftBarSpan(start, start + bars - 1, at, count);
      return span ? [[span[0], span[1] - span[0] + 1] as [number, number]] : [];
    }),
    scoreTextMarks: state.scoreTextMarks.flatMap((m) => {
      const measureIdx = shiftBarIndex(m.measureIdx, at, count);
      return measureIdx === null ? [] : [{ ...m, measureIdx }];
    }),
    markers: state.markers.map((m) => ({ ...m, tick: tick(m.tick) })),
  };

  const melodyIds = new Set(
    typeof melodyTrackIds === 'string' ? [melodyTrackIds] : melodyTrackIds,
  );
  const moves = (t: Track) =>
    melodyIds.has(t.id) && !isTrackLockedByRemote(state.remoteUsers, t.id);
  if (state.tracks.some(moves)) {
    patch.tracks = state.tracks.map((t) =>
      moves(t)
        ? {
            ...t,
            midiClips: t.midiClips.flatMap((c) => {
              const moved = shiftMelodyClip(c, from, removedEnd, delta);
              return moved ? [moved] : [];
            }),
          }
        : t,
    );
  }
  return patch;
}
