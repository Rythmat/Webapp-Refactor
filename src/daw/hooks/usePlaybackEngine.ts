import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { showError } from '@/components/utils/toast';
import { useStore, type InstrumentType, type Track } from '@/daw/store';
import type { StudioBassVoice } from '@/daw/store/tracksSlice';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { isTrackAudible } from '@/daw/audio/trackAudibility';
import { getPlaybackLoop } from '@/daw/store/transportSlice';
import { masteringEffectsForEngine } from '@/daw/store/masteringSlice';
import { TrackEngine } from '@/daw/audio/TrackEngine';
import { MidiScheduler } from '@/daw/audio/MidiScheduler';
import { AudioClipScheduler } from '@/daw/audio/AudioClipScheduler';
import { AutomationScheduler } from '@/daw/audio/AutomationScheduler';
import {
  MASTER_AUTOMATION_ID,
  resolveMasterAutomationTargets,
} from '@/daw/audio/automationParams';
import { MetronomeEngine, clickPitch } from '@/daw/audio/MetronomeEngine';
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
import { seekTo } from '@/daw/hooks/useTransport';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import {
  getTrackSynthState,
  applySynthStateToEngine,
  defaultSynthTrackState,
} from '@/daw/oracle-synth/synthTrackState';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { beginTake } from '@/daw/session/takesInFlight';
import { useSessionGeneration } from '@/daw/session/useSessionGeneration';
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
function notifyEngineReady(): void {
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

/** Bring an organ engine to the track's saved settings, if they differ. */
function applyOrganState(engine: TonewheelOrganEngine, track: Track): void {
  if (!track.organState) return;
  if (JSON.stringify(engine.getState()) === JSON.stringify(track.organState))
    return;
  engine.setState(track.organState);
}

/** Ride the Master bus automation lanes on the master gain from `tick`. */
function scheduleMasterAutomation(
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
function applyStaticMasterVolume(masterVolume: number): void {
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
function needsNewEngine(
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
function retireTrackAudio(
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

// ── Hook ─────────────────────────────────────────────────────────────────
// Manages the lifecycle of TrackEngine instances, instrument adapters,
// MIDI scheduling, and the metronome.
//
// When tracks are added/removed in the store, matching audio nodes are
// created/destroyed. When playback starts, all MIDI clips are scheduled
// through Tone.Transport.

/**
 * Stop `recorder` and keep its take: a clip on the record-armed audio track
 * from `startTick`, replacing what the take rolled over, uploaded at once when
 * signed in. Runs when recording stops, and when the editor closes mid-take.
 */
function finishAudioTake(
  recorder: AudioRecorder,
  startTick: number,
  tokenRef: { readonly current: string | null },
): void {
  const armedTrack = useStore
    .getState()
    .tracks.find((t) => t.type === 'audio' && t.recordArmed);
  const trackId = armedTrack?.id;

  // Clean up recording stream tap on Guitar/Bass/Vocal tracks
  const audioState = armedTrack
    ? trackEngineRegistry.get(armedTrack.id)
    : undefined;
  const stoppingAdapter =
    audioState?.instrument instanceof GuitarFxAdapter
      ? audioState.instrument
      : audioState?.instrument instanceof VocalFxAdapter
        ? audioState.instrument
        : null;
  stoppingAdapter?.stopRecordingStream();

  // Counted for openSession (takesInFlight) until the clip is in the store or
  // the take is lost: an open that replaces the session waits for it.
  const settleTake = beginTake('audio');
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
            // Fixed text: the error carries request details (method, path,
            // status) that are not for students.
            showError(
              'Your recording is kept on this device. It will upload when you save.',
            );
          });
        }
      }
    })
    .catch((err) => {
      console.warn('Failed to stop audio recording:', err);
    })
    .finally(settleTake);
}

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
  // The running take, counted for openSession (takesInFlight) from its start,
  // so an open that stops the transport waits for it even before this
  // effect has seen the stop. finishAudioTake counts the commit itself.
  const audioTakeSettleRef = useRef<(() => void) | null>(null);
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
  // The piano roll editor's own loop while it's open, else the project loop.
  const loopEnabled = useStore((s) => getPlaybackLoop(s).enabled);
  const masteringEffects = useStore((s) => s.masteringEffects);
  const masteringBypass = useStore((s) => s.masteringBypass);
  const masterVolume = useStore((s) => s.masterVolume);
  const masterAutomation = useStore((s) => s.masterAutomation);
  const returns = useStore((s) => s.returns);
  // Moves on with every load or reset of the project (sessionGeneration.ts).
  const generation = useSessionGeneration();

  // ── Sync TrackEngine instances with store tracks ───────────────────────
  useEffect(() => {
    if (!isReady) return;
    // A load or reset started after this render: the render it scheduled
    // reconciles the new project's tracks, so build nothing for these.
    if (generation !== getSessionGeneration()) return;

    const ctx = audioEngine.getContext();
    const masterGain = audioEngine.getMasterGain();
    const audioMap = trackAudioRef.current;
    const currentIds = new Set(tracks.map((t) => t.id));
    // Whether this pass made or let go of an engine (see the end).
    let enginesChanged = false;

    // Remove TrackEngines for deleted tracks
    for (const [id, state] of audioMap) {
      if (!currentIds.has(id)) {
        retireTrackAudio(id, state, automationSchedulerRef.current);
        enginesChanged = true;
      }
    }

    // Create / update TrackEngines for tracks
    for (const track of tracks) {
      const existing = audioMap.get(track.id);

      if (existing) {
        // A new instrument, bass voice or session: tear down and recreate
        if (needsNewEngine(existing, track, generation)) {
          retireTrackAudio(track.id, existing, automationSchedulerRef.current);
          enginesChanged = true;
          // Fall through to creation below
        } else {
          // Just update volume/pan/effects on existing track
          existing.trackEngine.setVolume(track.volume);
          existing.trackEngine.setAudible(isTrackAudible(track, tracks));
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
          // The track is the source of truth for the GM sound and the organ
          // settings, so undo, project load and collab peers land here too.
          if (existing.instrument instanceof SoundFontAdapter) {
            const program = track.gmProgram ?? 0;
            if (existing.instrument.getProgram() !== program) {
              existing.instrument.setProgram(program);
            }
          }
          if (existing.instrument instanceof TonewheelOrganEngine) {
            applyOrganState(existing.instrument, track);
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
      trackEngine.setAudible(isTrackAudible(track, tracks));
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
        track.bassVoice,
      );

      if (instrument) {
        // Initialize instrument async — fires and connects when ready
        console.log(
          `[Audio] Initializing ${track.instrument} for track "${track.name}"...`,
        );
        instrument
          .init(ctx, trackEngine.getInputNode())
          .then(() => {
            // The track's engine was made again (a load, a new instrument) or
            // removed while this loaded: let the instrument go rather than
            // wire it into a disposed engine, where it would keep running
            // (and holding a SoundFont channel) unheard.
            if (audioMap.get(track.id)?.trackEngine !== trackEngine) {
              instrument.dispose();
              return;
            }
            trackEngine.setInstrument(instrument);
            console.log(`[Audio] Instrument ready for track "${track.name}"`);
            // Apply the track's saved Oracle Synth patch to its fresh engine so
            // a loaded project plays with the right sound even before the synth
            // panel (which would otherwise be the first thing to sync it) opens.
            // A track with no patch of its own plays the default patch its
            // panel shows. The engine's own starting sound differs from it
            // (filter 1 at 20 kHz, not 13.4), so the track used to change
            // sound when its panel first opened, and change back on a reload.
            if (instrument instanceof OracleSynthAdapter) {
              const synthEngine = instrument.getEngine();
              if (synthEngine) {
                applySynthStateToEngine(
                  synthEngine,
                  getTrackSynthState(track.id) ?? defaultSynthTrackState(),
                  { projectBpm: useStore.getState().bpm },
                );
              }
            }
            // Same for saved drum pad mixes (the kit itself was passed to the
            // constructor, so init() already loaded the right samples).
            if (instrument instanceof DrumMachineEngine) {
              applyDrumPads(instrument, track);
            }
            // …and saved organ settings (drawbars, Leslie, percussion, …).
            if (instrument instanceof TonewheelOrganEngine) {
              const current = useStore
                .getState()
                .tracks.find((t) => t.id === track.id);
              applyOrganState(instrument, current ?? track);
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
            notifyEngineReady();
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
        bassVoice: track.bassVoice,
        generation,
      });
      enginesChanged = true;
    }

    // Readers that hold a track's engine (the meters, the instrument panels)
    // re-read on this. A load now makes every engine again under the same
    // track ids, so a reader keyed on the id alone kept the disposed engine.
    if (enginesChanged) notifyEngineReady();
  }, [isReady, tracks, generation]);

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
  // Bypass switches every slot off in the engine only (the stored chain stays).
  useEffect(() => {
    if (!isReady) return;
    audioEngine.updateMasteringEffects(
      masteringEffectsForEngine(masteringEffects, masteringBypass),
    );
  }, [isReady, masteringEffects, masteringBypass]);

  // ── Sync master output volume with audio engine ──────────────────────
  // Same order as reassertAutomationIfPlaying: clear the Master's ramps, set
  // the fader value, then (while playing) re-ride the lanes over it — so a
  // fader move or a lane edit mid-play takes effect without stopping, and a
  // deleted lane snaps back to the fader.
  useEffect(() => {
    if (!isReady) return;
    const automationScheduler = automationSchedulerRef.current;
    automationScheduler.clearTrack(MASTER_AUTOMATION_ID);
    applyStaticMasterVolume(masterVolume);
    const s = useStore.getState();
    if (s.isPlaying) {
      scheduleMasterAutomation(
        automationScheduler,
        Tone.getTransport().ticks,
        s.bpm,
      );
    }
  }, [isReady, masterVolume, masterAutomation]);

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
        // Muted and solo-excluded tracks are still scheduled: the TrackEngine's
        // audible gate (set in the track sync above) silences them, so toggling
        // mute/solo mid-playback takes effect immediately.
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
          audioClipScheduler.scheduleClip({
            buffer: audioBuffer,
            clip,
            trackEngine: state.trackEngine,
            fromTick: currentTick,
            bpm,
            pedalInput,
          });
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

      // Master bus automation (master volume).
      scheduleMasterAutomation(automationScheduler, currentTick, bpm);
    } else {
      // Immediately silence all notes, then hand automated params back to their
      // static store values (fader/knob positions) so stopping resets the mix.
      const stopState = useStore.getState();
      for (const [trackId, state] of audioMap) {
        state.trackEngine.panic();
        const track = stopState.tracks.find((t) => t.id === trackId);
        if (track) applyStaticTrackParams(state.trackEngine, track);
      }
      applyStaticMasterVolume(stopState.masterVolume);
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
    // Publish the clock the clicks hang off so the on-screen count-off in the
    // notation view can follow the same one, rather than a wall clock that
    // would drift against them.
    useStore.getState()._setCountInStartedAt(now);
    for (let i = 0; i < totalBeats; i++) {
      const time = now + i * beatDuration;
      // Same accents as the metronome (beat 1, compound sub-groups).
      synth.triggerAttackRelease(clickPitch(i % num, num, den), '32n', time);
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
      const { start: loopStart, end: loopEnd } = getPlaybackLoop(storeSnap);
      const bpm = storeSnap.bpm;
      for (const track of currentTracks) {
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
          const clipEnd = clip.startTick + clip.duration;
          // Only schedule clips that overlap the loop region
          if (clipEnd > loopStart && clip.startTick < loopEnd) {
            audioClipScheduler.scheduleClip({
              buffer: audioBuffer,
              clip,
              trackEngine: state.trackEngine,
              fromTick: loopStart,
              bpm,
              pedalInput,
            });
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
      scheduleMasterAutomation(automationScheduler, loopStart, bpm);
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
      audioTakeSettleRef.current?.();
      const settleThisTake = beginTake('audio', {
        alive: () => audioRecorderRef.current === recorder,
      });
      audioTakeSettleRef.current = settleThisTake;

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
            // Stopped (or the editor closed) while the browser was still
            // asking for the mic: don't start a take nobody will finish.
            if (audioRecorderRef.current !== recorder) {
              stream.getTracks().forEach((track) => track.stop());
              return;
            }
            recorder.startRecording(stream);
            startLiveAnalyser(stream, recordArmedAudioTrack.id);
          })
          .catch((err) => {
            console.warn('Audio recording failed:', err);
            audioRecorderRef.current = null;
            settleThisTake();
            if (audioTakeSettleRef.current === settleThisTake) {
              audioTakeSettleRef.current = null;
            }
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
      const settleStart = audioTakeSettleRef.current;
      audioTakeSettleRef.current = null;

      // finishAudioTake counts the commit before the start's count goes.
      if (wasRecording && recorder) {
        finishAudioTake(recorder, recordStartTickRef.current, tokenRef);
      }
      settleStart?.();
    }
  }, [isReady, isPlaying, isRecording, tracks]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // A take still running when the editor closes is kept, as Stop would
      // keep it: the recording effect above never sees the pause from here.
      // Before the engines go, so a guitar/vocal tap is closed first.
      //
      // Known limits: the clip lands once the take is decoded, after the
      // editor has gone, so the crash-recovery autosave only writes it when
      // the editor next opens. In a collab room it stays on this device, as
      // a MIDI take does (see useMidiRecording). Revisit with 1.3.
      const recorder = audioRecorderRef.current;
      audioRecorderRef.current = null;
      isActivelyRecordingRef.current = false;
      const settleStart = audioTakeSettleRef.current;
      audioTakeSettleRef.current = null;
      if (recorder?.isRecording()) {
        finishAudioTake(recorder, recordStartTickRef.current, tokenRef);
      }
      settleStart?.();

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
