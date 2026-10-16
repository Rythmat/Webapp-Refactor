import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { showError } from '@/components/utils/toast';
import { useStore } from '@/daw/store';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { getPlaybackLoop } from '@/daw/store/transportSlice';
import { masteringEffectsForEngine } from '@/daw/store/masteringSlice';
import { MidiScheduler } from '@/daw/audio/MidiScheduler';
import { AudioClipScheduler } from '@/daw/audio/AudioClipScheduler';
import { AutomationScheduler } from '@/daw/audio/AutomationScheduler';
import { MASTER_AUTOMATION_ID } from '@/daw/audio/automationParams';
import { MetronomeEngine, clickPitch } from '@/daw/audio/MetronomeEngine';
import { createClickVoice, type ClickVoice } from '@/daw/audio/clickVoice';
import { AudioRecorder } from '@/daw/audio/AudioRecorder';
import {
  setAudioBuffer,
  setOriginalAudio,
  getAudioBuffer,
  subscribeAudioBufferChanges,
} from '@/daw/audio/AudioBufferStore';
import {
  audioClipIntervalsSeconds,
  computeMaxRecordSeconds,
  ticksToSeconds,
} from '@/daw/audio/recordingLimit';
import { overwriteAudioRegion } from '@/daw/audio/overwriteAudioRegion';
import { seekTo } from '@/daw/hooks/useTransport';
import {
  applySamplerState,
  applyStaticMasterVolume,
  applyStaticTrackParams,
  scheduleMasterAutomation,
  trackEngineRegistry,
} from '@/daw/engine/trackAudio';
import { addFrameTask } from '@/daw/engine/engineClock';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import {
  startTrackReconciler,
  type TrackReconciler,
} from '@/daw/engine/trackReconciler';
import { beginTake } from '@/daw/session/takesInFlight';
import { ChopsSampler } from '@/daw/instruments/ChopsSampler';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';

