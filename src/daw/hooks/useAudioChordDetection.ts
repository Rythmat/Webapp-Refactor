// ── useAudioChordDetection ────────────────────────────────────────────────
// Detects chords from armed Audio tracks (a voice: audioSource) and
// writes detected MIDI notes to the store. Mounted once in DawApp, no UI.
//
// The analysis runs as an engineClock task at ~20 Hz, registered only while
// a record-armed audio track has an engine with a chord analyser. Which
// tracks are armed comes from a store subscription and the engines from the
// engine-ready notice, so an editor with nothing armed makes no frame calls.
//
// Uses AudioChordDetector with HMM temporal smoothing (debouncing handled
// internally by the detector's HMM, not by frame counting).

import { audioSourceOf, type AudioSource } from '@/daw/audio/audioSource';
import { useEffect } from 'react';
import { useStore } from '@/daw/store';
import { selectEffectiveKey } from '@/daw/harmony/effectiveKey';
import { subscribeEngineReady, trackEngineRegistry } from './usePlaybackEngine';
import { addFrameTask } from '@/daw/engine/engineClock';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import {
  AudioChordDetector,
  type InputType,
} from '@/daw/audio/AudioChordDetector';
import {
  analyzeChords,
  offlineFramesToSnapshots,
} from '@/daw/audio/OfflineChordAnalyzer';
import { getAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { CHORDS, ALL_MODES } from '@prism/engine';
import {
  deriveChordRegionsFromAudioSnapshots,
  type ChordRegion,
} from '@/daw/store/prismSlice';
import { takeWritesChords, writeHeardChords } from '@/daw/harmony/takeChords';
import { withTransaction, withoutHistory } from '@/daw/store/history';
import { audioChordAnalysis } from '@/daw/utils/chordAnalysis';
import type { InstrumentAdapter } from '@/daw/instruments/InstrumentAdapter';

/** Audio tracks: a voice (audioSource) is heard one note at a time. */
const AUDIO_INSTRUMENT_TYPES = new Set(['audio-input']);
const ANALYSIS_FPS = 20;
// Compensates for the detector's vote buffer (~300 ms group delay).
const VOTE_LATENCY_MS = 300;
/** How often (ms) an audio take's chords are written while it plays. */
const LIVE_CHORDS_MS = 500;

interface ChordSource {
  trackId: string;
  /** What it records (audioSource): a voice is heard one note at a time. */
  source: AudioSource;
  /** The engine's adapter: a new one under the same track id is a new input. */
  adapter: InstrumentAdapter;
  analyser: AnalyserNode;
}

/** The first record-armed audio track whose engine has a chord analyser. */
function findChordSource(): ChordSource | null {
  for (const t of useStore.getState().tracks) {
    if (!t.recordArmed || !AUDIO_INSTRUMENT_TYPES.has(t.instrument)) continue;
    const adapter = trackEngineRegistry.get(t.id)?.instrument as
      | (InstrumentAdapter & {
          getChordAnalyserNode?: () => AnalyserNode | null;
        })
      | null
      | undefined;
    const analyser = adapter?.getChordAnalyserNode?.() ?? null;
    if (adapter && analyser) {
      return { trackId: t.id, source: audioSourceOf(t), adapter, analyser };
    }
  }
  return null;
}

/** The armed audio tracks, as a key that changes only when they do. */
function armedAudioKey(s: ReturnType<typeof useStore.getState>): string {
  let key = '';
  for (const t of s.tracks) {
    if (t.recordArmed && AUDIO_INSTRUMENT_TYPES.has(t.instrument)) {
      key += `${t.id}:${audioSourceOf(t)};`;
    }
  }
  return key;
}

function notesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function useAudioChordDetection(): void {
  useEffect(() => {
    // Made on first use: an editor with no armed audio track never needs one.
    let detector: AudioChordDetector | null = null;
    let currentInputType: InputType = 'guitar';
    let lastSource: ChordSource | null = null;
    let lastKey: string | null = null;
    let prevNotes: number[] = [];
    let lastPushed: { rootPc: number; quality: string } | null = null;
    let lastTuning: number | null = null;
    let stopTask: (() => void) | null = null;

    let recordingChords: { tick: number; notes: number[] }[] = [];
    let wasRecording = false;
    let recordingStartTick = 0;
    let recordingTrackId: string | null = null;
    // The chord ruler at punch-in, once the take's live chords wrote to it
    // (Auto on), and when they last did.
    let laneBefore: ChordRegion[] | null = null;
    let chordsReadAt = 0;
    let offlineAnalysisTimer: ReturnType<typeof setTimeout> | null = null;

    const clearNotes = () => {
      if (prevNotes.length > 0) {
        prevNotes = [];
        useStore.getState().setAudioActiveNotes([]);
      }
    };

    /** Start or stop the analysis task to match the armed tracks and engines. */
    const sync = () => {
      const source = findChordSource();
      if (source && !stopTask) {
        stopTask = addFrameTask(tick, {
          fps: ANALYSIS_FPS,
          name: 'audio-chord-detection',
        });
      } else if (!source && stopTask) {
        stopTask();
        stopTask = null;
        clearNotes();
        detector?.reset();
        lastSource = null;
      }
    };

    function tick() {
      const source = findChordSource();
      if (!source) {
        // Disarmed or the engine went away between notices.
        sync();
        return;
      }
      const { analyser } = source;

      // A different track, or a new engine under the same track (a project
      // reload, an instrument swap): the HMM's history is for another input.
      if (
        !detector ||
        source.trackId !== lastSource?.trackId ||
        source.adapter !== lastSource?.adapter
      ) {
        const inputType: InputType =
          source.source === 'voice' ? 'vocal' : 'guitar';
        if (!detector || inputType !== currentInputType) {
          currentInputType = inputType;
          detector = new AudioChordDetector(16384, inputType);
          lastKey = null;
        } else {
          detector.reset();
        }
      }
      lastSource = source;

      // Key context: the student's key, else a detected one while none is
      // set (effectiveKey); no key, no prior. The detected key used to win.
      const key = selectEffectiveKey(useStore.getState());
      const keyStr = key ? `${key.rootPc}:${key.mode}` : null;
      if (keyStr !== lastKey) {
        lastKey = keyStr;
        if (key) {
          const intervals = ALL_MODES[key.mode];
          if (intervals) {
            detector.setKeyContext(key.rootPc, intervals);
          } else {
            detector.clearKeyContext();
          }
        } else {
          detector.clearKeyContext();
        }
      }

      const result = detector.analyze(analyser);

      // Convert chord result to MIDI notes (octave 4 = 60-71)
      let notes: number[];
      if (!result) {
        notes = [];
      } else {
        const { rootPc, quality } = result;
        const base = 60 + rootPc;
        const intervals: number[] | undefined = CHORDS[quality];
        if (intervals) {
          notes = intervals
            .map((iv: number) => base + iv)
            .sort((a: number, b: number) => a - b);
        } else {
          notes = [base];
        }
      }

      // Only update store when notes actually change (HMM handles debouncing)
      if (!notesEqual(notes, prevNotes)) {
        prevNotes = notes;
        useStore.getState().setAudioActiveNotes(notes);
      }

      // Push live chord to MusicIntelligenceBus for live UNISON analysis,
      // once per chord change (the stream is a list of changes).
      if (
        result &&
        result.confidence > 0.5 &&
        (result.rootPc !== lastPushed?.rootPc ||
          result.quality !== lastPushed?.quality)
      ) {
        lastPushed = { rootPc: result.rootPc, quality: result.quality };
        useStore.getState().pushLiveChord({
          rootPc: result.rootPc,
          quality: result.quality,
          confidence: result.confidence,
        });
      }

      // Push tuning estimate to MusicIntelligenceBus for shared tuner display,
      // to the cent the tuner shows, and only when that changes.
      if (result?.tuningCents !== undefined) {
        const cents = Math.round(result.tuningCents);
        if (cents !== lastTuning) {
          lastTuning = cents;
          useStore.getState().setGlobalTuningCents(cents);
        }
      }

      // Capture chord snapshots during audio recording for chord ruler. The
      // store's position is parked during playback: read the live playhead.
      const { isPlaying, isRecording, bpm } = useStore.getState();
      if (isPlaying && isRecording && notes.length > 0) {
        if (recordingTrackId === null) recordingTrackId = source.trackId;
        const latencyTicks = Math.round(
          (VOTE_LATENCY_MS * (bpm * 480)) / 60000,
        );
        const tick = Math.max(0, getPlayheadTick() - latencyTicks);
        recordingChords.push({ tick, notes: [...notes] });
        // Auto chords: the take's chords on the ruler as it plays, outside
        // undo (finishRecording writes them as one step).
        const now = performance.now();
        if (
          now - chordsReadAt >= LIVE_CHORDS_MS &&
          takeWritesChords(recordingTrackId)
        ) {
          chordsReadAt = now;
          const base = laneBefore ?? useStore.getState().chordRegions;
          laneBefore = base;
          withoutHistory(() =>
            writeHeardChords(recordingChords, recordingStartTick, tick, base),
          );
        }
      }
    }

    /**
     * Recording just stopped: the chords heard go on the chord ruler (Auto
     * on), else Insight proposes them.
     */
    const finishRecording = () => {
      const {
        rootNote,
        mode,
        proposeChordSymbols,
        tracks: storeTracks,
        bpm,
      } = useStore.getState();
      // Auto chords: the ruler goes back to how it was at punch-in, then the
      // take's chords land as one undo step. The offline read below writes
      // its better ones over the same span, on that same ruler.
      const autoChords = takeWritesChords(recordingTrackId);
      const takeBase = laneBefore ?? useStore.getState().chordRegions;
      if (laneBefore !== null) {
        const before = laneBefore;
        withoutHistory(() => useStore.setState({ chordRegions: before }));
      }
      laneBefore = null;
      chordsReadAt = 0;
      const takeEnd =
        recordingChords.length > 0
          ? recordingChords[recordingChords.length - 1].tick + 1
          : recordingStartTick;
      if (autoChords && recordingChords.length > 0) {
        const heard = recordingChords;
        withTransaction('Chords from take', () =>
          writeHeardChords(heard, recordingStartTick, takeEnd, takeBase),
        );
      } else if (recordingChords.length > 0) {
        // Propose chord symbols from the live snapshots (instant). Insight
        // offers them; the chord lane only takes them on "Use Chord Symbols".
        const regions = deriveChordRegionsFromAudioSnapshots(
          recordingChords,
          (rootNote ?? 0) + 48,
          mode,
        );
        proposeChordSymbols(audioChordAnalysis(regions, rootNote ?? 0, mode));
      }

      // Schedule offline refinement — runs async, replaces the proposal with more accurate results
      const capturedTrackId = recordingTrackId;
      const capturedStartTick = recordingStartTick;
      const capturedBpm = bpm;
      if (capturedTrackId) {
        // The take's clip lands after the stop (the recorder finishes
        // async): it is the clip on the track that wasn't there now.
        const clipsAtStop = new Set(
          storeTracks
            .find((t) => t.id === capturedTrackId)
            ?.audioClips.map((c) => c.id) ?? [],
        );
        // Delay slightly to ensure AudioBuffer is stored (recording stop is async)
        offlineAnalysisTimer = setTimeout(() => {
          offlineAnalysisTimer = null;
          const takeClip = useStore
            .getState()
            .tracks.find((t) => t.id === capturedTrackId)
            ?.audioClips.find((c) => !clipsAtStop.has(c.id));
          if (!takeClip) return;
          const audioBuffer = getAudioBuffer(takeClip.id);
          if (!audioBuffer) return;
          const { rootNote: rn, mode: m } = useStore.getState();
          // The chords are named in C when no key is set, as the proposal
          // above names them, but the analysis gets no key prior then: it
          // used to assume C major and favour its roots.
          const effectiveRoot = rn ?? 0;
          const key = selectEffectiveKey(useStore.getState());
          const offlineFrames = analyzeChords(
            audioBuffer,
            key?.rootPc,
            key ? ALL_MODES[key.mode] : undefined,
            capturedBpm,
          );
          if (offlineFrames.length === 0) return;
          const snapshots = offlineFramesToSnapshots(
            offlineFrames,
            capturedStartTick,
            capturedBpm,
            audioBuffer.sampleRate,
          );
          const refinedRegions = deriveChordRegionsFromAudioSnapshots(
            snapshots,
            effectiveRoot + 48,
            m,
          );
          if (refinedRegions.length > 0 && autoChords) {
            // Over the take's span, on the ruler as it was before the take:
            // undoing the take's chords still goes back to that.
            withoutHistory(() =>
              writeHeardChords(snapshots, capturedStartTick, takeEnd, takeBase),
            );
          } else if (refinedRegions.length > 0) {
            useStore
              .getState()
              .proposeChordSymbols(
                audioChordAnalysis(refinedRegions, effectiveRoot, m),
              );
          }

          // Run full UNISON analysis only if user has already activated it
          if (useStore.getState().unisonDoc) {
            useStore.getState().analyzeAudio(audioBuffer, {
              bpm: capturedBpm,
              keyRootPc: key?.rootPc,
              modeIntervals: key ? ALL_MODES[key.mode] : undefined,
            });
          }
        }, 500); // wait for AudioBuffer to be stored
      }

      recordingChords = [];
      recordingTrackId = null;
    };

    // Recording start and stop come from the store, not from the analysis
    // frames, so a take still finishes when its track lost its analyser
    // (disarmed, engine swapped) before the stop.
    const onRecordingChange = (recording: boolean) => {
      if (recording && !wasRecording) {
        recordingStartTick = getPlayheadTick();
        recordingTrackId = findChordSource()?.trackId ?? null;
        recordingChords = [];
      } else if (!recording && wasRecording) {
        finishRecording();
      }
      wasRecording = recording;
    };

    const unsubscribeArmed = useStore.subscribe(armedAudioKey, sync);
    const unsubscribeRecording = useStore.subscribe(
      (s) => s.isPlaying && s.isRecording,
      onRecordingChange,
    );
    const unsubscribeEngines = subscribeEngineReady(sync);
    onRecordingChange(
      useStore.getState().isPlaying && useStore.getState().isRecording,
    );
    sync();

    return () => {
      unsubscribeArmed();
      unsubscribeRecording();
      unsubscribeEngines();
      stopTask?.();
      stopTask = null;
      if (offlineAnalysisTimer) {
        clearTimeout(offlineAnalysisTimer);
        offlineAnalysisTimer = null;
      }
      useStore.getState().setAudioActiveNotes([]);
    };
  }, []);
}
