import * as Tone from 'tone';
import { useStore, type InstrumentType, type Track } from '@/daw/store';
import type { StudioBassVoice } from '@/daw/store/tracksSlice';
import { audioEngine } from '@/daw/audio/AudioEngine';
import type { TrackEngine } from '@/daw/audio/TrackEngine';
import type { AutomationScheduler } from '@/daw/audio/AutomationScheduler';
import {
  MASTER_AUTOMATION_ID,
  resolveMasterAutomationTargets,
} from '@/daw/audio/automationParams';
import { getAudioBuffer, sliceBuffer } from '@/daw/audio/AudioBufferStore';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { PianoSampler } from '@/daw/instruments/PianoSampler';
import { SamplerInstrument } from '@/daw/instruments/SamplerInstrument';
import {
  BASS_ELECTRIC_CONFIG,
  ELECTRIC_PIANO_CONFIG,
  CELLO_CONFIG,
  ORGAN_CONFIG,
  bassVoiceSamplerConfig,
} from '@/daw/instruments/sampleConfigs';
import { EightOhEightInstrument } from '@/daw/instruments/EightOhEightInstrument';
import {
  DrumMachineEngine,
  DRUM_PADS,
} from '@/daw/instruments/DrumMachineEngine';
import type { DrumKitId } from '@/daw/instruments/drumKits';
import { ChopsSampler } from '@/daw/instruments/ChopsSampler';
import {
  DEFAULT_SAMPLER_FILTER_HZ,
  isValidRootNote,
  samplerBufferKey,
  samplerSampleSignature,
  samplerTrimRange,
} from '@/daw/instruments/samplerChops';
import { SoundFontAdapter } from '@/daw/instruments/SoundFontAdapter';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
import { TonewheelOrganEngine } from '@/daw/instruments/TonewheelOrganEngine';
import type { InstrumentAdapter } from '@/daw/instruments/InstrumentAdapter';

// ── Track audio ─────────────────────────────────────────────────────────
// The per-track audio objects (TrackEngine + instrument), the registry the
// rest of the editor reads them from, and the helpers that bring an engine
// to a track's state. The track reconciler (trackReconciler.ts) owns their
// lifecycle; usePlaybackEngine re-exports these for existing readers.

// ── Types ────────────────────────────────────────────────────────────────

export interface TrackAudioState {
  trackEngine: TrackEngine;
  instrument: InstrumentAdapter | null;
  instrumentType: InstrumentType;
  /** The bass voice the instrument was made with (bass tracks only). */
  bassVoice?: StudioBassVoice;
  /** The session generation the engine was made in (see sessionGeneration). */
  generation: number;
}

// ── Module-level registry ────────────────────────────────────────────────
// Singleton map so other hooks (MIDI input routing, Oracle Synth panel)
// can access TrackEngine instances without prop-drilling.

export const trackEngineRegistry = new Map<string, TrackAudioState>();

export function getTrackAudioState(
  trackId: string,
): TrackAudioState | undefined {
  return trackEngineRegistry.get(trackId);
}

// ── Engine-ready notification ─────────────────────────────────────────
// Allows React components to re-render when an instrument finishes async init.

let engineReadyVersion = 0;
const engineReadyListeners = new Set<() => void>();

export function getEngineReadyVersion(): number {
  return engineReadyVersion;
}

export function subscribeEngineReady(cb: () => void): () => void {
  engineReadyListeners.add(cb);
  return () => {
    engineReadyListeners.delete(cb);
  };
}

/** Tell the readers of the registry that an engine or instrument changed. */
export function notifyEngineReady(): void {
  engineReadyVersion++;
  engineReadyListeners.forEach((cb) => cb());
}

// ── Helpers ──────────────────────────────────────────────────────────────