export {
  applyDrumPads,
  applySamplerState,
  applySends,
  applyStaticTrackParams,
  createInstrument,
  getEngineReadyVersion,
  getTrackAudioState,
  subscribeEngineReady,
  trackEngineRegistry,
  type TrackAudioState,
} from '@/daw/engine/trackAudio';

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
  const liveAudioTaskRef = useRef<(() => void) | null>(null);
  const liveAudioPeaksRef = useRef<number[]>([]);

  const countInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countInVoiceRef = useRef<ClickVoice | null>(null);

  const isPlaying = useStore((s) => s.isPlaying);
  const isRecording = useStore((s) => s.isRecording);
  const isCountingIn = useStore((s) => s.isCountingIn);
  const countInBars = useStore((s) => s.countInBars);
  const metronomeEnabled = useStore((s) => s.metronomeEnabled);
  const metronomeSound = useStore((s) => s.metronomeSound);
  const metronomeVolume = useStore((s) => s.metronomeVolume);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  // The piano roll editor's own loop while it's open, else the project loop.
  const loopEnabled = useStore((s) => getPlaybackLoop(s).enabled);
  const masteringEffects = useStore((s) => s.masteringEffects);
  const masteringBypass = useStore((s) => s.masteringBypass);
  const masterVolume = useStore((s) => s.masterVolume);
  const masterAutomation = useStore((s) => s.masterAutomation);
  const returns = useStore((s) => s.returns);

  // ── Track engines follow the store's tracks ──────────────────────────
  // The reconciler listens to the store itself and applies only what
  // changed, track by track (engine/trackReconciler.ts), so the editor
  // doesn't re-render on a track edit to do it.
  const reconcilerRef = useRef<TrackReconciler | null>(null);
  useEffect(() => {
    if (!isReady) return;
    const reconciler = startTrackReconciler(automationSchedulerRef.current);
    reconcilerRef.current = reconciler;
    return () => {
      reconciler.stop();
      if (reconcilerRef.current === reconciler) reconcilerRef.current = null;
    };
  }, [isReady]);

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

  // ── Sync mastering effects with audio engine ─────────────────────────
  // Bypass switches every slot off in the engine only (the stored chain stays).
  useEffect(() => {
    if (!isReady) return;
    audioEngine.updateMasteringEffects(
      masteringEffectsForEngine(masteringEffects, masteringBypass),
      { glide: true },
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
      audioEngine.updateReturnEffects(ret.id, ret.effects, { glide: true });
      audioEngine.setReturnVolume(ret.id, ret.volume);
    }
    // A return added or removed: every track's sends wire to the new set.
    reconcilerRef.current?.reconcile();
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
      metronomeRef.current.init(
        audioEngine.getOutput(),
        metronomeSound,
        metronomeVolume,
      );
    }

    const metro = metronomeRef.current;
    metro.setSound(metronomeSound);
    metro.setVolume(metronomeVolume);
    metro.setTimeSignature(tsNum, tsDen);
    metro.setEnabled(metronomeEnabled);

    if (isPlaying && metronomeEnabled) {
      metro.start();
    } else {
      metro.stop();
    }
  }, [
    isReady,
    isPlaying,
    metronomeEnabled,
    metronomeSound,
    metronomeVolume,
    tsNum,
    tsDen,
  ]);

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

    // A voice of its own for the count-in clicks, in the metronome's sound
    // and volume, straight to the output as the metronome is.
    const voice = createClickVoice(
      storeSnap.metronomeSound,
      audioEngine.getOutput(),
      storeSnap.metronomeVolume,
    );
    countInVoiceRef.current = voice;

    // Schedule all clicks at audio-clock times (no Transport needed)
    const now = Tone.now();
    // Publish the clock the clicks hang off so the on-screen count-off in the
    // notation view can follow the same one, rather than a wall clock that
    // would drift against them.
    useStore.getState()._setCountInStartedAt(now);
    for (let i = 0; i < totalBeats; i++) {
      const time = now + i * beatDuration;
      // Same accents as the metronome (beat 1, compound sub-groups).
      voice.trigger(clickPitch(i % num, num, den) === 'C5', time);
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
      if (countInVoiceRef.current) {
        countInVoiceRef.current.dispose();
        countInVoiceRef.current = null;
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

    // Read when the take starts: the effect doesn't follow track edits, so
    // a collab sync or a clip added mid-take no longer re-runs it.
    const recordArmedAudioTrack = useStore
      .getState()
      .tracks.find((t) => t.type === 'audio' && t.recordArmed);

    // Tear down all live-recording artifacts (waveform task, analyser nodes,
    // the 5-minute cap timer, and the on-screen live peaks). Idempotent and
    // safe to call on any effect run, so a stale task or timer can't survive
    // a stop; cleanup must NOT be conditional on the recorder still
    // "recording".
    const cleanupLiveRecordingArtifacts = () => {
      liveAudioTaskRef.current?.();
      liveAudioTaskRef.current = null;
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
      // Guard: don't re-create the recorder if already recording.
      if (isActivelyRecordingRef.current) return;
      // Clear anything a previous take left behind before starting fresh, so a
      // leaked RAF/timer from a botched teardown can't keep running.
      cleanupLiveRecordingArtifacts();
      isActivelyRecordingRef.current = true;

      // Enforce the per-track 5-minute total-audio cap. Time the take may run
      // is the remaining budget, walked forward from the playhead (time spent
      // over existing audio is free — it just overwrites). If there's no budget
      // and nothing to overwrite at the start, refuse to record.
      // The live playhead: recording can start while already playing.
      const startTickForLimit = Math.round(getPlayheadTick());
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
          // The take's waveform grows about 15 times a second, on the
          // editor's frame loop.
          liveAudioTaskRef.current = addFrameTask(
            () => {
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
            },
            { fps: 15, name: 'record-waveform' },
          );
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
  }, [isReady, isPlaying, isRecording]);

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
      liveAudioTaskRef.current?.();
      liveAudioTaskRef.current = null;
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
