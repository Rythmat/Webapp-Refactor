import { Midi } from '@tonejs/midi';
import {
  noteNameInKey,
  type MidiCCEvent,
  type MidiNoteEvent,
  type MidiSequence,
} from '@prism/engine';
import { parseNoteName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { keyFifthsForTonic } from '@/lib/notation/keySignature';
import { downloadFile } from '@/daw/utils/exportFiles';

/** General MIDI's drum channel, as musicians number channels (1–16). */
const GM_DRUM_CHANNEL = 10;

/** The sustain pedal's controller number. */
export const SUSTAIN_CC = 64;

/** One part of a MIDI file as read: its notes and how it was meant to sound. */
export interface MidiFilePart {
  sequence: MidiSequence;
  /** The General MIDI program (0–127) the part asked for. */
  program: number;
  /** The part plays on channel 10, General MIDI's drums. */
  percussion: boolean;
}

/** What a MIDI file holds beyond its notes, and its parts. */
export interface MidiFileContents {
  /** The tempo at the start of the file; null when the file sets none. */
  bpm: number | null;
  /** The metre at the start of the file; null when the file sets none. */
  timeSignature: [number, number] | null;
  /** The parts that have notes, in the file's order. */
  parts: MidiFilePart[];
}

/**
 * Reads a .mid file: the tempo and metre it starts with, and per part its
 * notes, its sustain-pedal (CC64) events, its program and whether it is a
 * drum part (engine-hooks-30). Parts without notes are left out. Throws on
 * a file that isn't MIDI (the reader's own error).
 */
export function readMidiFile(arrayBuffer: ArrayBuffer): MidiFileContents {
  const midi = new Midi(arrayBuffer);
  const ppq = midi.header.ppq;
  const parts: MidiFilePart[] = [];

  for (const track of midi.tracks) {
    // @tonejs/midi counts channels from 0; we count them from 1.
    const channel = track.channel + 1;
    const events: MidiNoteEvent[] = track.notes.map((note) => ({
      note: note.midi,
      velocity: Math.round(note.velocity * 127),
      startTick: Math.round(note.ticks),
      durationTicks: Math.round(note.durationTicks),
      channel,
    }));
    if (events.length === 0) continue;

    // The sustain pedal is the one controller the editor plays back from a
    // clip; the reader gives values as 0–1.
    const ccEvents: MidiCCEvent[] = (
      track.controlChanges[SUSTAIN_CC] ?? []
    ).map((cc) => ({
      tick: Math.round(cc.ticks),
      controller: SUSTAIN_CC,
      value: Math.round(cc.value * 127),
      channel,
    }));

    parts.push({
      sequence: {
        ticksPerQuarterNote: ppq,
        trackName: track.name || `Track ${parts.length + 1}`,
        events,
        ...(ccEvents.length > 0 ? { ccEvents } : {}),
      },
      program: track.instrument.number,
      percussion: track.instrument.percussion || channel === GM_DRUM_CHANNEL,
    });
  }

  const tempo = midi.header.tempos[0];
  const metre = midi.header.timeSignatures[0];
  return {
    bpm: tempo ? tempo.bpm : null,
    timeSignature:
      metre && metre.timeSignature.length >= 2
        ? [metre.timeSignature[0], metre.timeSignature[1]]
        : null,
    parts,
  };
}

/**
 * Import a .mid file and convert to an array of MidiSequence objects (one per track).
 * Uses @tonejs/midi for parsing.
 */
export function importMidiFile(arrayBuffer: ArrayBuffer): MidiSequence[] {
  return readMidiFile(arrayBuffer).parts.map(({ sequence }) => ({
    ticksPerQuarterNote: sequence.ticksPerQuarterNote,
    trackName: sequence.trackName,
    events: sequence.events,
  }));
}

/** One MIDI track of a file: its notes and the channel they play on. */
export interface MidiChannelSequence {
  /** 1–16, as musicians number them (10 is General MIDI's drums). */
  channel: number;
  sequence: MidiSequence;
  /**
   * The General MIDI program (0–127) written at the track's start, so a GM
   * player picks a sound like the track's; 0 (piano) when unset, as before.
   * Channel 10 ignores it in a GM player (it's always the kit).
   */
  program?: number;
}

/** The song's key, as the editor keeps it (rootNote 0–11, C = 0). */
export interface MidiKey {
  rootNote: number;
  mode: string;
}

/** Modes whose third is minor: a MIDI key signature can only say "minor". */
const MINOR_MODES = new Set([
  'aeolian',
  'minor',
  'dorian',
  'phrygian',
  'locrian',
  'harmonicMinor',
  'melodicMinor',
]);

/**
 * The file's key signature for the song's key, as MIDI writes it: `fifths`
 * is the signature the Score writes (a mode takes its parent major's, so D
 * dorian has none: sharps above 0, flats below), and `minor` says the mode's
 * third is minor. MIDI has only major and minor, so D dorian reads back as
 * "no sharps or flats, minor".
 */
export function midiKeySignature(key: MidiKey): {
  fifths: number;
  minor: boolean;
} {
  const tonic = parseNoteName(
    noteNameInKey(key.rootNote, key.rootNote, key.mode),
  );
  const fifths = tonic
    ? keyFifthsForTonic(tonic.letterIndex, tonic.accidental, key.mode)
    : 0;
  return {
    fifths: Math.max(-7, Math.min(7, fifths)),
    minor: MINOR_MODES.has(key.mode),
  };
}

/** A key signature meta event's first bytes: FF 59, two data bytes. */
const KEY_SIGNATURE_META = [0xff, 0x59, 0x02];

/**
 * Writes the key signature into `bytes`, a file @tonejs/midi encoded with
 * one placeholder signature ('C', at tick 0, in its first track). Its
 * encoder adds 7 to the index of the key's name in a list that already
 * starts at 7 flats, so every key it writes comes out 7 fifths sharp (C as
 * 7 sharps, D as 9, which no reader accepts); the bytes are set here
 * instead. The placeholder is the first FF 59 02 in the file: it sits
 * among the first track's opening events, after only the track's name,
 * whose text can't hold the byte FF.
 */
function writeKeySignature(
  bytes: Uint8Array,
  signature: { fifths: number; minor: boolean },
): void {
  for (let i = 0; i + 4 < bytes.length; i++) {
    if (KEY_SIGNATURE_META.every((b, j) => bytes[i + j] === b)) {
      // sf is a signed byte: flats are negative.
      bytes[i + 3] = signature.fifths & 0xff;
      bytes[i + 4] = signature.minor ? 1 : 0;
      return;
    }
  }
}

/** The resolution of the files we write (ticks per quarter). */
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
 *   Each sequence's ticks are rescaled from its ticksPerQuarterNote, and
 *   its CC events (the sustain pedal) are written with its notes.
 * @param bpm - Tempo in beats per minute, at the start of the file
 * @param timeSignature - The metre to write, [numerator, denominator]; a
 *   file without one is read as 4/4 by every other program (ia-flows-34)
 * @param key - The song's key, written as the key signature (1.11 e2);
 *   none when the song has no key
 */
export function exportMidiFile(
  tracks: readonly MidiChannelSequence[],
  bpm: number,
  timeSignature?: [number, number],
  key?: MidiKey | null,
): Blob {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  if (timeSignature) {
    midi.header.timeSignatures.push({
      ticks: 0,
      timeSignature: [timeSignature[0], timeSignature[1]],
    });
  }
  // A placeholder, set once the file is encoded (see writeKeySignature).
  if (key) {
    midi.header.keySignatures.push({ ticks: 0, key: 'C', scale: 'major' });
  }
  midi.header.update();

  for (const { channel, sequence, program } of tracks) {
    const track = midi.addTrack();
    track.name = sequence.trackName ?? '';
    // The file counts channels from 0; we count them from 1.
    track.channel = Math.min(15, Math.max(0, channel - 1));
    if (program !== undefined) {
      track.instrument.number = Math.min(127, Math.max(0, Math.round(program)));
    }
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
    for (const cc of sequence.ccEvents ?? []) {
      const value = Math.min(127, Math.max(0, Math.round(cc.value)));
      track.addCC({
        number: cc.controller,
        ticks: Math.max(0, Math.round(cc.tick * scale)),
        // Written as floor(value × 127), as velocities are.
        value: (value + 0.5) / 127,
      });
    }
  }

  const bytes = midi.toArray();
  if (key) writeKeySignature(bytes, midiKeySignature(key));
  return new Blob([bytes as BlobPart], { type: 'audio/midi' });
}

/**
 * Convenience: trigger a browser download of an exported MIDI Blob.
 */
export function downloadMidiBlob(blob: Blob, filename: string): void {
  downloadFile(blob, filename);
}
