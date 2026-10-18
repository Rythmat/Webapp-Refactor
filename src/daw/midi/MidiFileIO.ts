import { Midi } from '@tonejs/midi';
import MidiWriter from 'midi-writer-js';
import type { MidiNoteEvent, MidiSequence } from '@prism/engine';
import { downloadFile } from '@/daw/utils/exportFiles';

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

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
  /** 1–16, as midi-writer-js numbers them (10 is General MIDI's drums). */
  channel: number;
  sequence: MidiSequence;
}

/**
 * Export multiple MidiSequences as a standard .mid file Blob.
 * Uses midi-writer-js for encoding.
 *
 * @param tracks - One MIDI track each, in order. Two may share a channel:
 *   each still gets its own MIDI track (it used to be a Map keyed by
 *   channel, where the second of two tracks on one channel was lost).
 * @param bpm - Tempo in beats per minute
 * @param timeSignature - The metre to write, [numerator, denominator]; a
 *   file without one is read as 4/4 by every other program (ia-flows-34)
 */
export function exportMidiFile(
  tracks: readonly MidiChannelSequence[],
  bpm: number,
  timeSignature?: [number, number],
): Blob {
  const written: MidiWriter.Track[] = [];

  for (const { channel, sequence: seq } of tracks) {
    const track = new MidiWriter.Track();
    track.setTempo(bpm, 0);
    if (timeSignature) {
      track.setTimeSignature(timeSignature[0], timeSignature[1]);
    }
    if (seq.trackName) {
      track.addTrackName(seq.trackName);
    }

    // Sort events by start tick for correct delta-time encoding
    const sorted = [...seq.events].sort((a, b) => a.startTick - b.startTick);

    for (const event of sorted) {
      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: midiToNoteName(event.note) as 'C4',
          velocity: event.velocity,
          startTick: event.startTick,
          duration: `T${event.durationTicks}`,
          channel: channel,
        }),
      );
    }

    written.push(track);
  }

  const writer = new MidiWriter.Writer(written);
  return new Blob([writer.buildFile() as unknown as BlobPart], {
    type: 'audio/midi',
  });
}

/**
 * Convenience: trigger a browser download of an exported MIDI Blob.
 */
export function downloadMidiBlob(blob: Blob, filename: string): void {
  downloadFile(blob, filename);
}
