/**
 * Convert a UnisonDocument back to MIDI format for export.
 *
 * Uses the existing exportMidiFile() from MidiFileIO.ts.
 */

import { exportMidiFile } from '@/daw/midi/MidiFileIO';
import type { MidiNoteEvent, MidiSequence } from '@/daw/prism-engine/types';
import type { UnisonDocument } from '../types/schema';

/**
 * Convert a UnisonDocument into a MIDI Blob for download.
 */
export function unisonToMidi(doc: UnisonDocument): Blob {
  const sequences = new Map<number, MidiSequence>();

  for (let i = 0; i < doc.tracks.length; i++) {
    const track = doc.tracks[i];
    const channel = track.channel || i + 1;

    const events: MidiNoteEvent[] = track.events.map((ev) => ({
      note: ev.pitch,
      velocity: ev.velocity,
      startTick: ev.startTick,
      durationTicks: ev.durationTicks,
      channel: ev.channel,
    }));

    sequences.set(channel, {
      ticksPerQuarterNote: doc.metadata.ticksPerQuarterNote,
      trackName: track.name,
      events,
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
