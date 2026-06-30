// ── useLearnInput ────────────────────────────────────────────────────────
// Input hook for the Learn section. Listens for MIDI keyboard input only;
// microphone-based pitch detection has been removed because stray ambient
// audio was producing spurious notes and breaking activity feedback.
//
// Hot-plugging is supported via the Web MIDI API's statechange event so
// devices can be connected/disconnected mid-lesson.
//
// The audio refs and stop logic are preserved so the surrounding state
// surface (capture, inputLevel, noteConfidences, isV2) stays compatible
// with consumers — they just remain at default values.

import { useCallback, useEffect, useRef, useState } from 'react';
import { isV2Enabled } from '@/learn/audio/AudioSystemSelector';
import {
  AudioToMidiAdapter,
  type DetectionMode,
} from '@/learn/audio/AudioToMidiAdapter';
import { LearnAudioCapture } from '@/learn/audio/LearnAudioCapture';
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
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useLearnInput(
  options: UseLearnInputOptions = {},
): UseLearnInputReturn {
  const { detectionMode = 'monophonic', onNoteOn, onNoteOff } = options;

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
        }
      }
    },
    [updateActiveNotes],
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

    // Microphone-based pitch detection is intentionally disabled for lessons:
    // the mic was picking up extraneous sound and producing spurious notes
    // that broke activity feedback. Lessons rely solely on MIDI input now.

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

  const stop = useCallback(() => {
    // Invalidate any in-flight start()
    startGenerationRef.current++;

    stopMidi();
    stopAudio();
    activeNotesRef.current.clear();
    updateActiveNotes();
    setIsListening(false);

    if (midiAccessRef.current) {
      midiAccessRef.current.onstatechange = null;
      midiAccessRef.current = null;
    }
  }, [stopMidi, stopAudio, updateActiveNotes]);

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

  // ── Detection context methods ────────────────────────────────────────

  const setKeyContext = useCallback(
    (rootPc: number, modeIntervals: number[]) => {
      adapterRef.current?.setKeyContext(rootPc, modeIntervals);
      v2OrchestratorRef.current?.setKeyContext(rootPc, modeIntervals);
    },
    [],
  );

  const clearKeyContext = useCallback(() => {
    adapterRef.current?.clearKeyContext();
    v2OrchestratorRef.current?.clearKeyContext();
  }, []);

  const setExpectedNotes = useCallback((notes: number[] | null) => {
    adapterRef.current?.setExpectedNotes(notes);
    v2OrchestratorRef.current?.setExpectedNotes(notes);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMidi();
      stopAudio();
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
  };
}
