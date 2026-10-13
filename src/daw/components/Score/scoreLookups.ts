import type { MidiNoteEvent } from '@prism/engine';
import type {
  BarlinePosition,
  NoteInfo,
} from '@/components/notation/StaffView';
import { parseNoteId, type NoteRef } from '@/daw/model/noteKeys';
import type { Track } from '@/daw/store/tracksSlice';
import {
  parseArticulation,
  parseSlur,
  type ArticulationKind,
  type TieCandidate,
} from './noteEditor';
import {
  articulationMarkKey,
  slurMarkKey,
  tieMarkKey,
  type ScoreMark,
} from './scoreMarks';

// ── Lookups over a drawn page ──────────────────────────────────────────────
// The Score's markings and its overlay ask the same questions of every note
// and barline on the page: which clip event a note is, which marks it
// carries, where else it is drawn, where its system starts. Asked by
// searching, that is a search per note over every note, and a 6-part score
// asks it hundreds of times per edit. These build the answers once, as maps,
// and answer each question exactly as the search in order did.

/**
 * Each clip event under the track, clip, tick and pitch a Score key names.
 * As a search in order would, the first track and clip of an id and the
 * first event on a tick and pitch are the ones found.
 */
export function clipEventIndex(
  tracks: readonly Track[],
): (ref: NoteRef) => MidiNoteEvent | undefined {
  const byTrack = new Map<string, Map<string, Map<string, MidiNoteEvent>>>();
  for (const track of tracks) {
    if (byTrack.has(track.id)) continue;
    const byClip = new Map<string, Map<string, MidiNoteEvent>>();
    byTrack.set(track.id, byClip);
    for (const clip of track.midiClips) {
      if (byClip.has(clip.id)) continue;
      const byNote = new Map<string, MidiNoteEvent>();
      byClip.set(clip.id, byNote);
      for (const event of clip.events) {
        const key = `${event.startTick}:${event.note}`;
        if (!byNote.has(key)) byNote.set(key, event);
      }
    }
  }
  return (ref) =>
    byTrack
      .get(ref.trackId)
      ?.get(ref.clipId)
      ?.get(`${ref.startTick}:${ref.midi}`);
}

/**
 * Every note as the tie logic sees it. The notation engine splits a long
 * note across the beat and ties the pieces, so one id can be drawn more
 * than once; the source note is the earliest piece, and its length comes
 * from the clip event rather than from any one piece.
 */
export function tieCandidatesOf(
  notes: readonly NoteInfo[],
  eventAt: (ref: NoteRef) => MidiNoteEvent | undefined,
): TieCandidate[] {
  const byId = new Map<string, TieCandidate>();
  for (const info of notes) {
    const ref = parseNoteId(info.id);
    if (!ref) continue;
    const event = eventAt(ref);
    if (!event) continue;
    const existing = byId.get(info.id);
    if (existing && existing.tick <= info.tick) continue;
    byId.set(info.id, {
      id: info.id,
      partIndex: info.partIndex,
      tick: info.tick,
      midi: event.note,
      durationTicks: event.durationTicks,
    });
  }
  return [...byId.values()];
}

/** Each note's articulations, in the order they were written. */
export function articulationIndex(
  articulations: readonly string[],
): Map<string, ArticulationKind[]> {
  const byNote = new Map<string, ArticulationKind[]>();
  for (const entry of articulations) {
    const parsed = parseArticulation(entry);
    if (!parsed) continue;
    const kinds = byNote.get(parsed.noteId);
    if (kinds) kinds.push(parsed.kind);
    else byNote.set(parsed.noteId, [parsed.kind]);
  }
  return byNote;
}

/** The drawn notes grouped by id, and by part and tick, in drawing order. */
export function noteIndex(notes: readonly NoteInfo[]) {
  const byId = new Map<string, NoteInfo[]>();
  const byBeat = new Map<string, NoteInfo[]>();
  for (const note of notes) {
    const pieces = byId.get(note.id);
    if (pieces) pieces.push(note);
    else byId.set(note.id, [note]);
    const beat = `${note.partIndex}:${note.tick}`;
    const chord = byBeat.get(beat);
    if (chord) chord.push(note);
    else byBeat.set(beat, [note]);
  }
  return { byId, byBeat };
}

export type NoteIndex = ReturnType<typeof noteIndex>;

/** Every marking on the page, as something that can be picked up. */
export function scoreMarksOf({
  chordMarks,
  notes,
  kindsOf,
  slurs,
}: {
  chordMarks: readonly { note: NoteInfo; kinds: readonly ArticulationKind[] }[];
  notes: NoteIndex;
  kindsOf: (noteId: string) => readonly ArticulationKind[];
  slurs: readonly string[];
}): ScoreMark[] {
  const out: ScoreMark[] = [];
  for (const chord of chordMarks) {
    const beat = notes.byBeat.get(`${chord.note.partIndex}:${chord.note.tick}`);
    for (const kind of chord.kinds) {
      out.push({
        key: articulationMarkKey(chord.note.id, kind),
        kind: { type: 'articulation', kind },
        partIndex: chord.note.partIndex,
        tick: chord.note.tick,
        // A chord's mark belongs to every note of it that carries the mark.
        noteIds: (beat ?? [])
          .filter((n) => kindsOf(n.id).includes(kind))
          .map((n) => n.id),
      });
    }
  }
  for (const entry of slurs) {
    const ends = parseSlur(entry);
    const from = ends ? notes.byId.get(ends.fromId)?.[0] : undefined;
    if (!ends || !from) continue;
    out.push({
      key: slurMarkKey(ends.fromId, ends.toId),
      kind: { type: 'slur' },
      partIndex: from.partIndex,
      tick: from.tick,
      noteIds: [ends.fromId, ends.toId],
    });
  }
  // A note drawn twice is one note held across a barline: that is a tie.
  for (const [id, pieces] of notes.byId) {
    if (pieces.length < 2) continue;
    const ordered = [...pieces].sort((a, b) => a.tick - b.tick);
    for (let i = 1; i < ordered.length; i++) {
      out.push({
        key: tieMarkKey(id, ordered[i].tick),
        kind: { type: 'tie' },
        partIndex: ordered[i].partIndex,
        tick: ordered[i - 1].tick,
        noteIds: [id],
        splitTick: ordered[i].tick,
      });
    }
  }
  return out;
}

/**
 * The bar each system opens with: the lowest bar any of its barlines
 * precedes, leaving out the barline closing the system.
 */
export function systemOpeningBars(
  barlines: readonly BarlinePosition[],
): Map<number, number> {
  const opening = new Map<number, number>();
  for (const barline of barlines) {
    if (barline.atSystemEnd) continue;
    const lowest = opening.get(barline.system);
    if (lowest === undefined || barline.measureIndex < lowest) {
      opening.set(barline.system, barline.measureIndex);
    }
  }
  return opening;
}

/** Items grouped by the bar they stand over, each bar's in list order. */
export function byBar<T extends { measureIdx: number }>(
  items: readonly T[],
): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const item of items) {
    const bar = out.get(item.measureIdx);
    if (bar) bar.push(item);
    else out.set(item.measureIdx, [item]);
  }
  return out;
}
