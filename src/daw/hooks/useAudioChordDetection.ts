// ── useAudioChordDetection ────────────────────────────────────────────────
// RAF polling hook that detects chords from armed audio tracks (guitar-fx,
// bass-fx, vocal-fx) and writes detected MIDI notes to the store.
// Mounted once in DawApp — no UI output.
//
// Uses AudioChordDetector with HMM temporal smoothing (debouncing handled
// internally by the detector's HMM, not by frame counting).

import { useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from './usePlaybackEngine';
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
import { deriveChordRegionsFromAudioSnapshots } from '@/daw/store/prismSlice';
import type { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import type { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';

const AUDIO_INSTRUMENT_TYPES = new Set(['guitar-fx', 'bass-fx', 'vocal-fx']);
const VOCAL_TYPES = new Set(['vocal-fx']);
const THROTTLE_MS = 50; // ~20Hz analysis rate

function notesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function useAudioChordDetection(): void {
  const detectorRef = useRef<AudioChordDetector | null>(null);
  const prevNotesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(0);
  const lastTrackIdRef = useRef<string | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const rafRef = useRef(0);
  const recordingChordsRef = useRef<{ tick: number; notes: number[] }[]>([]);
  const wasRecordingRef = useRef(false);
  const recordingStartTickRef = useRef(0);
  const recordingTrackIdRef = useRef<string | null>(null);
  const offlineAnalysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Default to guitar — will be recreated if instrument type changes
    let detector = new AudioChordDetector(16384, 'guitar');
    detectorRef.current = detector;
    let currentInputType: InputType = 'guitar';

    function tick(time: number) {
      rafRef.current = requestAnimationFrame(tick);

      // Throttle to ~20Hz
      if (time - lastTimeRef.current < THROTTLE_MS) return;
      lastTimeRef.current = time;

      // Find the first record-armed audio track with a chord analyser
      const { tracks } = useStore.getState();
      let analyser: AnalyserNode | null = null;
      let activeTrackId: string | null = null;
      let instrumentType: string | null = null;

      for (const t of tracks) {
        if (!t.recordArmed || !AUDIO_INSTRUMENT_TYPES.has(t.instrument))
          continue;
        const entry = trackEngineRegistry.get(t.id);
        if (!entry) continue;
        const adapter = entry.instrument as
          | (GuitarFxAdapter & {
              getChordAnalyserNode?: () => AnalyserNode | null;
            })
          | (VocalFxAdapter & {
              getChordAnalyserNode?: () => AnalyserNode | null;
            })
          | null;
        if (adapter?.getChordAnalyserNode) {
          analyser = adapter.getChordAnalyserNode();
          if (analyser) {
            activeTrackId = t.id;
            instrumentType = t.instrument;
            break;
          }
        }
      }

      if (!analyser) {
        // No armed audio track — clear if we had notes
        if (prevNotesRef.current.length > 0) {
          prevNotesRef.current = [];
          useStore.getState().setAudioActiveNotes([]);
        }
        if (lastTrackIdRef.current !== null) {
          detector.reset();
          lastTrackIdRef.current = null;
        }
        return;
      }

      // Reset HMM when track changes
      if (activeTrackId !== lastTrackIdRef.current) {
        lastTrackIdRef.current = activeTrackId;
        // Recreate detector if input type changed
        const newInputType: InputType = VOCAL_TYPES.has(instrumentType!)
          ? 'vocal'
          : 'guitar';
        if (newInputType !== currentInputType) {
          currentInputType = newInputType;
          detector = new AudioChordDetector(16384, newInputType);
          detectorRef.current = detector;
        } else {
          detector.reset();
        }
      }

      // Update key context: prefer MusicIntelligenceBus (UNISON-detected key),
      // fall back to manually-set session key from prism store
      const { rootNote, mode, detectedKeyRootPc, detectedMode } =
        useStore.getState();
      const busRoot = detectedKeyRootPc;
      const busMode = detectedMode;
      const effectiveRoot = busRoot ?? rootNote;
      const effectiveMode = busMode ?? mode;
      const keyStr =
        effectiveRoot !== null ? `${effectiveRoot}:${effectiveMode}` : null;
      if (keyStr !== lastKeyRef.current) {
        lastKeyRef.current = keyStr;
        if (effectiveRoot !== null && effectiveMode) {
          const intervals = ALL_MODES[effectiveMode];
          if (intervals) {
            detector.setKeyContext(effectiveRoot, intervals);
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
      if (!notesEqual(notes, prevNotesRef.current)) {
        prevNotesRef.current = notes;
        useStore.getState().setAudioActiveNotes(notes);
      }

      // Push live chord to MusicIntelligenceBus for live UNISON analysis
      if (result && result.confidence > 0.5) {
        useStore.getState().pushLiveChord({
          rootPc: result.rootPc,
          quality: result.quality,
          confidence: result.confidence,
        });
      }

      // Push tuning estimate to MusicIntelligenceBus for shared tuner display
      if (result?.tuningCents !== undefined) {
        useStore.getState().setGlobalTuningCents(result.tuningCents);
      }

      // Capture chord snapshots during audio recording for chord ruler
      const { isPlaying, isRecording, position, bpm } = useStore.getState();
      const currentlyRecording = isPlaying && isRecording;

      if (currentlyRecording && notes.length > 0) {
        // Compensate for vote buffer latency (~300ms group delay)
        const VOTE_LATENCY_MS = 300;
        const latencyTicks = Math.round(
          (VOTE_LATENCY_MS * (bpm * 480)) / 60000,
        );
        const compensatedTick = Math.max(0, position - latencyTicks);
        recordingChordsRef.current.push({
          tick: compensatedTick,
          notes: [...notes],
        });
      }

      // Track recording start for offline analysis
      if (currentlyRecording && !wasRecordingRef.current) {
        recordingStartTickRef.current = position;
        recordingTrackIdRef.current = activeTrackId;
      }

      if (wasRecordingRef.current && !currentlyRecording) {
        // Recording just stopped — derive chord regions from live snapshots (instant)
        const {
          rootNote,
          mode,
          setChordRegions,
          tracks: storeTracks,
          bpm,
        } = useStore.getState();
        if (recordingChordsRef.current.length > 0) {
          const regions = deriveChordRegionsFromAudioSnapshots(
            recordingChordsRef.current,
            (rootNote ?? 0) + 48,
            mode,
          );
          setChordRegions(regions);
        }

        // Schedule offline refinement — runs async, overwrites with more accurate results
        const capturedTrackId = recordingTrackIdRef.current;
        const capturedStartTick = recordingStartTickRef.current;
        const capturedBpm = bpm;
        if (capturedTrackId) {
          const track = storeTracks.find((t) => t.id === capturedTrackId);
          const lastClip = track?.audioClips[track.audioClips.length - 1];
          if (lastClip) {
            // Delay slightly to ensure AudioBuffer is stored (recording stop is async)
            offlineAnalysisTimerRef.current = setTimeout(() => {
              const audioBuffer = getAudioBuffer(lastClip.id);
              if (!audioBuffer) return;
              const { rootNote: rn, mode: m } = useStore.getState();
              const effectiveRoot = rn ?? 0;
              const modeIntervals = m ? ALL_MODES[m] : undefined;
              const offlineFrames = analyzeChords(
                audioBuffer,
                effectiveRoot,
                modeIntervals,
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
              if (refinedRegions.length > 0) {
                useStore.getState().setChordRegions(refinedRegions, true);
              }

              // Run full UNISON analysis only if user has already activated it
              if (useStore.getState().unisonDoc) {
                useStore.getState().analyzeAudio(audioBuffer, {
                  bpm: capturedBpm,
                  keyRootPc: effectiveRoot,
                  modeIntervals,
                });
              }
            }, 500); // wait for AudioBuffer to be stored
          }
        }

        recordingChordsRef.current = [];
      }

      wasRecordingRef.current = currentlyRecording;
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (offlineAnalysisTimerRef.current) {
        clearTimeout(offlineAnalysisTimerRef.current);
        offlineAnalysisTimerRef.current = null;
      }
      useStore.getState().setAudioActiveNotes([]);
    };
  }, []);
}
