// ── AudioEngine ──────────────────────────────────────────────────────────────
// The application's audio facade. One instance, created at module load, alive
// for the lifetime of the tab.
//
// Features talk to this object and nothing below it. That is the contract that
// makes the rest of the system replaceable: buses can be re-wired, caches
// swapped, effects inserted, and no page has to change.
//
// Deliberately NOT a React object. Route branches in this app each mount their
// own <AppContext>, so anything held in React state is destroyed when you
// navigate between them. The engine is a module singleton; the provider only
// hands out a reference to it.
//
// Migration status: the DAW (src/daw) still owns its own engine and migrates
// last, by design. Instrument and transport APIs (`playNote`, `playMidi`,
// `setTempo`) land with the InstrumentManager and Scheduler steps — this file
// grows methods as their subsystems arrive rather than shipping stubs.

import { audioContextOwner } from './core/AudioContextOwner';
import { masterChain } from './core/MasterChain';
import { mixer, type BusName } from './core/Mixer';
import type { Instrument, NoteOptions } from './instruments/Instrument';
import {
  instrumentManager,
  type InstrumentId,
} from './instruments/InstrumentManager';
import {
  clipManager,
  type ClipHandle,
  type PlayClipOptions,
} from './samples/ClipManager';
import { sampleManager } from './samples/SampleManager';
import { metronome } from './transport/Metronome';
import { scheduler } from './transport/Scheduler';
import { transport } from './transport/Transport';

export interface PreloadRequest {
  /** Instruments to load ahead of first note. */
  instruments?: readonly InstrumentId[];
  /** Clip ids to fetch and decode ahead of first playback. */
  clips?: readonly string[];
  /** Raw sample URLs to warm (for callers that manage their own buffers). */
  samples?: readonly string[];
}

/** Use the exported `audioEngine` singleton; the class is exported for typing. */
export class AudioEngine {
  /** URL-keyed decoded buffer cache, shared by every feature. */
  readonly samples = sampleManager;
  /** Named prerecorded clips: narration, SFX, backing tracks. */
  readonly clips = clipManager;
  /** Loaded instruments, shared by every feature. */
  readonly instruments = instrumentManager;
  /** Drift-free scheduling on the audio clock, with owned handles. */
  readonly scheduler = scheduler;
  /** Tempo and meter — the app's single answer to "what tempo are we at". */
  readonly transport = transport;
  /** The application's one metronome. */
  readonly metronome = metronome;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** The one AudioContext. Created on first call, never on import. */
  get context(): AudioContext {
    return audioContextOwner.get();
  }

  /** Whether sound can currently be heard (context running, not suspended). */
  isRunning(): boolean {
    return audioContextOwner.isRunning();
  }

  /**
   * Lift an autoplay-policy or idle suspension. Call from user gestures; the
   * provider already does this globally on the first interaction.
   */
  resume(): void {
    audioContextOwner.resume();
  }

  // ── Routing ──────────────────────────────────────────────────────────────

  /**
   * A gain node feeding one of the mixer's category buses. Sound sources own
   * their channel and disconnect it when they're done; they never touch the
   * master or the destination.
   */
  channel(bus: BusName, volume = 1): GainNode {
    return mixer.channel(bus, volume);
  }

  /** Level for a whole category (0–1). */
  setBusVolume(bus: BusName, volume: number): void {
    mixer.setBusVolume(bus, volume);
  }

  /** App-wide output level (0–1). */
  setMasterVolume(volume: number): void {
    masterChain.setVolume(volume);
  }

  getMasterVolume(): number {
    return masterChain.getVolume();
  }

  // ── Transport ────────────────────────────────────────────────────────────

  /**
   * Set the application tempo. The metronome follows it live; features that
   * schedule against `engine.scheduler` should read `transport.secondsPerBeat`
   * rather than keeping a tempo of their own.
   */
  setTempo(bpm: number): void {
    transport.setTempo(bpm);
  }

  getTempo(): number {
    return transport.bpm;
  }

  // ── Instruments ──────────────────────────────────────────────────────────

  /** Load an instrument (idempotent). Call as a page mounts, not on first note. */
  loadInstrument(id: InstrumentId): Promise<Instrument> {
    return instrumentManager.load(id);
  }

  /** Whether an instrument can sound this instant. */
  isInstrumentReady(id: InstrumentId): boolean {
    return instrumentManager.isReady(id);
  }

  /**
   * Trigger a note. Synchronous by design — this is the live-MIDI path, and an
   * `await` between key-down and sound is exactly the latency we're avoiding.
   * A note sent before the instrument is loaded is dropped, so preload first
   * and gate your UI on `isInstrumentReady`.
   */
  playNote(
    id: InstrumentId,
    note: number,
    velocity: number,
    opts?: NoteOptions,
  ): void {
    // Resume unconditionally, before the readiness check: a note is always
    // driven by a gesture, so this is the moment an autoplay suspension can be
    // lifted — including notes played while the instrument is still loading.
    audioContextOwner.resume();
    instrumentManager.peek(id)?.noteOn(note, velocity, opts);
  }

  stopNote(id: InstrumentId, note: number, opts?: NoteOptions): void {
    instrumentManager.peek(id)?.noteOff(note, opts);
  }

  /** Release everything sounding on an instrument (or a single channel). */
  allNotesOff(id: InstrumentId, channel?: number): void {
    instrumentManager.peek(id)?.allNotesOff(channel);
  }

  // ── Audio clips ──────────────────────────────────────────────────────────

  /** Give clips stable ids once, at module load, near where they're used. */
  registerAudioClips(clips: Record<string, string>): void {
    clipManager.registerAll(clips);
  }

  /**
   * Play a named clip. Non-blocking: returns null if the clip hasn't been
   * decoded yet and starts loading it. Preload anything whose first play must
   * be instant.
   */
  playAudioClip(id: string, opts?: PlayClipOptions): ClipHandle | null {
    audioContextOwner.resume();
    return clipManager.play(id, opts);
  }

  /**
   * Play a clip straight from a URL. For dynamically-sourced audio only —
   * the app's own clips should be registered once and played by name.
   */
  playAudioUrl(url: string, opts?: PlayClipOptions): ClipHandle | null {
    audioContextOwner.resume();
    return clipManager.playUrl(url, opts);
  }

  stopAudioClip(id: string): void {
    clipManager.stop(id);
  }

  stopAllAudioClips(): void {
    clipManager.stopAll();
  }

  // ── Preloading ───────────────────────────────────────────────────────────

  /**
   * Warm assets in parallel with rendering, so a page never presents an
   * interactive surface that can't make sound yet.
   */
  async preload(request: PreloadRequest): Promise<void> {
    await Promise.all([
      request.instruments
        ? instrumentManager.preload(request.instruments)
        : Promise.resolve(),
      request.clips ? clipManager.preload(request.clips) : Promise.resolve(),
      request.samples
        ? sampleManager.preload(request.samples)
        : Promise.resolve(),
    ]);
  }
}

export const audioEngine = new AudioEngine();
export type {
  ClipHandle,
  PlayClipOptions,
  BusName,
  Instrument,
  InstrumentId,
  NoteOptions,
};
