// ── Jam SoundFont (compatibility layer) ──────────────────────────────────────
// This module used to own a SpessaSynth instance, an AudioContext, a master
// gain and a channel allocator. All of that now lives in the shared engine's
// SoundFontInstrument — one GM voice for the whole application.
//
// The exported API is unchanged so the five features built on it (Jam Room,
// Chroma, Constellations, Chord Press, Major Arcanum) migrated in one step
// without touching a single call site. What remains here is the Jam Room's
// channel *policy* — which participant gets which channel — which is domain
// knowledge, not audio infrastructure.
//
// New code should prefer the engine directly:
//   audioEngine.loadInstrument('gm-soundfont')
//   audioEngine.playNote('gm-soundfont', note, velocity, { channel })

import { audioEngine } from '@/audio/AudioEngine';
import { instrumentManager } from '@/audio/instruments/InstrumentManager';
import {
  SOUNDFONT_CHANNELS,
  type SoundFontInstrument,
} from '@/audio/instruments/SoundFontInstrument';

const INSTRUMENT_ID = 'gm-soundfont' as const;

/** The instrument instance — constructed on demand, never null after this. */
function synth(): SoundFontInstrument {
  return instrumentManager.instance(INSTRUMENT_ID) as SoundFontInstrument;
}

/** The instance only if it can sound right now; undefined while loading. */
function readySynth(): SoundFontInstrument | undefined {
  return instrumentManager.peek(INSTRUMENT_ID) as
    | SoundFontInstrument
    | undefined;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Initialize the shared GM synth. Idempotent; safe to call from anywhere. */
export async function initJamSynth(): Promise<void> {
  await audioEngine.loadInstrument(INSTRUMENT_ID);
}

/** Play a note on a channel. */
export function jamNoteOn(
  channel: number,
  note: number,
  velocity: number,
): void {
  audioEngine.playNote(INSTRUMENT_ID, note, velocity, { channel });
}

/** Release a note on a channel. */
export function jamNoteOff(channel: number, note: number): void {
  audioEngine.stopNote(INSTRUMENT_ID, note, { channel });
}

/** Change the GM program (instrument) on a channel. */
export function jamProgramChange(channel: number, program: number): void {
  readySynth()?.programChange(channel, program);
}

/** Change a MIDI controller value on a channel (e.g. CC7 = channel volume). */
export function jamControllerChange(
  channel: number,
  controller: number,
  value: number,
): void {
  readySynth()?.controllerChange(channel, controller, value);
}

/**
 * Set the output level (0–1) of the GM synth. Persists across (re)loads and
 * applies immediately when it is already running.
 */
export function setJamMasterVolume(v: number): void {
  synth().setVolume(v);
}

/** Get the current output level (0–1). */
export function getJamMasterVolume(): number {
  return synth().getVolume();
}

/** Resume the audio context (call from a user gesture). */
export function resumeJamSynth(): void {
  audioEngine.resume();
}

/** The local player's channel (always 0). */
export function getLocalChannel(): number {
  return SOUNDFONT_CHANNELS.local;
}

/** The GM drums channel (always 9). */
export function getDrumChannel(): number {
  return SOUNDFONT_CHANNELS.drums;
}

/** The dedicated drone/pad channel (always 10). */
export function getDroneChannel(): number {
  return SOUNDFONT_CHANNELS.drone;
}

/** The dedicated accent/sparkle channel (always 11). */
export function getAccentChannel(): number {
  return SOUNDFONT_CHANNELS.accent;
}

/** Allocate (or retrieve) a channel for a remote player. */
export function allocateChannel(userId: string): number {
  return synth().leaseChannel(userId);
}

/** Release a remote player's channel, silencing anything it still holds. */
export function releaseChannel(userId: string): void {
  synth().releaseChannel(userId);
}

/** Whether the synth is loaded and ready. */
export function isJamSynthReady(): boolean {
  return instrumentManager.isReady(INSTRUMENT_ID);
}

/**
 * Tear down the synth.
 *
 * Note: the instrument is now shared application-wide, so this silences it for
 * every feature, not just the Jam Room. Nothing calls it today; it is kept for
 * API compatibility and should be treated as a panic button rather than an
 * unmount hook.
 */
export function disposeJamSynth(): void {
  synth().dispose();
}
