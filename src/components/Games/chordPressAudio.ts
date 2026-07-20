// ── Chord Press audio ────────────────────────────────────────────────────────
// Plays through the shared Jam Room SpessaSynth using the GM "Electric Grand
// Piano" instrument. Drop-in replacement for the previous PianoContext
// `playNote(midi)` (one-shot attack + release).

import {
  initJamSynth,
  jamNoteOn,
  jamNoteOff,
  jamProgramChange,
  getLocalChannel,
} from '@/components/JamRoom/jamSoundFont';

const ELECTRIC_GRAND_PIANO_PROGRAM = 2; // GM program: "Electric Grand Piano"
const PIANO_CHANNEL = getLocalChannel();
const NOTE_DURATION_S = 0.3; // matches the previous one-shot piano duration
const VELOCITY = 102; // ≈ 0.8 on the 0–127 MIDI scale (previous value)

/** Play a single MIDI note on the Electric Grand Piano. */
export async function playGrandPianoNote(midi: number): Promise<void> {
  try {
    await initJamSynth();
    // Re-assert Electric Grand Piano every time in case another feature (e.g.
    // the Chroma game's Crystal sound) changed the program on this channel.
    jamProgramChange(PIANO_CHANNEL, ELECTRIC_GRAND_PIANO_PROGRAM);
    jamNoteOn(PIANO_CHANNEL, midi, VELOCITY);
    window.setTimeout(
      () => jamNoteOff(PIANO_CHANNEL, midi),
      NOTE_DURATION_S * 1000,
    );
  } catch (err) {
    console.error('Failed to play note:', err);
  }
}