export function createInstrument(
  type: InstrumentType,
  gmProgram?: number,
  drumKit?: DrumKitId,
  bassVoice?: StudioBassVoice,
): InstrumentAdapter | null {
  switch (type) {
    case 'oracle-synth':
      return new OracleSynthAdapter();
    case 'piano-sampler':
      return new PianoSampler();
    case 'electric-piano':
      return new SamplerInstrument(ELECTRIC_PIANO_CONFIG);
    case 'bass-electric':
      if (bassVoice === '808') return new EightOhEightInstrument();
      return new SamplerInstrument(
        bassVoice ? bassVoiceSamplerConfig(bassVoice) : BASS_ELECTRIC_CONFIG,
      );
    case 'cello':
      return new SamplerInstrument(CELLO_CONFIG);
    case 'organ':
      return new SamplerInstrument(ORGAN_CONFIG);
    case 'tonewheel-organ':
      return new TonewheelOrganEngine();
    case 'drum-machine':
      return new DrumMachineEngine(drumKit);
    case 'sampler':
      return new ChopsSampler();
    case 'soundfont':
      return new SoundFontAdapter(gmProgram ?? 0);
    case 'guitar-fx':
    case 'bass-fx':
      return new GuitarFxAdapter();
    case 'vocal-fx':
      return new VocalFxAdapter();
    default:
      return null;
  }
}

/** Apply a track's saved per-pad mix (or kit defaults) to its drum engine.
 *  Needed after kit loads too, since loadKit resets pans to the kit defaults. */
export function applyDrumPads(engine: DrumMachineEngine, track: Track): void {
  for (const pad of DRUM_PADS) {
    const padState = track.drumPads?.[pad.note];
    engine.setPadVolume(pad.note, padState?.volume ?? 0.8);
    engine.setPadPan(pad.note, padState?.pan ?? engine.getDefaultPan(pad.note));
  }
}

/** Apply a track's post-fader aux send levels to its engine, one per active
 *  return bus. A missing send (or no bus) resolves to a silent tap, so send 0
 *  is exactly the previous mix. */
export function applySends(
  engine: TrackEngine,
  track: Track,
  glide = false,
): void {
  for (const returnId of audioEngine.getReturnIds()) {
    engine.setSend(
      returnId,
      track.sends?.[returnId] ?? 0,
      audioEngine.getReturnBusInput(returnId),
      glide,
    );
  }
}

/** Re-apply a track's static mixer/FX values (the fader/knob positions). Used
 *  to hand automated params back to the store values when playback stops. */
export function applyStaticTrackParams(
  engine: TrackEngine,
  track: Track,
  opts: { glide?: boolean; deferIr?: boolean } = {},
): void {
  const glide = opts.glide ?? false;
  engine.setVolume(track.volume, glide);
  engine.setPan(track.pan, glide);
  engine.updateEffects(track.effects, opts);
  applySends(engine, track, glide);
}

/** Re-assert a track's automation while playing, so it re-wins params the static
 *  track-sync writes just stomped. Order matters: clear the old ramps FIRST, then
 *  re-apply the static base (so a DELETED lane snaps back cleanly rather than
 *  freezing at its last automated value), then schedule the present lanes over
 *  it. No-op when stopped — static values are what you hear then. */
export function reassertAutomationIfPlaying(
  automationScheduler: AutomationScheduler,
  track: Track,
  engine: TrackEngine,
): void {
  const s = useStore.getState();
  if (!s.isPlaying) return;
  automationScheduler.clearTrack(track.id);
  applyStaticTrackParams(engine, track);
  // Anchor on the live transport tick, not the ~30fps-lagged store position.
  automationScheduler.scheduleTrack(
    track.id,
    engine,
    track.automation,
    Tone.getTransport().ticks,
    s.bpm,
  );
}

/** Bring an organ engine to the track's saved settings, if they differ. */
export function applyOrganState(
  engine: TonewheelOrganEngine,
  track: Track,
): void {
  if (!track.organState) return;
  if (JSON.stringify(engine.getState()) === JSON.stringify(track.organState))
    return;
  engine.setState(track.organState);
}

