import { Midi } from '@tonejs/midi';
import type { MidiNoteEvent, MidiSequence } from '@prism/engine';
import { downloadFile } from '@/daw/utils/exportFiles';

/**
 * Import a .mid file and convert to an array of MidiSequence objects (one per track).
 * Uses @tonejs/midi for parsing.
 */
export function importMidiFile(arrayBuffer: ArrayBuffer): MidiSequence[] {
  const midi = new Midi(arrayBuffer);
  const sequences: MidiSequence[] = [];

  for (const track of midi.tracks) {
    const events: MidiNoteEvent[] = track.notes.map((note) => ({
      note: note.midi,
      velocity: Math.round(note.velocity * 127),
      startTick: Math.round(note.ticks),
      durationTicks: Math.round(note.durationTicks),
      channel: track.channel + 1, // @tonejs/midi uses 0-indexed channels; we use 1-indexed
    }));

    if (events.length > 0) {
      sequences.push({
        ticksPerQuarterNote: midi.header.ppq,
        trackName: track.name || `Track ${sequences.length + 1}`,
        events,
      });
    }
  }

  return sequences;
}

/** One MIDI track of a file: its notes and the channel they play on. */
export interface MidiChannelSequence {
  /** 1–16, as musicians number them (10 is General MIDI's drums). */
  channel: number;
  sequence: MidiSequence;
}

/** The file's resolution, which is also the editor's (ticks per quarter). */
export const MIDI_FILE_PPQ = 480;

/**
 * Export multiple MidiSequences as a standard .mid file Blob, written with
 * @tonejs/midi at 480 ticks per quarter (milestone 2.15). The writer used
 * before (midi-writer-js) stamped its own 128 ppq on ticks counted at 480,
 * so every file played 3.75 times too slow, and it read velocities as
 * 1–100 (64 came out as 81).
 *
 * @param tracks - One MIDI track each, in order. Two may share a channel:
 *   each still gets its own MIDI track (it used to be a Map keyed by
 *   channel, where the second of two tracks on one channel was lost).
 *   Each sequence's ticks are rescaled from its ticksPerQuarterNote.
 * @param bpm - Tempo in beats per minute, at the start of the file
 * @param timeSignature - The metre to write, [numerator, denominator]; a
 *   file without one is read as 4/4 by every other program (ia-flows-34)
 */
export function exportMidiFile(
  tracks: readonly MidiChannelSequence[],
  bpm: number,
  timeSignature?: [number, number],
): Blob {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  if (timeSignature) {
    midi.header.timeSignatures.push({
      ticks: 0,
      timeSignature: [timeSignature[0], timeSignature[1]],
    });
  }
  midi.header.update();

  for (const { channel, sequence } of tracks) {
    const track = midi.addTrack();
    track.name = sequence.trackName ?? '';
    // The file counts channels from 0; we count them from 1.
    track.channel = Math.min(15, Math.max(0, channel - 1));
    const scale =
      MIDI_FILE_PPQ / (sequence.ticksPerQuarterNote || MIDI_FILE_PPQ);
    for (const event of sequence.events) {
      const velocity = Math.min(127, Math.max(1, Math.round(event.velocity)));
      track.addNote({
        midi: event.note,
        ticks: Math.max(0, Math.round(event.startTick * scale)),
        durationTicks: Math.max(0, Math.round(event.durationTicks * scale)),
        // The encoder writes floor(velocity × 127); the half step keeps
        // floating-point error from writing 63 for 64.
        velocity: (velocity + 0.5) / 127,
      });
    }
  }

  return new Blob([midi.toArray() as BlobPart], { type: 'audio/midi' });
}

/**
 * Convenience: trigger a browser download of an exported MIDI Blob.
 */
export function downloadMidiBlob(blob: Blob, filename: string): void {
  downloadFile(blob, filename);
}
