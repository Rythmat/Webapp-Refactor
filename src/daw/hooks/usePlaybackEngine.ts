import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { showError } from '@/components/utils/toast';
import { useStore, type InstrumentType, type Track } from '@/daw/store';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { TrackEngine } from '@/daw/audio/TrackEngine';
import { MidiScheduler } from '@/daw/audio/MidiScheduler';
import { AudioClipScheduler } from '@/daw/audio/AudioClipScheduler';
import { AutomationScheduler } from '@/daw/audio/AutomationScheduler';
import { MetronomeEngine } from '@/daw/audio/MetronomeEngine';
import { AudioRecorder } from '@/daw/audio/AudioRecorder';
import {
  setAudioBuffer,
  setOriginalAudio,
  getAudioBuffer,
  sliceBuffer,
  subscribeAudioBufferChanges,
} from '@/daw/audio/AudioBufferStore';
import {
  audioClipIntervalsSeconds,
  computeMaxRecordSeconds,
  ticksToSeconds,
} from '@/daw/audio/recordingLimit';
import { overwriteAudioRegion } from '@/daw/audio/overwriteAudioRegion';
import {
  renderPitchEdits,
  pitchEditCacheKey,
} from '@/daw/audio/pitch-analysis/PitchRenderer';
import { seekTo } from '@/daw/hooks/useTransport';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import {
  getTrackSynthState,
  applySynthStateToEngine,
} from '@/daw/oracle-synth/synthTrackState';
import { PianoSampler } from '@/daw/instruments/PianoSampler';
import { SamplerInstrument } from '@/daw/instruments/SamplerInstrument';
import {
  ELECTRIC_PIANO_CONFIG,
  CELLO_CONFIG,
  ORGAN_CONFIG,
} from '@/daw/instruments/sampleConfigs';
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

// ── Types ────────────────────────────────────────────────────────────────

