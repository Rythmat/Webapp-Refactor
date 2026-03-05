import { Midi } from '@tonejs/midi';
import MidiWriter from 'midi-writer-js';
import type { MidiNoteEvent, MidiSequence } from '@prism/engine';

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

/**
 * Export multiple MidiSequences as a standard .mid file Blob.
 * Uses midi-writer-js for encoding.
 *
 * @param sequences - Map from channel number to MidiSequence
 * @param bpm - Tempo in beats per minute
 */
export function exportMidiFile(
  sequences: Map<number, MidiSequence>,
  bpm: number,
): Blob {
  const tracks: MidiWriter.Track[] = [];

  for (const [channel, seq] of sequences) {
    const track = new MidiWriter.Track();
    track.setTempo(bpm, 0);
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

    tracks.push(track);
  }

  const writer = new MidiWriter.Writer(tracks);
  return new Blob([writer.buildFile() as unknown as BlobPart], {
    type: 'audio/midi',
  });
}

/**
 * Convenience: trigger a browser download of an exported MIDI Blob.
 */
export function downloadMidiBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
