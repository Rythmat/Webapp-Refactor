// ── useLearnInput ────────────────────────────────────────────────────────
// Input hook for the Learn section. Piano (the default) listens for MIDI
// keyboard input only; microphone-based pitch detection was removed because
// stray ambient audio was producing spurious notes and breaking activity
// feedback.
//
// Guitar lessons ('guitar') bring audio back for guitar only, and only once
// guitar.enable() runs from a user gesture — never on mount or start(). The
// guitar engine's notes join the MIDI note subscribers; strummed chords, from
// the engine or from a MIDI guitar's held notes, go to chord subscribers.
//
// Hot-plugging is supported via the Web MIDI API's statechange event so
// devices can be connected/disconnected mid-lesson.
//
// The audio refs and stop logic are preserved so the surrounding state
// surface (capture, inputLevel, noteConfidences, isV2) stays compatible
// with consumers — for piano they just remain at default values.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioContextOwner } from '@/audio/core/AudioContextOwner';
import type { LessonInstrument } from '@/curriculum/types/activity.v2';
import { isV2Enabled } from '@/learn/audio/AudioSystemSelector';
import {
  AudioToMidiAdapter,
  type DetectionMode,
} from '@/learn/audio/AudioToMidiAdapter';
import { LearnAudioCapture } from '@/learn/audio/LearnAudioCapture';
import { GuitarLearnInputEngine } from '@/learn/audio/guitar/GuitarLearnInputEngine';
import { MidiGuitarChordAggregator } from '@/learn/audio/guitar/MidiGuitarChordAggregator';
import {
  loadGuitarInputPrefs,
  saveGuitarInputPrefs,
} from '@/learn/audio/guitar/guitarInputPrefs';
import type {
  GuitarChordEvent,
  GuitarInputHandle,
  GuitarInputPrefs,
  GuitarInputStatus,
} from '@/learn/audio/guitar/types';
import {
  StreamingAudioCapture,
  ProbabilisticOrchestrator,
} from '@/learn/audio/v2';
import type { MidiNoteEvent } from './useMidiInput';

// ── Types ────────────────────────────────────────────────────────────────

export type InputSource = 'midi' | 'audio';

export interface UseLearnInputOptions {
  /** Detection mode for audio input. Activities set this based on their type. */
  detectionMode?: DetectionMode;
  /** Called when a note starts. */
  onNoteOn?: (event: MidiNoteEvent) => void;
  /** Called when a note ends (with duration). */
  onNoteOff?: (event: MidiNoteEvent) => void;
  /**
   * The instrument the lesson teaches, read on mount. Piano (the default) is
   * MIDI only; guitar adds chord events and gesture-started audio input.
   */
  instrument?: LessonInstrument;
}

/** The guitar handle, plus the metronome click filter for audio input. */
export interface LearnGuitarInput extends GuitarInputHandle {
  /**
   * `isClick(perfMs)`: whether an attack heard at `perfMs` (performance.now(),
   * before input latency is removed) falls on a scheduled metronome click.
   * Such attacks only count when clearly played (see GuitarLearnInputEngine).
   */
  setClickFilter(isClick: ((perfMs: number) => boolean) | null): void;
}

export interface UseLearnInputReturn {
  /** Which input source is currently active. */
  activeSource: InputSource;
  /** Whether the input system is listening for notes. */
  isListening: boolean;
  /** Currently active MIDI note numbers. */
  activeNotes: number[];
  /** Audio input RMS level (0–1). 0 when in MIDI mode. */
  inputLevel: number;
  /** Error message, if any. */
  error: string | null;
  /** Name of the active MIDI device, or null. */
  midiDeviceName: string | null;
  /** Start listening. */
  start: () => Promise<void>;
  /** Stop listening. */
  stop: () => void;
  /** Set key context for diatonic priors in audio detection. */
  setKeyContext: (rootPc: number, modeIntervals: number[]) => void;
  /** Clear key context. */
  clearKeyContext: () => void;
  /** Set expected MIDI notes for verification mode. Null = open-ended detection. */
  setExpectedNotes: (notes: number[] | null) => void;
  /** Subscribe to note-on events. Returns unsubscribe function. */
  subscribeNoteOn: (cb: (event: MidiNoteEvent) => void) => () => void;
  /** Subscribe to note-off events. Returns unsubscribe function. */
  subscribeNoteOff: (cb: (event: MidiNoteEvent) => void) => () => void;
  /** The active audio capture instance (for calibration wizard). */
  capture: LearnAudioCapture | null;
  /** Whether the v2 audio system is active. */
  isV2: boolean;
  /** Note confidences from v2 tracker (MIDI → confidence). Empty for v1/MIDI. */
  noteConfidences: Map<number, number>;
  /** The instrument this input serves. */
  instrument: LessonInstrument;
  /** Subscribe to strummed chords (guitar only). Returns unsubscribe. */
  subscribeChord: (cb: (event: GuitarChordEvent) => void) => () => void;
  /**
   * Guitar input controls; null for piano. Its `level` reads live — render
   * meters from `inputLevel`, which updates at ~15 Hz while listening.
   */
  guitar: LearnGuitarInput | null;
}