/** Ride the Master bus automation lanes on the master gain from `tick`. */
export function scheduleMasterAutomation(
  automationScheduler: AutomationScheduler,
  tick: number,
  bpm: number,
): void {
  const masterGain = audioEngine.getMasterGain();
  automationScheduler.scheduleLanes(
    MASTER_AUTOMATION_ID,
    useStore.getState().masterAutomation,
    (paramId) => resolveMasterAutomationTargets(paramId, masterGain),
    tick,
    bpm,
  );
}

/** Set the master gain to the Master fader's (static) value. */
export function applyStaticMasterVolume(masterVolume: number): void {
  const gain = audioEngine.getMasterGain();
  // setTargetAtTime throws on a non-finite target and would leave the master
  // gain unset; coerce a bad masterVolume (its store clamp lets NaN through)
  // to unity so the master can never be silenced by a corrupt value.
  const vol = Number.isFinite(masterVolume) ? masterVolume : 1;
  gain.gain.setTargetAtTime(vol, gain.context.currentTime, 0.01);
}

/** Apply a Chops track's sample + envelope to its engine. Idempotent (the
 *  engine no-ops on an unchanged signature) and tolerant of the buffer not
 *  having been decoded yet — the AudioBufferStore subscription below re-applies
 *  when it lands. */
export function applySamplerState(engine: ChopsSampler, track: Track): void {
  const sample = track.samplerSample;
  if (!sample) return;
  engine.setEnvelope(sample.attack, sample.release);
  engine.setMode(sample.mode ?? 'classic');
  engine.setGain(sample.gain ?? 1);
  engine.setFilter(
    sample.filterOn ?? false,
    sample.filterHz ?? DEFAULT_SAMPLER_FILTER_HZ,
    sample.filterRes ?? 0,
  );
  // Rebuild only when the identity (sample/root/trim) actually changed — the
  // trim slice below allocates a fresh buffer, so skip it when idempotent.
  const signature = samplerSampleSignature(sample);
  if (engine.getAppliedSignature() === signature) return;
  const buffer = getAudioBuffer(samplerBufferKey(sample.sampleId));
  if (!buffer) return;
  // A corrupt save / rogue peer could carry a malformed root note; Tone.Sampler
  // throws on those, and this runs inside the buffer-store notify loop.
  const rootNote = isValidRootNote(sample.rootNote) ? sample.rootNote : 'C4';
  try {
    const { startFrame, endFrame } = samplerTrimRange(
      buffer.length,
      sample.startPct,
      sample.lengthPct,
    );
    const playBuffer =
      startFrame === 0 && endFrame === buffer.length
        ? buffer
        : sliceBuffer(audioEngine.getContext(), buffer, startFrame, endFrame);
    engine.setSample(signature, playBuffer, rootNote);
  } catch (err) {
    console.error('[Audio] Sampler sample apply failed:', err);
  }
}

/**
 * Whether a track's engine must be made again rather than updated in place:
 * its instrument changed, or its bass voice (picked when the instrument is
 * made), or it was made in an earlier session generation. A load or reset can
 * reuse a track id (kept work restored, a project reopened), and the Oracle
 * patch and the bass voice reach an engine only when it is made, so an engine
 * kept across the load would go on playing the previous project's sound.
 */
export function needsNewEngine(
  state: TrackAudioState,
  track: Track,
  generation: number,
): boolean {
  return (
    state.generation !== generation ||
    state.instrumentType !== track.instrument ||
    (track.instrument === 'bass-electric' &&
      state.bassVoice !== track.bassVoice)
  );
}

/** Silence and dispose a track's engine and take it out of the registry. */
export function retireTrackAudio(
  trackId: string,
  state: TrackAudioState,
  automationScheduler: AutomationScheduler,
): void {
  state.trackEngine.allNotesOff();
  // Clear any scheduled automation so its transport events don't keep
  // firing on the disposed engine's params.
  automationScheduler.clearTrack(trackId);
  state.trackEngine.dispose();
  trackEngineRegistry.delete(trackId);
}
