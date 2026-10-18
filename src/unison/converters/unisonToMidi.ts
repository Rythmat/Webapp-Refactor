/**
 * Convert a UnisonDocument back to MIDI format for export.
 *
 * Uses the existing exportMidiFile() from MidiFileIO.ts.
 */

import {
  exportMidiFile,
  type MidiChannelSequence,
} from '@/daw/midi/MidiFileIO';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type { UnisonDocument } from '../types/schema';

/**
 * Convert a UnisonDocument into a MIDI Blob for download.
 *
 * Each UnisonTrack gets its own MIDI track. Two UnisonTracks with the
 * same `track.channel` would play on one channel (`exportMidiFile` used to
 * key sequences by channel and drop the second; it now takes a list). The
 * dispatcher's arranged docs use distinct channels (chords=1, bass=2,
 * melody=4, drums=10), but anything layered on top of an already-populated
 * doc can collide. We still bump the requested channel to the next free
 * 1..16 slot, so each track keeps a channel of its own where one is free.
 */
export function unisonToMidi(doc: UnisonDocument): Blob {
  const sequences: MidiChannelSequence[] = [];
  const used = new Set<number>();

  for (let i = 0; i < doc.tracks.length; i++) {
    const track = doc.tracks[i];
    let channel = track.channel || i + 1;
    while (used.has(channel) && channel < 16) channel++;
    used.add(channel);

    const events: MidiNoteEvent[] = track.events.map((ev) => ({
      note: ev.pitch,
      velocity: ev.velocity,
      startTick: ev.startTick,
      durationTicks: ev.durationTicks,
      channel: ev.channel,
    }));

    sequences.push({
      channel,
      sequence: {
        ticksPerQuarterNote: doc.metadata.ticksPerQuarterNote,
        trackName: track.name,
        events,
      },
    });
  }

  return exportMidiFile(sequences, doc.rhythm.bpm);
}

/**
 * Extract MidiNoteEvent arrays from a UnisonDocument (useful for re-importing
 * into the DAW without going through MIDI file serialization).
 */
export function unisonToEvents(
  doc: UnisonDocument,
): Map<string, MidiNoteEvent[]> {
  const result = new Map<string, MidiNoteEvent[]>();

  for (const track of doc.tracks) {
    const events: MidiNoteEvent[] = track.events.map((ev) => ({
      note: ev.pitch,
      velocity: ev.velocity,
      startTick: ev.startTick,
      durationTicks: ev.durationTicks,
      channel: ev.channel,
    }));
    result.set(track.id, events);
  }

  return result;
}
