import type { MidiNoteEvent } from '@prism/engine';
import type { Track } from '@/daw/store/tracksSlice';
import type { ArticulationKind } from './noteEditor';
import { parseNoteId } from './scoreEdit';

// ── Copy and paste ─────────────────────────────────────────────────────────
// What is copied depends on what is selected: notes, the contents of whole
// measures, or a barline's roadmap marks. Notes are stored relative to the
// top-left of the copied block — the earliest tick of the highest part — so
// pasting lands them under wherever the paste starts.

export interface ClipboardNote {
  /** Parts below the block's top part. */
  partOffset: number;
  /** Ticks after the block's start. */
  tickOffset: number;
  midi: number;
  durationTicks: number;
  velocity: number;
}

export interface NoteClipboard {
  kind: 'notes';
  notes: ClipboardNote[];
  /** Ticks the block covers; a measure copy clears this much before pasting. */
  span: number;
  /** Measure copies replace what is there; loose notes are added. */
  replace: boolean;
  partCount: number;
}

export interface BarlineClipboard {
  kind: 'barline';
  repeatStart: boolean;
  repeatEnd: boolean;
  sectionLabel: string | null;
  systemBreak: boolean;
}

/** Markings copied on their own: what they are, not what they were on. */
export interface MarkClipboard {
  kind: 'marks';
  marks: Array<
    | { type: 'articulation'; kind: ArticulationKind }
    | { type: 'slur' }
    | { type: 'tie' }
  >;
}

export type ScoreClipboard = NoteClipboard | BarlineClipboard | MarkClipboard;

export interface PartTrack {
  partIndex: number;
  trackId: string;
}

interface FoundEvent {
  partIndex: number;
  tick: number;
  event: MidiNoteEvent;
}

/** Look every selected note up in its clip, keeping its length and velocity. */
function findEvents(
  tracks: Track[],
  noteIds: Iterable<string>,
  partIndexByTrack: Map<string, number>,
): FoundEvent[] {
  const found: FoundEvent[] = [];
  for (const id of noteIds) {
    const ref = parseNoteId(id);
    if (!ref) continue;
    const track = tracks.find((t) => t.id === ref.trackId);
    const clip = track?.midiClips.find((c) => c.id === ref.clipId);
    const event = clip?.events.find(
      (e) => e.startTick === ref.startTick && e.note === ref.midi,
    );
    const partIndex = partIndexByTrack.get(ref.trackId);
    if (!clip || !event || partIndex === undefined) continue;
    found.push({ partIndex, tick: clip.startTick + event.startTick, event });
  }
  return found;
}

function toClipboard(found: FoundEvent[], span: number, replace: boolean) {
  if (found.length === 0) return null;
  const topPart = Math.min(...found.map((f) => f.partIndex));
  const start = Math.min(...found.map((f) => f.tick));
  return {
    kind: 'notes' as const,
    replace,
    span:
      span ||
      Math.max(...found.map((f) => f.tick + f.event.durationTicks)) - start,
    partCount: Math.max(...found.map((f) => f.partIndex)) - topPart + 1,
    notes: found.map((f) => ({
      partOffset: f.partIndex - topPart,
      tickOffset: f.tick - start,
      midi: f.event.note,
      durationTicks: f.event.durationTicks,
      velocity: f.event.velocity,
    })),
  };
}

/** Copy loose notes; pasting adds them without clearing anything. */
export function copyNotes(
  tracks: Track[],
  noteIds: Iterable<string>,
  partIndexByTrack: Map<string, number>,
): NoteClipboard | null {
  return toClipboard(findEvents(tracks, noteIds, partIndexByTrack), 0, false);
}

