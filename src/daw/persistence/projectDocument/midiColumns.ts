import type { MidiNoteEvent } from '@/daw/prism-engine/types';

// ── MIDI columns ───────────────────────────────────────────────────────────
//
// Kept apart from the codec, with no imports but a type, so the demo bundles
// (demoProjects.ts, which the Studio dashboard loads) can write their clips
// without loading the codec, the registry and the store behind it.
//
// A clip's notes are five parallel arrays. startTickDeltas[0] is the
// absolute start of the first note and the rest are deltas from the note
// before. Notes are sorted by (startTick, note) on encode, so every delta is
// zero or more and long runs compress well.

export interface MidiClipEvents {
  notes: number[];
  velocities: number[];
  startTickDeltas: number[];
  durations: number[];
  channels: number[];
}

/**
 * A MIDI clip as the cloud payload and the demo bundles carry it. The local
 * draft writes DraftMidiClip, which adds columns, so this stays exactly what
 * music-atlas-api is sent until milestone 1.5's document field.
 */
export interface MidiClipColumnar {
  id: string;
  name?: string;
  startTick: number;
  events: MidiClipEvents;
}

/** Notes in (startTick, note) order; ties keep their order in the clip. */
function sortedOrder(events: readonly MidiNoteEvent[]): number[] {
  const order = events.map((_, i) => i);
  order.sort(
    (a, b) =>
      events[a].startTick - events[b].startTick ||
      events[a].note - events[b].note ||
      a - b,
  );
  return order;
}

export function encodeMidiEvents(events: MidiNoteEvent[]): MidiClipEvents {
  return encodeNoteColumns(events, false);
}

export function decodeMidiEvents(columnar: MidiClipEvents): MidiNoteEvent[] {
  const len = columnar.notes.length;
  const out = new Array<MidiNoteEvent>(len);
  let tick = 0;
  for (let i = 0; i < len; i++) {
    tick += columnar.startTickDeltas[i];
    out[i] = {
      note: columnar.notes[i],
      velocity: columnar.velocities[i],
      startTick: tick,
      durationTicks: columnar.durations[i],
      channel: columnar.channels[i],
    };
  }
  return out;
}

/** A clip's notes in the draft: the five v2 columns and, from v3, their ids. */
export interface DraftNoteColumns extends MidiClipEvents {
  /** Each note's id, in the columns' (sorted) order. */
  ids?: string[];
}

/**
 * The columns of `events`, with their ids when `withIds`. The ids are put in
 * the same sorted order as the notes, so each id stays with its own note.
 */
export function encodeNoteColumns(
  events: readonly MidiNoteEvent[],
  withIds: true,
): DraftNoteColumns;
export function encodeNoteColumns(
  events: readonly MidiNoteEvent[],
  withIds: false,
): MidiClipEvents;
export function encodeNoteColumns(
  events: readonly MidiNoteEvent[],
  withIds: boolean,
): DraftNoteColumns {
  const order = sortedOrder(events);
  const len = order.length;
  const columns: DraftNoteColumns = {
    notes: new Array<number>(len),
    velocities: new Array<number>(len),
    startTickDeltas: new Array<number>(len),
    durations: new Array<number>(len),
    channels: new Array<number>(len),
  };
  const ids = withIds ? new Array<string>(len) : null;
  let previousTick = 0;
  for (let i = 0; i < len; i++) {
    const event = events[order[i]];
    columns.notes[i] = event.note;
    columns.velocities[i] = event.velocity;
    columns.startTickDeltas[i] = event.startTick - previousTick;
    columns.durations[i] = event.durationTicks;
    columns.channels[i] = event.channel;
    if (ids) ids[i] = event.id ?? '';
    previousTick = event.startTick;
  }
  if (ids) columns.ids = ids;
  return columns;
}
