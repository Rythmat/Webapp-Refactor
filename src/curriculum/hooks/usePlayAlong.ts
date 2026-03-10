/**
 * Phase 17 — Play-Along Hook.
 *
 * Manages Tone.js playback state for a curriculum play-along session.
 * Handles transport scheduling, count-in metronome, instrument muting,
 * tempo control, looping, and tick tracking.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import type { PlayAlongTrack } from '../engine/playAlongGenerator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayAlongState {
  /** Whether playback is currently active */
  isPlaying: boolean;
  /** Current tick position (negative during count-in) */
  currentTick: number;
  /** Tempo in BPM */
  tempo: number;
  /** Whether to loop playback */
  loop: boolean;
  /** Per-track mute state */
  muted: {
    drums: boolean;
    bass: boolean;
    chords: boolean;
    melody: boolean;
  };
  /** Count-in bars (0 = no count-in) */
  countInBars: number;
  /** Whether count-in is in progress */
  isCountingIn: boolean;
}

export interface PlayAlongControls {
  /** Start playback (with optional count-in) */
  start: () => Promise<void>;
  /** Stop playback and reset position */
  stop: () => void;
  /** Pause playback at current position */
  pause: () => void;
  /** Toggle a track's mute state */
  toggleMute: (track: keyof PlayAlongState['muted']) => void;
  /** Set tempo in BPM */
  setTempo: (bpm: number) => void;
  /** Toggle loop mode */
  toggleLoop: () => void;
  /** Set count-in bars */
  setCountInBars: (bars: number) => void;
}