/** Copy whole measures; pasting clears the destination first. */
export function copyMeasures(
  tracks: Track[],
  noteIds: Iterable<string>,
  partIndexByTrack: Map<string, number>,
  cells: Array<{ partIndex: number; measureIndex: number }>,
  measureTicks: number,
): NoteClipboard | null {
  if (cells.length === 0) return null;
  const first = Math.min(...cells.map((c) => c.measureIndex));
  const last = Math.max(...cells.map((c) => c.measureIndex));
  const span = (last - first + 1) * measureTicks;
  const found = findEvents(tracks, noteIds, partIndexByTrack);
  const topPart = Math.min(...cells.map((c) => c.partIndex));
  const partCount = Math.max(...cells.map((c) => c.partIndex)) - topPart + 1;
  // An empty measure still copies — pasting it clears the destination.
  const clipboard = toClipboard(found, span, true) ?? {
    kind: 'notes' as const,
    notes: [],
    span,
    replace: true,
    partCount,
  };
  return { ...clipboard, span, replace: true, partCount };
}

export interface ClipWrite {
  trackId: string;
  clipId: string;
  events: MidiNoteEvent[];
}

/**
 * Paste `clipboard` so its top-left lands on `target`. Returns one write per
 * touched clip, and the ids the pasted notes will have.
 */
export function pasteNotes(
  clipboard: NoteClipboard,
  target: { partIndex: number; tick: number },
  tracks: Track[],
  trackIdByPart: Map<number, string>,
): { writes: ClipWrite[]; noteIds: string[] } {
  const byClip = new Map<
    string,
    { trackId: string; clipId: string; events: MidiNoteEvent[] }
  >();
  const noteIds: string[] = [];

  const clipFor = (trackId: string, tick: number) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track || track.midiClips.length === 0) return null;
    // The clip covering the tick, else the last one starting before it, else
    // the first clip of the track.
    const covering = track.midiClips.find(
      (c) =>
        tick >= c.startTick &&
        tick <
          c.startTick +
            (c.durationTicks ??
              Math.max(
                0,
                ...c.events.map((e) => e.startTick + e.durationTicks),
              )),
    );
    const before = [...track.midiClips]
      .filter((c) => c.startTick <= tick)
      .sort((a, b) => b.startTick - a.startTick)[0];
    return covering ?? before ?? track.midiClips[0];
  };

  const touch = (trackId: string, clipId: string) => {
    const key = `${trackId}:${clipId}`;
    const existing = byClip.get(key);
    if (existing) return existing;
    const track = tracks.find((t) => t.id === trackId);
    const clip = track?.midiClips.find((c) => c.id === clipId);
    const entry = {
      trackId,
      clipId,
      events: [...(clip?.events ?? [])],
    };
    byClip.set(key, entry);
    return entry;
  };

  // A measure copy clears the destination range first.
  if (clipboard.replace) {
    for (let offset = 0; offset < clipboard.partCount; offset++) {
      const trackId = trackIdByPart.get(target.partIndex + offset);
      if (!trackId) continue;
      const clip = clipFor(trackId, target.tick);
      if (!clip) continue;
      const entry = touch(trackId, clip.id);
      const from = target.tick - clip.startTick;
      const to = from + clipboard.span;
      entry.events = entry.events.filter(
        (e) => e.startTick < from || e.startTick >= to,
      );
    }
  }

  for (const note of clipboard.notes) {
    const trackId = trackIdByPart.get(target.partIndex + note.partOffset);
    if (!trackId) continue;
    const tick = target.tick + note.tickOffset;
    const clip = clipFor(trackId, tick);
    if (!clip) continue;
    const entry = touch(trackId, clip.id);
    const startTick = Math.max(0, tick - clip.startTick);
    entry.events.push({
      note: note.midi,
      velocity: note.velocity,
      startTick,
      durationTicks: note.durationTicks,
      channel: entry.events[0]?.channel ?? 0,
    });
    noteIds.push(`${trackId}:${clip.id}:${startTick}:${note.midi}`);
  }

  return {
    writes: [...byClip.values()].map((entry) => ({
      ...entry,
      events: [...entry.events].sort((a, b) => a.startTick - b.startTick),
    })),
    noteIds,
  };
}
