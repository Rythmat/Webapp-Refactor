import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { useStore, type InstrumentType } from '@/daw/store';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { TrackEngine } from '@/daw/audio/TrackEngine';
import { MidiScheduler } from '@/daw/audio/MidiScheduler';
import { AudioClipScheduler } from '@/daw/audio/AudioClipScheduler';
import { MetronomeEngine } from '@/daw/audio/MetronomeEngine';
import { AudioRecorder } from '@/daw/audio/AudioRecorder';
import { setAudioBuffer, getAudioBuffer } from '@/daw/audio/AudioBufferStore';
import {
  renderPitchEdits,
  pitchEditCacheKey,
} from '@/daw/audio/pitch-analysis/PitchRenderer';
import { seekTo } from '@/daw/hooks/useTransport';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { PianoSampler } from '@/daw/instruments/PianoSampler';
import { SamplerInstrument } from '@/daw/instruments/SamplerInstrument';
import {
  ELECTRIC_PIANO_CONFIG,
  CELLO_CONFIG,
  ORGAN_CONFIG,
} from '@/daw/instruments/sampleConfigs';
import { DrumMachineEngine } from '@/daw/instruments/DrumMachineEngine';
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

function createInstrument(
  type: InstrumentType,
  gmProgram?: number,
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
      return new DrumMachineEngine();
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

export function usePlaybackEngine(isReady: boolean) {
  const trackAudioRef = useRef(trackEngineRegistry);
  const schedulerRef = useRef(new MidiScheduler());
  const audioClipSchedulerRef = useRef(new AudioClipScheduler());
  const metronomeRef = useRef<MetronomeEngine | null>(null);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const recordStartTickRef = useRef<number>(0);
  const isActivelyRecordingRef = useRef(false);
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
        state.trackEngine.dispose();
        audioMap.delete(id);
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
          continue;
        }
      }

      const trackEngine = new TrackEngine(ctx, masterGain);
      trackEngine.setVolume(track.volume);
      trackEngine.setPan(track.pan);
      trackEngine.updateEffects(track.effects);

      const instrument = createInstrument(track.instrument, track.gmProgram);

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

  // ── Schedule / cancel MIDI + audio clips on play/stop ───────────────────
  useEffect(() => {
    if (!isReady) return;

    const scheduler = schedulerRef.current;
    const audioClipScheduler = audioClipSchedulerRef.current;
    const audioMap = trackAudioRef.current;

    // Always cancel previous schedule before re-scheduling
    scheduler.cancelAll();
    audioClipScheduler.cancelAll();

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
          );
        }
      }
    } else {
      // Immediately silence all notes (no release envelope)
      for (const [, state] of audioMap) {
        state.trackEngine.panic();
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

    // After count-in completes, start transport + recording
    const timer = setTimeout(
      () => {
        useStore.getState()._startRecordingAfterCountIn();
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

    if (isPlaying && isRecording && recordArmedAudioTrack) {
      // Guard: don't re-create recorder if already recording (effect re-runs
      // when `tracks` changes during recording, e.g. MIDI clips added)
      if (isActivelyRecordingRef.current) return;
      isActivelyRecordingRef.current = true;

      // Start recording
      const recorder = new AudioRecorder();
      audioRecorderRef.current = recorder;
      recordStartTickRef.current = useStore.getState().position;

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

      if (adapter) {
        // Tap the pedal chain output (after amp model, before muteGain)
        const stream = adapter.startRecordingStream();
        recorder.startRecording(stream);
        startLiveAnalyser(stream, recordArmedAudioTrack.id);
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
          });
      }
    } else if (audioRecorderRef.current?.isRecording()) {
      // Stop recording and create audio clip
      isActivelyRecordingRef.current = false;

      // Stop live waveform analyser
      cancelAnimationFrame(liveAudioRafRef.current);
      liveAudioSourceRef.current?.disconnect();
      liveAudioAnalyserRef.current?.disconnect();
      liveAudioSourceRef.current = null;
      liveAudioAnalyserRef.current = null;
      liveAudioPeaksRef.current = [];
      useStore.getState().clearLiveAudioRecording();

      const recorder = audioRecorderRef.current;
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
        .then((audioBuffer) => {
          const clipId = `clip-audio-${crypto.randomUUID().slice(0, 8)}`;
          setAudioBuffer(clipId, audioBuffer);

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
            // Auto-rewind playhead to clip start so next play replays the recording
            seekTo(startTick);
          }
        })
        .catch((err) => {
          console.warn('Failed to stop audio recording:', err);
        });

      audioRecorderRef.current = null;
    } else {
      isActivelyRecordingRef.current = false;
    }
  }, [isReady, isPlaying, isRecording, tracks]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      schedulerRef.current.cancelAll();
      audioClipSchedulerRef.current.cancelAll();
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