const TICKS_PER_QUARTER = 480;
const TICKS_PER_BAR = TICKS_PER_QUARTER * 4;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlayAlong(
  track: PlayAlongTrack | null,
  initialTempo: number = 120,
): [PlayAlongState, PlayAlongControls] {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);
  const [tempo, setTempoState] = useState(initialTempo);
  const [loop, setLoop] = useState(true);
  const [countInBars, setCountInBars] = useState(1);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [muted, setMuted] = useState({
    drums: false,
    bass: false,
    chords: false,
    melody: true, // melody muted by default — student plays it
  });

  // Refs for Tone.js objects
  const partsRef = useRef<{
    drums?: Tone.Part;
    bass?: Tone.Part;
    chords?: Tone.Part;
    melody?: Tone.Part;
  }>({});
  const metronomeSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const pianoSynthRef = useRef<Tone.PolySynth | null>(null);
  const drumSynthRef = useRef<Tone.NoiseSynth | null>(null);
  const bassSynthRef = useRef<Tone.MonoSynth | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const mutedRef = useRef(muted);

  // Keep muted ref in sync
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeAll();
    };
  }, []);

  // Initialize synths lazily
  const ensureSynths = useCallback(() => {
    if (!metronomeSynthRef.current) {
      metronomeSynthRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
        volume: -6,
      }).toDestination();
    }

    if (!pianoSynthRef.current) {
      pianoSynthRef.current = new Tone.PolySynth(Tone.Synth, {
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
        oscillator: { type: 'triangle' },
        volume: -10,
      }).toDestination();
    }

    if (!drumSynthRef.current) {
      drumSynthRef.current = new Tone.NoiseSynth({
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
        volume: -8,
      }).toDestination();
    }

    if (!bassSynthRef.current) {
      bassSynthRef.current = new Tone.MonoSynth({
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
        oscillator: { type: 'triangle' },
        filterEnvelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.5,
          release: 0.2,
          baseFrequency: 200,
          octaves: 2,
        },
        volume: -6,
      }).toDestination();
    }
  }, []);

  /**
   * Convert MIDI note number to Tone.js frequency notation.
   */
  const midiToFreq = useCallback((midi: number): string => {
    return Tone.Frequency(midi, 'midi').toNote();
  }, []);

  /**
   * Convert ticks to seconds at current tempo.
   */
  const ticksToSeconds = useCallback(
    (ticks: number): number => {
      const secondsPerBeat = 60 / tempo;
      return (ticks / TICKS_PER_QUARTER) * secondsPerBeat;
    },
    [tempo],
  );

  /**
   * Dispose all Tone.js parts and synths.
   */
  const disposeAll = useCallback(() => {
    Object.values(partsRef.current).forEach((part) => {
      if (part) {
        part.stop();
        part.dispose();
      }
    });
    partsRef.current = {};

    if (tickIntervalRef.current !== null) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  /**
   * Schedule all track events as Tone.Parts.
   */
  const scheduleTracks = useCallback(() => {
    if (!track) return;

    disposeAll();
    ensureSynths();

    const scheduleTrack = (
      events: Array<{ note: number; onset: number; duration: number }>,
      trackName: keyof typeof muted,
    ): Tone.Part | undefined => {
      if (events.length === 0) return undefined;

      const toneEvents = events.map((e) => ({
        time: ticksToSeconds(e.onset),
        note: e.note,
        duration: ticksToSeconds(e.duration),
      }));

      const part = new Tone.Part((time, value) => {
        if (mutedRef.current[trackName]) return;

        if (trackName === 'drums') {
          // Use noise synth for drums (simplified — a full implementation
          // would use samples per instrument via DrumMachineEngine)
          drumSynthRef.current?.triggerAttackRelease(value.duration, time);
        } else if (trackName === 'bass') {
          bassSynthRef.current?.triggerAttackRelease(
            midiToFreq(value.note),
            value.duration,
            time,
          );
        } else {
          // Chords and melody use PolySynth
          pianoSynthRef.current?.triggerAttackRelease(
            midiToFreq(value.note),
            value.duration,
            time,
          );
        }
      }, toneEvents);

      part.start(0);
      return part;
    };

    partsRef.current.drums = scheduleTrack(track.drums, 'drums');
    partsRef.current.bass = scheduleTrack(track.bass, 'bass');
    partsRef.current.chords = scheduleTrack(track.chords, 'chords');
    partsRef.current.melody = scheduleTrack(track.melody, 'melody');
  }, [track, ticksToSeconds, ensureSynths, disposeAll, midiToFreq]);

  /**
   * Play count-in metronome clicks.
   */
  const playCountIn = useCallback(async (): Promise<void> => {
    if (countInBars <= 0) return;

    ensureSynths();
    setIsCountingIn(true);

    const totalBeats = countInBars * 4;
    const beatDuration = 60 / tempo;

    return new Promise<void>((resolve) => {
      let beat = 0;
      const countInTicks = -(countInBars * TICKS_PER_BAR);

      const interval = setInterval(() => {
        if (beat >= totalBeats) {
          clearInterval(interval);
          setIsCountingIn(false);
          resolve();
          return;
        }

        // Accent on beat 1
        const pitch = beat % 4 === 0 ? 'C4' : 'C3';
        metronomeSynthRef.current?.triggerAttackRelease(pitch, '16n');

        setCurrentTick(countInTicks + beat * TICKS_PER_QUARTER);
        beat++;
      }, beatDuration * 1000);
    });
  }, [countInBars, tempo, ensureSynths]);

  /**
   * Start playback.
   */
  const start = useCallback(async () => {
    if (!track || isPlayingRef.current) return;

    await Tone.start();
    Tone.getTransport().bpm.value = tempo;

    // Count-in
    await playCountIn();

    // Schedule and start
    scheduleTracks();
    setCurrentTick(0);

    const totalSeconds = ticksToSeconds(track.totalTicks);

    Tone.getTransport().start();
    setIsPlaying(true);
    isPlayingRef.current = true;

    // Tick tracking interval (~60fps)
    const startTime = Tone.now();
    tickIntervalRef.current = window.setInterval(() => {
      if (!isPlayingRef.current) return;

      const elapsed = Tone.now() - startTime;
      const tick = Math.floor((elapsed / totalSeconds) * track.totalTicks);

      if (tick >= track.totalTicks) {
        if (loop) {
          // Restart for loop — re-schedule from beginning
          Tone.getTransport().stop();
          disposeAll();
          scheduleTracks();
          Tone.getTransport().start();
          setCurrentTick(0);
        } else {
          // Stop playback
          Tone.getTransport().stop();
          setIsPlaying(false);
          isPlayingRef.current = false;
          setCurrentTick(0);
          disposeAll();
        }
      } else {
        setCurrentTick(tick);
      }
    }, 16);
  }, [
    track,
    tempo,
    loop,
    playCountIn,
    scheduleTracks,
    ticksToSeconds,
    disposeAll,
  ]);

  /**
   * Stop playback and reset.
   */
  const stop = useCallback(() => {
    Tone.getTransport().stop();
    disposeAll();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTick(0);
    setIsCountingIn(false);
  }, [disposeAll]);

  /**
   * Pause playback at current position.
   */
  const pause = useCallback(() => {
    Tone.getTransport().pause();
    setIsPlaying(false);
    isPlayingRef.current = false;

    if (tickIntervalRef.current !== null) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  /**
   * Toggle mute for a track.
   */
  const toggleMute = useCallback((trackName: keyof PlayAlongState['muted']) => {
    setMuted((prev) => ({ ...prev, [trackName]: !prev[trackName] }));
  }, []);

  /**
   * Set tempo.
   */
  const setTempo = useCallback((bpm: number) => {
    setTempoState(bpm);
    Tone.getTransport().bpm.value = bpm;
  }, []);

  /**
   * Toggle loop.
   */
  const toggleLoop = useCallback(() => {
    setLoop((prev) => !prev);
  }, []);

  const state: PlayAlongState = {
    isPlaying,
    currentTick,
    tempo,
    loop,
    muted,
    countInBars,
    isCountingIn,
  };

  const controls: PlayAlongControls = useMemo(
    () => ({
      start,
      stop,
      pause,
      toggleMute,
      setTempo,
      toggleLoop,
      setCountInBars,
    }),
    [start, stop, pause, toggleMute, setTempo, toggleLoop],
  );

  return [state, controls];
}