export interface TrackAudioState {
  trackEngine: TrackEngine;
  instrument: InstrumentAdapter | null;
  instrumentType: InstrumentType;
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

// ── Helpers ──────────────────────────────────────────────────────────────

export function createInstrument(
  type: InstrumentType,
  gmProgram?: number,
  drumKit?: DrumKitId,
): InstrumentAdapter | null {
  switch (type) {
    case 'oracle-synth':
      return new OracleSynthAdapter();
    case 'piano-sampler':
      return new PianoSampler();
    case 'electric-piano':
      return new SamplerInstrument(ELECTRIC_PIANO_CONFIG);
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
export function applySends(engine: TrackEngine, track: Track): void {
  for (const returnId of audioEngine.getReturnIds()) {
    engine.setSend(
      returnId,
      track.sends?.[returnId] ?? 0,
      audioEngine.getReturnBusInput(returnId),
    );
  }
}

/** Re-apply a track's static mixer/FX values (the fader/knob positions). Used
 *  to hand automated params back to the store values when playback stops. */
export function applyStaticTrackParams(
  engine: TrackEngine,
  track: Track,
): void {
  engine.setVolume(track.volume);
  engine.setPan(track.pan);
  engine.updateEffects(track.effects);
  applySends(engine, track);
}

/** Re-assert a track's automation while playing, so it re-wins params the static
 *  track-sync writes just stomped. Order matters: clear the old ramps FIRST, then
 *  re-apply the static base (so a DELETED lane snaps back cleanly rather than
 *  freezing at its last automated value), then schedule the present lanes over
 *  it. No-op when stopped — static values are what you hear then. */
function reassertAutomationIfPlaying(
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

// ── Pitch-edited buffer cache ──────────────────────────────────────────────
// Caches rendered pitch-edited AudioBuffers keyed by `clipId:editHash`.
// Invalidated when edits change (different hash).
const pitchBufferCache = new Map<
  string,
  { key: string; buffer: AudioBuffer }
>();

/** Resolve playback buffer: if the clip has pitch edits, return a pre-rendered
 *  buffer with edits baked in. Otherwise return the original. */
function resolvePitchBuffer(
  clipId: string,
  originalBuffer: AudioBuffer,
  storeState: {
    pitchData: Record<
      string,
      {
        segments: {
          id: string;
          startTimeMs: number;
          endTimeMs: number;
          medianFreqHz: number;
          midiNote: number;
          centsOffset: number;
          pitchContour: number[];
        }[];
        edits: { segmentId: string; targetMidiNote: number }[];
        analyzed: boolean;
      }
    >;
  },
): AudioBuffer {
  const pd = storeState.pitchData[clipId];
  if (!pd || !pd.analyzed || pd.edits.length === 0) return originalBuffer;

  const editKey = pitchEditCacheKey(pd.edits);
  const cached = pitchBufferCache.get(clipId);
  if (cached && cached.key === editKey) return cached.buffer;

  const rendered = renderPitchEdits(originalBuffer, pd.segments, pd.edits);
  pitchBufferCache.set(clipId, { key: editKey, buffer: rendered });
  return rendered;
}

// ── Hook ─────────────────────────────────────────────────────────────────
// Manages the lifecycle of TrackEngine instances, instrument adapters,
// MIDI scheduling, and the metronome.
//
// When tracks are added/removed in the store, matching audio nodes are
// created/destroyed. When playback starts, all MIDI clips are scheduled
// through Tone.Transport.

export function usePlaybackEngine(isReady: boolean, token: string | null) {
  // Kept in a ref so the recording effect can read the latest token when a
  // recording stops without re-subscribing (and re-creating the recorder)
  // every time the token refreshes.
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const trackAudioRef = useRef(trackEngineRegistry);
  const schedulerRef = useRef(new MidiScheduler());
  const audioClipSchedulerRef = useRef(new AudioClipScheduler());
  const automationSchedulerRef = useRef(new AutomationScheduler());
  const metronomeRef = useRef<MetronomeEngine | null>(null);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const recordStartTickRef = useRef<number>(0);
  const isActivelyRecordingRef = useRef(false);
  // Auto-stop timer that enforces the per-track 5-minute audio recording cap.
  const recordLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const liveAudioAnalyserRef = useRef<AnalyserNode | null>(null);
  const liveAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const liveAudioRafRef = useRef<number>(0);
  const liveAudioPeaksRef = useRef<number[]>([]);

  const countInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countInSynthRef = useRef<Tone.MembraneSynth | null>(null);

  const tracks = useStore((s) => s.tracks);
  const isPlaying = useStore((s) => s.isPlaying);
  const isRecording = useStore((s) => s.isRecording);
  const isCountingIn = useStore((s) => s.isCountingIn);
  const countInBars = useStore((s) => s.countInBars);
  const metronomeEnabled = useStore((s) => s.metronomeEnabled);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const masteringEffects = useStore((s) => s.masteringEffects);
  const masterVolume = useStore((s) => s.masterVolume);
  const returns = useStore((s) => s.returns);

  // ── Sync TrackEngine instances with store tracks ───────────────────────
  useEffect(() => {
    if (!isReady) return;

    const ctx = audioEngine.getContext();
    const masterGain = audioEngine.getMasterGain();
    const audioMap = trackAudioRef.current;
    const currentIds = new Set(tracks.map((t) => t.id));

    // Remove TrackEngines for deleted tracks
    for (const [id, state] of audioMap) {
      if (!currentIds.has(id)) {
        state.trackEngine.allNotesOff();
        // Clear any scheduled automation so its transport events don't keep
        // firing on the disposed engine's params.
        automationSchedulerRef.current.clearTrack(id);
        state.trackEngine.dispose();
        audioMap.delete(id);
      }
    }

    // Evict stale pitchBufferCache entries for clips no longer in any track
    if (pitchBufferCache.size > 0) {
      const allClipIds = new Set<string>();
      for (const t of tracks) {
        for (const c of t.audioClips) allClipIds.add(c.id);
      }
      for (const clipId of pitchBufferCache.keys()) {
        if (!allClipIds.has(clipId)) pitchBufferCache.delete(clipId);
      }
    }

    // Create / update TrackEngines for tracks
    for (const track of tracks) {
      const existing = audioMap.get(track.id);

      if (existing) {
        // Check if instrument type changed — if so, tear down and recreate
        if (existing.instrumentType !== track.instrument) {
          existing.trackEngine.allNotesOff();
          existing.trackEngine.dispose();
          audioMap.delete(track.id);
          // Fall through to creation below
        } else {
          // Just update volume/pan/effects on existing track
          existing.trackEngine.setVolume(track.volume);
          existing.trackEngine.setPan(track.pan);
          existing.trackEngine.updateEffects(track.effects);
          // Kit changes from the store (view, project load, collab peer)
          // land here; setKit is idempotent and last-wins under races.
          if (existing.instrument instanceof DrumMachineEngine) {
            const drumEngine = existing.instrument;
            const kitId = track.drumKit ?? 'natural';
            if (drumEngine.getKit() !== kitId) {
              drumEngine
                .setKit(kitId)
                .then(() => {
                  const current = useStore
                    .getState()
                    .tracks.find((t) => t.id === track.id);
                  applyDrumPads(drumEngine, current ?? track);
                })
                .catch((err) => {
                  console.error('[Audio] Drum kit load failed:', err);
                });
            }
          }
          // Sampler sample/root/envelope changes likewise sync in place.
          if (existing.instrument instanceof ChopsSampler) {
            applySamplerState(existing.instrument, track);
          }
          // Aux send levels (store/view/collab) sync in place too.
          applySends(existing.trackEngine, track);
          // If a lane edit / collab change landed mid-playback, the static
          // writes above just stomped any automated param — re-assert the lanes
          // so automation keeps winning while playing.
          reassertAutomationIfPlaying(
            automationSchedulerRef.current,
            track,
            existing.trackEngine,
          );
          continue;
        }
      }

      const trackEngine = new TrackEngine(ctx, masterGain);
      trackEngine.setVolume(track.volume);
      trackEngine.setPan(track.pan);
      trackEngine.updateEffects(track.effects);
      applySends(trackEngine, track);
      reassertAutomationIfPlaying(
        automationSchedulerRef.current,
        track,
        trackEngine,
      );
      // Ducker key source: resolve any OTHER track's analyser by id from the
      // registry. Returns null for self (no feedback) or a missing key (fail
      // silent), and re-resolves live so key deletion/creation is handled.
      const ownId = track.id;
      trackEngine.setKeySourceResolver((keyId) =>
        keyId === ownId
          ? null
          : (getTrackAudioState(keyId)?.trackEngine.getAnalyserNode() ?? null),
      );

      const instrument = createInstrument(
        track.instrument,
        track.gmProgram,
        track.drumKit,
      );

      if (instrument) {
        // Initialize instrument async — fires and connects when ready
        console.log(
          `[Audio] Initializing ${track.instrument} for track "${track.name}"...`,
        );
        instrument
          .init(ctx, trackEngine.getInputNode())
          .then(() => {
            trackEngine.setInstrument(instrument);
            console.log(`[Audio] Instrument ready for track "${track.name}"`);
            // Apply the track's saved Oracle Synth patch to its fresh engine so
            // a loaded project plays with the right sound even before the synth
            // panel (which would otherwise be the first thing to sync it) opens.
            if (instrument instanceof OracleSynthAdapter) {
              const synthState = getTrackSynthState(track.id);
              const synthEngine = instrument.getEngine();
              if (synthState && synthEngine) {
                applySynthStateToEngine(synthEngine, synthState);
              }
            }
            // Same for saved drum pad mixes (the kit itself was passed to the
            // constructor, so init() already loaded the right samples).
            if (instrument instanceof DrumMachineEngine) {
              applyDrumPads(instrument, track);
            }
            // Chops: the sample buffer may already be decoded (drop/demo) or
            // still fetching (project load) — apply what's available now, the
            // buffer-store subscription re-applies on arrival.
            if (instrument instanceof ChopsSampler) {
              const current = useStore
                .getState()
                .tracks.find((t) => t.id === track.id);
              applySamplerState(instrument, current ?? track);
            }
            // Tap audio-input adapters into the live-monitor send bus so this
            // user's mic / instrument FX can be streamed to collaborators.
            const monitorBus = audioEngine.getMonitorBus();
            const getTap = (
              instrument as { getMonitorOutputNode?: () => AudioNode | null }
            ).getMonitorOutputNode;
            if (monitorBus && typeof getTap === 'function') {
              try {
                getTap.call(instrument)?.connect(monitorBus);
              } catch (err) {
                console.warn('[Audio] monitor tap connect failed:', err);
              }
            }
            engineReadyVersion++;
            engineReadyListeners.forEach((cb) => cb());
          })
          .catch((err) => {
            console.error(
              `[Audio] Instrument init FAILED for track "${track.name}":`,
              err,
            );
          });
      }

      audioMap.set(track.id, {
        trackEngine,
        instrument,
        instrumentType: track.instrument,
      });
    }
  }, [isReady, tracks]);

  // ── Apply sampler buffers as they finish decoding ─────────────────────
  // Sample bytes arrive asynchronously (file drop decode, asset rehydration
  // after load, collab peer's upload) without touching the store's tracks
  // array, so the track-sync effect above won't re-run. React to the buffer
  // store instead and idempotently re-apply.
  useEffect(() => {
    if (!isReady) return;
    return subscribeAudioBufferChanges(() => {
      for (const track of useStore.getState().tracks) {
        if (track.instrument !== 'sampler' || !track.samplerSample) continue;
        const state = trackEngineRegistry.get(track.id);
        if (state?.instrument instanceof ChopsSampler) {
          applySamplerState(state.instrument, track);
        }
      }
    });
  }, [isReady]);

  // ── Sync monitoring state to adapters for all tracks ──────────────────
  useEffect(() => {
    if (!isReady) return;
    const audioMap = trackAudioRef.current;
    for (const track of tracks) {
      const state = audioMap.get(track.id);
      if (!state?.instrument) continue;
      if ('setMonitoring' in state.instrument) {
        (state.instrument as any).setMonitoring(track.monitoring);
      }
    }
  }, [isReady, tracks]);

  // ── Sync mastering effects with audio engine ─────────────────────────
  useEffect(() => {
    if (!isReady) return;
    audioEngine.updateMasteringEffects(masteringEffects);
  }, [isReady, masteringEffects]);

  // ── Sync master output volume with audio engine ──────────────────────
  useEffect(() => {
    if (!isReady) return;
    const gain = audioEngine.getMasterGain();
    // setTargetAtTime throws on a non-finite target and would leave the master
    // gain unset; coerce a bad masterVolume (its store clamp lets NaN through)
    // to unity so the master can never be silenced by a corrupt value.
    const vol = Number.isFinite(masterVolume) ? masterVolume : 1;
    gain.gain.setTargetAtTime(vol, gain.context.currentTime, 0.01);
  }, [isReady, masterVolume]);

  // ── Sync return-bus effects + volume with audio engine ───────────────
  useEffect(() => {
    if (!isReady) return;
    for (const ret of returns) {
      audioEngine.updateReturnEffects(ret.id, ret.effects);
      audioEngine.setReturnVolume(ret.id, ret.volume);
    }
  }, [isReady, returns]);

  // ── Schedule / cancel MIDI + audio clips on play/stop ───────────────────
  useEffect(() => {
    if (!isReady) return;

    const scheduler = schedulerRef.current;
    const audioClipScheduler = audioClipSchedulerRef.current;
    const automationScheduler = automationSchedulerRef.current;
    const audioMap = trackAudioRef.current;

    // Always cancel previous schedule before re-scheduling
    scheduler.cancelAll();
    audioClipScheduler.cancelAll();
    automationScheduler.cancelAll();

    if (isPlaying) {
      // Read tracks from store snapshot (not from React closure) to avoid
      // re-scheduling on every track property change (volume, pan, etc.)
      const storeState = useStore.getState();
      const currentTracks = storeState.tracks;
      const currentTick = storeState.position;
      const bpm = storeState.bpm;

      for (const track of currentTracks) {
        if (track.mute) continue;
        const state = audioMap.get(track.id);
        if (!state) continue;

        // Schedule MIDI clips
        for (const clip of track.midiClips) {
          scheduler.scheduleSequence(
            {
              ticksPerQuarterNote: 480,
              trackName: track.name,
              events: clip.events,
              ccEvents: clip.ccEvents,
            },
            state.trackEngine,
            clip.startTick,
          );
        }

        // Schedule audio clips — route through pedal chain for Guitar/Bass/Vocal tracks
        // so amp/pedal changes are heard in real time during playback
        const pedalInput =
          state.instrument instanceof GuitarFxAdapter
            ? ((
                state.instrument as GuitarFxAdapter
              ).getNativePedalInputNode() ?? undefined)
            : state.instrument instanceof VocalFxAdapter
              ? ((
                  state.instrument as VocalFxAdapter
                ).getNativePedalInputNode() ?? undefined)
              : undefined;
        for (const clip of track.audioClips) {
          const audioBuffer = getAudioBuffer(clip.id);
          if (!audioBuffer) continue;
          const playBuffer = resolvePitchBuffer(
            clip.id,
            audioBuffer,
            storeState,
          );
          audioClipScheduler.scheduleClip(
            playBuffer,
            clip.startTick,
            clip.duration,
            state.trackEngine,
            currentTick,
            bpm,
            pedalInput,
            clip.fadeInTicks,
            clip.fadeOutTicks,
            clip.offsetSeconds ?? 0,
          );
        }

        // Ride this track's automation lanes (volume/pan/sends/FX) from the
        // playhead. Runs after sends/effects are set so the params are wired.
        automationScheduler.scheduleTrack(
          track.id,
          state.trackEngine,
          track.automation,
          currentTick,
          bpm,
        );
      }
    } else {
      // Immediately silence all notes, then hand automated params back to their
      // static store values (fader/knob positions) so stopping resets the mix.
      const stopState = useStore.getState();
      for (const [trackId, state] of audioMap) {
        state.trackEngine.panic();
        const track = stopState.tracks.find((t) => t.id === trackId);
        if (track) applyStaticTrackParams(state.trackEngine, track);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isPlaying]);

  // ── Metronome ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;

    if (!metronomeRef.current) {
      metronomeRef.current = new MetronomeEngine();
      metronomeRef.current.init(audioEngine.getMasterGain());
    }

    const metro = metronomeRef.current;
    metro.setTimeSignature(tsNum, tsDen);
    metro.setEnabled(metronomeEnabled);

    if (isPlaying && metronomeEnabled) {
      metro.start();
    } else {
      metro.stop();
    }
  }, [isReady, isPlaying, metronomeEnabled, tsNum, tsDen]);

  // ── Count-in scheduling (audio-clock, transport stays paused) ────────
  useEffect(() => {
    if (!isReady || !isCountingIn) return;

    const storeSnap = useStore.getState();
    const bpm = storeSnap.bpm;
    const num = storeSnap.timeSignatureNumerator;
    const den = storeSnap.timeSignatureDenominator;
    // Beat duration based on denominator: eighth = half a quarter, half = two quarters
    const beatDuration = (60 / bpm) * (4 / den);
    const totalBeats = countInBars * num;
    const masterGain = audioEngine.getMasterGain();

    // Compound meter detection (6/8, 9/8, 12/8)
    const isCompound = den === 8 && num % 3 === 0 && num >= 6;

    // Create a temporary synth for count-in clicks (same config as MetronomeEngine)
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    });
    synth.connect(masterGain);
    synth.volume.value = -10;
    countInSynthRef.current = synth;

    // Schedule all clicks at audio-clock times (no Transport needed)
    const now = Tone.now();
    for (let i = 0; i < totalBeats; i++) {
      const time = now + i * beatDuration;
      let pitch: string;
      if (i % num === 0) {
        pitch = 'C5'; // Beat 1 accent
      } else if (isCompound && i % 3 === 0) {
        pitch = 'C5'; // Compound sub-group accent
      } else {
        pitch = 'C4';
      }
      synth.triggerAttackRelease(pitch, '32n', time);
    }

    // After count-in completes, start the transport (and recording, if this
    // count-in was armed by Record rather than Play).
    const timer = setTimeout(
      () => {
        useStore.getState()._startAfterCountIn();
      },
      totalBeats * beatDuration * 1000,
    );
    countInTimerRef.current = timer;

    return () => {
      if (countInTimerRef.current !== null) {
        clearTimeout(countInTimerRef.current);
        countInTimerRef.current = null;
      }
      if (countInSynthRef.current) {
        countInSynthRef.current.dispose();
        countInSynthRef.current = null;
      }
    };
  }, [isReady, isCountingIn, countInBars]);

  // ── Silence held notes + restart audio clips at loop boundary ────────
  // Transport.schedule() at loopEnd never fires because Tone.js resets
  // ticks to loopStart BEFORE processing timeline events. Instead, use
  // the Transport's "loop" event which fires reliably at the boundary.
  useEffect(() => {
    if (!isReady || !isPlaying || !loopEnabled) return;

    const transport = Tone.getTransport();
    const audioMap = trackAudioRef.current;
    const audioClipScheduler = audioClipSchedulerRef.current;
    const automationScheduler = automationSchedulerRef.current;

    const handleLoop = () => {
      // Silence held MIDI notes
      for (const [, state] of audioMap) {
        state.trackEngine.allNotesOff();
      }

      // Stop and re-schedule audio clips for the loop region
      audioClipScheduler.cancelAll();
      const storeSnap = useStore.getState();
      const currentTracks = storeSnap.tracks;
      const loopStart = storeSnap.loopStart;
      const loopEnd = storeSnap.loopEnd;
      const bpm = storeSnap.bpm;
      for (const track of currentTracks) {
        if (track.mute) continue;
        const state = audioMap.get(track.id);
        if (!state) continue;
        const pedalInput =
          state.instrument instanceof GuitarFxAdapter
            ? ((
                state.instrument as GuitarFxAdapter
              ).getNativePedalInputNode() ?? undefined)
            : state.instrument instanceof VocalFxAdapter
              ? ((
                  state.instrument as VocalFxAdapter
                ).getNativePedalInputNode() ?? undefined)
              : undefined;
        for (const clip of track.audioClips) {
          const audioBuffer = getAudioBuffer(clip.id);
          if (!audioBuffer) continue;
          const playBuffer = resolvePitchBuffer(
            clip.id,
            audioBuffer,
            storeSnap,
          );
          const clipEnd = clip.startTick + clip.duration;
          // Only schedule clips that overlap the loop region
          if (clipEnd > loopStart && clip.startTick < loopEnd) {
            audioClipScheduler.scheduleClip(
              playBuffer,
              clip.startTick,
              clip.duration,
              state.trackEngine,
              loopStart,
              bpm,
              pedalInput,
              clip.fadeInTicks,
              clip.fadeOutTicks,
            );
          }
        }
        // Re-arm automation for the new lap (one-shot transport events don't
        // re-fire after the loop reset), anchored at loopStart.
        automationScheduler.scheduleTrack(
          track.id,
          state.trackEngine,
          track.automation,
          loopStart,
          bpm,
        );
      }
    };

    transport.on('loop', handleLoop);

    return () => {
      transport.off('loop', handleLoop);
    };
  }, [isReady, isPlaying, loopEnabled]);

  // ── Audio recording (record-armed audio tracks) ─────────────────────
  useEffect(() => {
    if (!isReady) return;

    const recordArmedAudioTrack = tracks.find(
      (t) => t.type === 'audio' && t.recordArmed,
    );

    // Tear down all live-recording artifacts (waveform RAF, analyser nodes, the
    // 5-minute cap timer, and the on-screen live peaks). Idempotent and safe to
    // call on any effect run — this is what keeps a stale RAF/timer from
    // surviving when the effect re-runs for unrelated reasons. In a collab
    // session `tracks` changes constantly, re-running this effect mid-take, so
    // cleanup must NOT be conditional on the recorder still "recording".
    const cleanupLiveRecordingArtifacts = () => {
      cancelAnimationFrame(liveAudioRafRef.current);
      liveAudioSourceRef.current?.disconnect();
      liveAudioAnalyserRef.current?.disconnect();
      liveAudioSourceRef.current = null;
      liveAudioAnalyserRef.current = null;
      liveAudioPeaksRef.current = [];
      if (recordLimitTimerRef.current !== null) {
        clearTimeout(recordLimitTimerRef.current);
        recordLimitTimerRef.current = null;
      }
      useStore.getState().clearLiveAudioRecording();
    };

    if (isPlaying && isRecording && recordArmedAudioTrack) {
      // Guard: don't re-create recorder if already recording (effect re-runs
      // when `tracks` changes during recording, e.g. MIDI clips added)
      if (isActivelyRecordingRef.current) return;
      // Clear anything a previous take left behind before starting fresh, so a
      // leaked RAF/timer from a botched teardown can't keep running.
      cleanupLiveRecordingArtifacts();
      isActivelyRecordingRef.current = true;

      // Enforce the per-track 5-minute total-audio cap. Time the take may run
      // is the remaining budget, walked forward from the playhead (time spent
      // over existing audio is free — it just overwrites). If there's no budget
      // and nothing to overwrite at the start, refuse to record.
      const startTickForLimit = useStore.getState().position;
      const bpmForLimit = useStore.getState().bpm;
      const maxRecordSeconds = computeMaxRecordSeconds(
        audioClipIntervalsSeconds(recordArmedAudioTrack, bpmForLimit),
        ticksToSeconds(startTickForLimit, bpmForLimit),
      );
      if (maxRecordSeconds <= 0.05) {
        isActivelyRecordingRef.current = false;
        useStore.getState().stop();
        useStore.getState().setRecordingLimitModalOpen(true);
        return;
      }

      // Start recording
      const recorder = new AudioRecorder();
      audioRecorderRef.current = recorder;
      recordStartTickRef.current = startTickForLimit;

      recordLimitTimerRef.current = setTimeout(() => {
        // stop() flips isRecording/isPlaying off, which re-runs this effect and
        // finalizes the take below (capturing the first `maxRecordSeconds`).
        useStore.getState().stop();
        useStore.getState().setRecordingLimitModalOpen(true);
      }, maxRecordSeconds * 1000);

      // For Guitar/Bass/Vocal tracks, tap the adapter's raw input signal
      // (DRY, before pedal chain) so playback re-applies effects in real time.
      // For other audio tracks, fall back to raw mic input via getUserMedia.
      const audioState = trackAudioRef.current.get(recordArmedAudioTrack.id);
      const adapter =
        audioState?.instrument instanceof GuitarFxAdapter
          ? audioState.instrument
          : audioState?.instrument instanceof VocalFxAdapter
            ? audioState.instrument
            : null;

      // Helper: start live waveform analyser from a recording stream
      const startLiveAnalyser = (stream: MediaStream, trackId: string) => {
        try {
          const ctx = audioEngine.getContext();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nativeCtx: AudioContext = (ctx as any)._nativeContext ?? ctx;
          const source = nativeCtx.createMediaStreamSource(stream);
          const analyser = nativeCtx.createAnalyser();
          analyser.fftSize = 2048;
          source.connect(analyser);
          liveAudioAnalyserRef.current = analyser;
          liveAudioSourceRef.current = source;
          liveAudioPeaksRef.current = [];

          const buf = new Float32Array(analyser.fftSize);
          const startTick = recordStartTickRef.current;
          let lastUpdate = 0;

          const poll = (now: number) => {
            if (now - lastUpdate >= 66) {
              analyser.getFloatTimeDomainData(buf);
              let peak = 0;
              for (let i = 0; i < buf.length; i++) {
                const abs = Math.abs(buf[i]);
                if (abs > peak) peak = abs;
              }
              liveAudioPeaksRef.current.push(peak);
              useStore
                .getState()
                .setLiveAudioRecording(
                  trackId,
                  [...liveAudioPeaksRef.current],
                  startTick,
                );
              lastUpdate = now;
            }
            liveAudioRafRef.current = requestAnimationFrame(poll);
          };
          liveAudioRafRef.current = requestAnimationFrame(poll);
        } catch (err) {
          console.warn('[usePlaybackEngine] Live audio analyser failed:', err);
        }
      };

      // Tap the adapter's raw input when one is attached AND it has a live
      // input device. Without a device (e.g. armed but no mic selected in a
      // collab session), startRecordingStream() returns null and we fall back
      // to generic mic capture below instead of crashing.
      const adapterStream = adapter?.startRecordingStream() ?? null;
      if (adapterStream) {
        // Tap the pedal chain output (after amp model, before muteGain)
        recorder.startRecording(adapterStream);
        startLiveAnalyser(adapterStream, recordArmedAudioTrack.id);
      } else {
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        };
        navigator.mediaDevices
          .getUserMedia({ audio: audioConstraints })
          .then((stream) => {
            recorder.startRecording(stream);
            startLiveAnalyser(stream, recordArmedAudioTrack.id);
          })
          .catch((err) => {
            console.warn('Audio recording failed:', err);
            audioRecorderRef.current = null;
            isActivelyRecordingRef.current = false;
            if (recordLimitTimerRef.current !== null) {
              clearTimeout(recordLimitTimerRef.current);
              recordLimitTimerRef.current = null;
            }
          });
      }
    } else {
      // Not in the recording state (stopped/paused, or never started). ALWAYS
      // tear down live artifacts first so a stale waveform RAF or 5-minute cap
      // timer can't survive a stop — robust to the effect re-running for
      // unrelated reasons (e.g. collab track syncs). Then finalize the take if a
      // recorder was actually running.
      const recorder = audioRecorderRef.current;
      const wasRecording = recorder?.isRecording() ?? false;
      isActivelyRecordingRef.current = false;
      cleanupLiveRecordingArtifacts();
      audioRecorderRef.current = null;

      if (!wasRecording || !recorder) return;

      const armedTrack = tracks.find(
        (t) => t.type === 'audio' && t.recordArmed,
      );
      const trackId = armedTrack?.id;
      const startTick = recordStartTickRef.current;

      // Clean up recording stream tap on Guitar/Bass/Vocal tracks
      const audioState = armedTrack
        ? trackAudioRef.current.get(armedTrack.id)
        : undefined;
      const stoppingAdapter =
        audioState?.instrument instanceof GuitarFxAdapter
          ? audioState.instrument
          : audioState?.instrument instanceof VocalFxAdapter
            ? audioState.instrument
            : null;
      stoppingAdapter?.stopRecordingStream();

      const ctx = audioEngine.getContext();
      recorder
        .stopRecording(ctx)
        .then(({ buffer: audioBuffer, originalBytes, originalContentType }) => {
          const clipId = `clip-audio-${crypto.randomUUID().slice(0, 8)}`;
          setAudioBuffer(clipId, audioBuffer);
          // Stash the original Opus/WebM bytes so cloud save can upload them
          // as-is instead of re-encoding to ~10x larger WAV.
          setOriginalAudio(clipId, originalBytes, originalContentType);

          // Convert duration in seconds to ticks
          const bpm = useStore.getState().bpm;
          const durationSeconds = audioBuffer.duration;
          const durationTicks = Math.round((durationSeconds / 60) * bpm * 480);

          if (trackId) {
            useStore.getState().addAudioClip(trackId, {
              id: clipId,
              startTick,
              duration: durationTicks,
              fadeInTicks: 0,
              fadeOutTicks: 0,
            });

            // Overwrite whatever the take rolled over: trim/remove existing
            // audio clips on this track within the recorded span so only the
            // overlapping region is replaced (non-overlapping audio survives).
            const rawCtx = Tone.getContext().rawContext;
            const nativeCtx: AudioContext =
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (rawCtx as any)._nativeContext ?? (rawCtx as AudioContext);
            overwriteAudioRegion(
              trackId,
              startTick,
              startTick + durationTicks,
              nativeCtx,
              bpm,
              clipId,
            );

            // Auto-rewind playhead to clip start so next play replays the recording
            seekTo(startTick);

            // Upload to GCS immediately so the bytes survive a page reload —
            // the decoded buffer and original bytes live only in memory until
            // now. Stamps the returned assetId onto the clip. Fire-and-forget:
            // a failure leaves assetId=null so the next cloud Save retries.
            const token = tokenRef.current;
            if (token) {
              void (async () => {
                const { uploadRecordedClip } = await import(
                  '@/lib/studio-assets/upload-pending'
                );
                await uploadRecordedClip(token, trackId, clipId);
              })().catch((err) => {
                console.error('[recording] immediate upload failed', err);
                showError(
                  `Recorded audio couldn't be saved to the cloud: ${
                    err instanceof Error ? err.message : 'unknown error'
                  }. It will retry on the next Save.`,
                );
              });
            }
          }
        })
        .catch((err) => {
          console.warn('Failed to stop audio recording:', err);
        });
    }
  }, [isReady, isPlaying, isRecording, tracks]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      schedulerRef.current.cancelAll();
      audioClipSchedulerRef.current.cancelAll();
      automationSchedulerRef.current.cancelAll();

      // Clean up any active audio recording resources
      cancelAnimationFrame(liveAudioRafRef.current);
      liveAudioSourceRef.current?.disconnect();
      liveAudioAnalyserRef.current?.disconnect();
      liveAudioSourceRef.current = null;
      liveAudioAnalyserRef.current = null;
      if (recordLimitTimerRef.current !== null) {
        clearTimeout(recordLimitTimerRef.current);
        recordLimitTimerRef.current = null;
      }

      for (const [, state] of trackAudioRef.current) {
        state.trackEngine.allNotesOff();
        state.trackEngine.dispose();
      }
      trackAudioRef.current.clear();
      metronomeRef.current?.dispose();
    };
  }, []);

  // ── Expose for Oracle Synth panel + other hooks ─────────────────────
  // Also available via the module-level trackEngineRegistry / getTrackAudioState.
  return {
    getTrackEngine: (trackId: string) =>
      trackEngineRegistry.get(trackId)?.trackEngine ?? null,
    getInstrument: (trackId: string) =>
      trackEngineRegistry.get(trackId)?.instrument ?? null,
  };
}