/** Status while not listening: audio input not set up yet, or ready. */
function idleStatus(prefs: GuitarInputPrefs): GuitarInputStatus {
  return prefs.source === 'audio' && prefs.setupCompletedAt === undefined
    ? 'needs-setup'
    : 'idle';
}

const FAILED = new Set<GuitarInputStatus>(['denied', 'no-device', 'error']);

/** The engine names failures as getUserMedia does. */
function failureStatus(err: unknown): GuitarInputStatus {
  const name = err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'no-device';
  }
  return 'error';
}

function failureMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Guitar input failed';
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useLearnInput(
  options: UseLearnInputOptions = {},
): UseLearnInputReturn {
  const {
    detectionMode = 'monophonic',
    onNoteOn,
    onNoteOff,
    instrument: requestedInstrument = 'piano',
  } = options;

  const [activeSource, setActiveSource] = useState<InputSource>('midi');
  const [isListening, setIsListening] = useState(false);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [inputLevel, setInputLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [midiDeviceName, setMidiDeviceName] = useState<string | null>(null);
  const [capture, setCapture] = useState<LearnAudioCapture | null>(null);

  // Refs for stable callback access
  const onNoteOnRef = useRef(onNoteOn);
  const onNoteOffRef = useRef(onNoteOff);
  onNoteOnRef.current = onNoteOn;
  onNoteOffRef.current = onNoteOff;

  // Subscriber sets for multi-listener support
  const noteOnSubscribersRef = useRef<Set<(event: MidiNoteEvent) => void>>(
    new Set(),
  );
  const noteOffSubscribersRef = useRef<Set<(event: MidiNoteEvent) => void>>(
    new Set(),
  );

  // MIDI state
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const midiListenersRef = useRef<Map<string, (e: MIDIMessageEvent) => void>>(
    new Map(),
  );
  const midiNoteStartsRef = useRef<
    Map<number, { time: number; velocity: number }>
  >(new Map());

  // Audio state
  const captureRef = useRef<LearnAudioCapture | null>(null);
  const adapterRef = useRef<AudioToMidiAdapter | null>(null);
  const levelRafRef = useRef(0);
  const startGenerationRef = useRef(0); // guards async start() against stale completions

  // V2 audio state
  const v2Enabled = useRef(isV2Enabled());
  const v2CaptureRef = useRef<StreamingAudioCapture | null>(null);
  const v2OrchestratorRef = useRef<ProbabilisticOrchestrator | null>(null);
  const [noteConfidences, setNoteConfidences] = useState<Map<number, number>>(
    new Map(),
  );

  // Active notes tracking
  const activeNotesRef = useRef<Set<number>>(new Set());

  const updateActiveNotes = useCallback(() => {
    setActiveNotes(Array.from(activeNotesRef.current));
  }, []);

  // Guitar state. The instrument is fixed for the hook's life; for piano the
  // engine and MIDI chord aggregator are never created.
  const [instrument] = useState(requestedInstrument);
  const chordSubscribersRef = useRef<Set<(event: GuitarChordEvent) => void>>(
    new Set(),
  );
  const [guitarPrefs, setGuitarPrefs] = useState<GuitarInputPrefs | null>(() =>
    instrument === 'guitar' ? loadGuitarInputPrefs() : null,
  );
  const [guitarEngine] = useState(() =>
    guitarPrefs ? new GuitarLearnInputEngine(guitarPrefs) : null,
  );
  const [midiChords] = useState(() =>
    guitarPrefs
      ? new MidiGuitarChordAggregator((event) => {
          for (const cb of chordSubscribersRef.current) cb(event);
        })
      : null,
  );
  const [guitarStatus, setGuitarStatus] = useState<GuitarInputStatus>(() =>
    guitarPrefs ? idleStatus(guitarPrefs) : 'idle',
  );
  const [guitarError, setGuitarError] = useState<string | null>(null);
  const guitarLevelRef = useRef(0);

  // ── MIDI message handler ──────────────────────────────────────────────

  const handleMidiMessage = useCallback(
    (message: MIDIMessageEvent) => {
      if (!message.data) return;
      const status = message.data[0];
      const noteNumber = message.data[1];
      const velocity = message.data[2];
      const command = status & 0xf0;
      const now = performance.now() / 1000;

      if (command === 0x90 && velocity > 0) {
        // Note ON
        midiNoteStartsRef.current.set(noteNumber, { time: now, velocity });
        activeNotesRef.current.add(noteNumber);
        updateActiveNotes();
        const noteOnEvent: MidiNoteEvent = {
          number: noteNumber,
          duration: 0,
          velocity,
          source: 'midi',
        };
        onNoteOnRef.current?.(noteOnEvent);
        for (const cb of noteOnSubscribersRef.current) cb(noteOnEvent);
        midiChords?.noteOn(noteNumber, velocity, performance.now());
      } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
        // Note OFF
        const start = midiNoteStartsRef.current.get(noteNumber);
        if (start) {
          const duration = now - start.time;
          midiNoteStartsRef.current.delete(noteNumber);
          activeNotesRef.current.delete(noteNumber);
          updateActiveNotes();
          const noteOffEvent: MidiNoteEvent = {
            number: noteNumber,
            duration,
            velocity: start.velocity,
            source: 'midi',
          };
          onNoteOffRef.current?.(noteOffEvent);
          for (const cb of noteOffSubscribersRef.current) cb(noteOffEvent);
          midiChords?.noteOff(noteNumber, performance.now());
        }
      }
    },
    [updateActiveNotes, midiChords],
  );

  // ── Start MIDI listening ──────────────────────────────────────────────

  const startMidi = useCallback(
    (midiAccess: MIDIAccess) => {
      // Attach listener to all MIDI inputs
      for (const input of midiAccess.inputs.values()) {
        if (!midiListenersRef.current.has(input.id)) {
          const handler = (e: Event) =>
            handleMidiMessage(e as MIDIMessageEvent);
          input.addEventListener('midimessage', handler);
          midiListenersRef.current.set(
            input.id,
            handler as (e: MIDIMessageEvent) => void,
          );
        }
      }

      // Set device name
      const firstInput = midiAccess.inputs.values().next().value;
      setMidiDeviceName(
        firstInput ? (firstInput.name ?? 'MIDI Controller') : null,
      );
      setActiveSource('midi');
      setIsListening(true);
      setError(null);
    },
    [handleMidiMessage],
  );

  // ── Stop MIDI listening ───────────────────────────────────────────────

  const stopMidi = useCallback(() => {
    if (midiAccessRef.current) {
      for (const input of midiAccessRef.current.inputs.values()) {
        const handler = midiListenersRef.current.get(input.id);
        if (handler) {
          input.removeEventListener('midimessage', handler as EventListener);
        }
      }
    }
    midiListenersRef.current.clear();
    midiNoteStartsRef.current.clear();
    setMidiDeviceName(null);
  }, []);

  // ── Stop audio capture ────────────────────────────────────────────────

  const stopAudio = useCallback(() => {
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = 0;
    }

    // Stop v1
    adapterRef.current?.stop();
    captureRef.current?.stop();
    adapterRef.current = null;
    captureRef.current = null;
    setCapture(null);

    // Stop v2
    v2OrchestratorRef.current?.stop();
    v2CaptureRef.current?.stop();
    v2OrchestratorRef.current = null;
    v2CaptureRef.current = null;
    setNoteConfidences(new Map());

    setInputLevel(0);
  }, []);

  // ── Main start/stop ───────────────────────────────────────────────────

  const start = useCallback(async () => {
    const generation = ++startGenerationRef.current;

    // Microphone-based pitch detection is intentionally disabled here: the
    // mic was picking up extraneous sound and producing spurious notes that
    // broke activity feedback. start() is MIDI-only for every instrument;
    // guitar audio starts only from guitar.enable(), after a user gesture.

    try {
      const midiAccess = await navigator.requestMIDIAccess();
      if (startGenerationRef.current !== generation) return;

      midiAccessRef.current = midiAccess;

      if (midiAccess.inputs.size > 0) {
        startMidi(midiAccess);
      } else {
        setIsListening(true);
      }

      midiAccess.onstatechange = () => {
        const hasInputs = midiAccess.inputs.size > 0;

        if (hasInputs) {
          startMidi(midiAccess);
        } else {
          stopMidi();
        }
      };
    } catch {
      // Web MIDI not supported — no input available.
      setError('Web MIDI is not supported in this browser');
    }
  }, [startMidi, stopMidi]);

  // ── Guitar input ──────────────────────────────────────────────────────

  const stopGuitar = useCallback(() => {
    guitarEngine?.stop();
    midiChords?.reset();
  }, [guitarEngine, midiChords]);

  useEffect(() => {
    guitarEngine?.setCallbacks({
      onNoteOn: (event) => {
        activeNotesRef.current.add(event.number);
        updateActiveNotes();
        onNoteOnRef.current?.(event);
        for (const cb of noteOnSubscribersRef.current) cb(event);
      },
      onNoteOff: (event) => {
        activeNotesRef.current.delete(event.number);
        updateActiveNotes();
        onNoteOffRef.current?.(event);
        for (const cb of noteOffSubscribersRef.current) cb(event);
      },
      onChord: (event) => {
        for (const cb of chordSubscribersRef.current) cb(event);
      },
      onLevel: (level) => {
        guitarLevelRef.current = level;
        setInputLevel(level);
      },
      onError: (err) => {
        setGuitarStatus(failureStatus(err));
        setGuitarError(failureMessage(err));
        setActiveSource('midi');
      },
    });
  }, [guitarEngine, updateActiveNotes]);

  const enableGuitar = useCallback(async () => {
    if (!guitarEngine || guitarEngine.isListening) return;
    // Set-up may have been saved elsewhere since mount.
    const prefs = loadGuitarInputPrefs();
    setGuitarPrefs(prefs);
    // Resume inside the gesture, before any await: Safari may refuse later.
    if (prefs.source === 'audio') audioContextOwner.resume();
    await guitarEngine.setPrefs(prefs); // stopped, so this only stores them
    if (prefs.source !== 'audio') return;
    setGuitarStatus('requesting-permission');
    setGuitarError(null);
    try {
      await guitarEngine.start();
    } catch (err) {
      // MIDI keeps working; the student can retry from set-up.
      setGuitarStatus(failureStatus(err));
      setGuitarError(failureMessage(err));
      return;
    }
    if (!guitarEngine.isListening) return; // stopped meanwhile
    setGuitarStatus('listening');
    setActiveSource('audio');
    setIsListening(true);
  }, [guitarEngine]);

  const restartGuitar = useCallback(
    async (patch: Partial<GuitarInputPrefs>) => {
      if (!guitarEngine) return;
      const next = saveGuitarInputPrefs(patch);
      setGuitarPrefs(next);
      if (next.source !== 'audio') guitarEngine.stop();
      try {
        await guitarEngine.setPrefs(next); // reopens on a device change
      } catch (err) {
        setGuitarStatus(failureStatus(err));
        setGuitarError(failureMessage(err));
        setActiveSource('midi');
        return;
      }
      const listening = guitarEngine.isListening;
      if (!listening) setActiveSource('midi');
      // An audio failure stays shown until enable() is tried again, and an
      // open permission prompt stays shown until enable() settles.
      setGuitarStatus((status) =>
        listening
          ? 'listening'
          : next.source === 'audio' &&
              (FAILED.has(status) || status === 'requesting-permission')
            ? status
            : idleStatus(next),
      );
    },
    [guitarEngine],
  );

  const calibrateGuitarGate = useCallback(
    async (ms?: number) => {
      if (!guitarEngine) throw new Error('Not a guitar lesson');
      const gateRms = await guitarEngine.calibrateGate(ms);
      setGuitarPrefs(saveGuitarInputPrefs({ gateRms }));
      return gateRms;
    },
    [guitarEngine],
  );

  const guitar = useMemo<LearnGuitarInput | null>(
    () =>
      guitarEngine && guitarPrefs
        ? {
            status: guitarStatus,
            prefs: guitarPrefs,
            get level() {
              return guitarLevelRef.current;
            },
            error: guitarError,
            enable: enableGuitar,
            restart: restartGuitar,
            setEvaluationMode: (mode) => guitarEngine.setEvaluationMode(mode),
            setSuppressed: (suppressed) =>
              guitarEngine.setSuppressed(suppressed),
            setExpectedNotes: (midis) => guitarEngine.setExpectedNotes(midis),
            setKeyContext: (rootPc, modeIntervals) =>
              guitarEngine.setKeyContext(rootPc, modeIntervals),
            setClickFilter: (isClick) => guitarEngine.setClickFilter(isClick),
            calibrateGate: calibrateGuitarGate,
            getTunerAnalyser: () => guitarEngine.getTunerAnalyser(),
            getLastChroma: () => guitarEngine.getLastChroma(),
            getRig: () => guitarEngine.getRig(),
          }
        : null,
    [
      guitarEngine,
      guitarPrefs,
      guitarStatus,
      guitarError,
      enableGuitar,
      restartGuitar,
      calibrateGuitarGate,
    ],
  );

  const stop = useCallback(() => {
    // Invalidate any in-flight start()
    startGenerationRef.current++;

    stopMidi();
    stopAudio();
    if (guitarEngine) {
      stopGuitar();
      setGuitarStatus(idleStatus(loadGuitarInputPrefs()));
      setActiveSource('midi');
    }
    activeNotesRef.current.clear();
    updateActiveNotes();
    setIsListening(false);

    if (midiAccessRef.current) {
      midiAccessRef.current.onstatechange = null;
      midiAccessRef.current = null;
    }
  }, [stopMidi, stopAudio, stopGuitar, guitarEngine, updateActiveNotes]);

  // Update detection mode on adapter when it changes
  useEffect(() => {
    adapterRef.current?.setMode(detectionMode);
    v2OrchestratorRef.current?.setMode(detectionMode);
  }, [detectionMode]);

  // ── Subscription methods ──────────────────────────────────────────────

  const subscribeNoteOn = useCallback((cb: (event: MidiNoteEvent) => void) => {
    noteOnSubscribersRef.current.add(cb);
    return () => {
      noteOnSubscribersRef.current.delete(cb);
    };
  }, []);

  const subscribeNoteOff = useCallback((cb: (event: MidiNoteEvent) => void) => {
    noteOffSubscribersRef.current.add(cb);
    return () => {
      noteOffSubscribersRef.current.delete(cb);
    };
  }, []);

  const subscribeChord = useCallback(
    (cb: (event: GuitarChordEvent) => void) => {
      chordSubscribersRef.current.add(cb);
      return () => {
        chordSubscribersRef.current.delete(cb);
      };
    },
    [],
  );

  // ── Detection context methods ────────────────────────────────────────

  const setKeyContext = useCallback(
    (rootPc: number, modeIntervals: number[]) => {
      adapterRef.current?.setKeyContext(rootPc, modeIntervals);
      v2OrchestratorRef.current?.setKeyContext(rootPc, modeIntervals);
      guitarEngine?.setKeyContext(rootPc, modeIntervals);
    },
    [guitarEngine],
  );

  const clearKeyContext = useCallback(() => {
    adapterRef.current?.clearKeyContext();
    v2OrchestratorRef.current?.clearKeyContext();
    guitarEngine?.clearKeyContext();
  }, [guitarEngine]);

  const setExpectedNotes = useCallback(
    (notes: number[] | null) => {
      adapterRef.current?.setExpectedNotes(notes);
      v2OrchestratorRef.current?.setExpectedNotes(notes);
      guitarEngine?.setExpectedNotes(notes);
    },
    [guitarEngine],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMidi();
      stopAudio();
      stopGuitar();
      if (midiAccessRef.current) {
        midiAccessRef.current.onstatechange = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isV2 = v2Enabled.current;

  return {
    activeSource,
    isListening,
    activeNotes,
    inputLevel,
    error,
    midiDeviceName,
    start,
    stop,
    setKeyContext,
    clearKeyContext,
    setExpectedNotes,
    subscribeNoteOn,
    subscribeNoteOff,
    capture,
    isV2,
    noteConfidences,
    instrument,
    subscribeChord,
    guitar,
  };
}
