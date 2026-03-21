// ── LearnInputContext ────────────────────────────────────────────────────
// React context that provides unified input state to all Learn section
// activity components. Wraps useLearnInput and makes its return value
// available via useLearnInputContext().
//
// Split into two contexts to avoid 60fps re-renders:
//   - StableCtx: functions + infrequently changing state (source, error, etc.)
//   - LiveCtx: rapidly changing values (activeNotes, inputLevel)
// Components that only need subscriptions or start/stop won't re-render
// on every audio frame.

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  useLearnInput,
  type InputSource,
  type UseLearnInputOptions,
  type UseLearnInputReturn,
} from '@/hooks/music/useLearnInput';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import type { LearnAudioCapture } from '@/learn/audio/LearnAudioCapture';

// ── Stable context (functions + rare state) ──────────────────────────────

interface StableContextValue {
  activeSource: InputSource;
  isListening: boolean;
  error: string | null;
  midiDeviceName: string | null;
  start: () => Promise<void>;
  stop: () => void;
  setKeyContext: (rootPc: number, modeIntervals: number[]) => void;
  clearKeyContext: () => void;
  setExpectedNotes: (notes: number[] | null) => void;
  subscribeNoteOn: (cb: (event: MidiNoteEvent) => void) => () => void;
  subscribeNoteOff: (cb: (event: MidiNoteEvent) => void) => () => void;
  capture: LearnAudioCapture | null;
  /** Whether the v2 audio system is active. */
  isV2: boolean;
}

// ── Live context (rapidly changing) ──────────────────────────────────────

interface LiveContextValue {
  activeNotes: number[];
  inputLevel: number;
  /** Note confidences from v2 tracker (MIDI → confidence). Empty for v1/MIDI. */
  noteConfidences: Map<number, number>;
}

const StableCtx = createContext<StableContextValue | null>(null);
const LiveCtx = createContext<LiveContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────

interface LearnInputProviderProps extends UseLearnInputOptions {
  children: ReactNode;
}

export function LearnInputProvider({
  children,
  ...options
}: LearnInputProviderProps) {
  const input = useLearnInput(options);

  // Stable value — only changes on source switch, error, or capture change
  const stable = useMemo<StableContextValue>(
    () => ({
      activeSource: input.activeSource,
      isListening: input.isListening,
      error: input.error,
      midiDeviceName: input.midiDeviceName,
      start: input.start,
      stop: input.stop,
      setKeyContext: input.setKeyContext,
      clearKeyContext: input.clearKeyContext,
      setExpectedNotes: input.setExpectedNotes,
      subscribeNoteOn: input.subscribeNoteOn,
      subscribeNoteOff: input.subscribeNoteOff,
      capture: input.capture,
      isV2: input.isV2,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      input.activeSource,
      input.isListening,
      input.error,
      input.midiDeviceName,
      input.start,
      input.stop,
      input.setKeyContext,
      input.clearKeyContext,
      input.setExpectedNotes,
      input.subscribeNoteOn,
      input.subscribeNoteOff,
      input.capture,
      input.isV2,
    ],
  );

  // Live value — changes on every note/audio frame
  const liveRef = useRef<LiveContextValue>({
    activeNotes: input.activeNotes,
    inputLevel: input.inputLevel,
    noteConfidences: input.noteConfidences,
  });
  liveRef.current.activeNotes = input.activeNotes;
  liveRef.current.inputLevel = input.inputLevel;
  liveRef.current.noteConfidences = input.noteConfidences;

  // We intentionally create a new object here so components that opt in
  // to LiveCtx will re-render. Components that only use StableCtx won't.
  const live = useMemo<LiveContextValue>(
    () => ({
      activeNotes: input.activeNotes,
      inputLevel: input.inputLevel,
      noteConfidences: input.noteConfidences,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.activeNotes, input.inputLevel, input.noteConfidences],
  );

  return (
    <StableCtx.Provider value={stable}>
      <LiveCtx.Provider value={live}>{children}</LiveCtx.Provider>
    </StableCtx.Provider>
  );
}

// ── Consumer hooks ───────────────────────────────────────────────────────

/** Full context (causes re-renders on every note/audio frame). */
export function useLearnInputContext(): UseLearnInputReturn {
  const stable = useContext(StableCtx);
  const live = useContext(LiveCtx);
  if (!stable || !live) {
    throw new Error(
      'useLearnInputContext must be used within a LearnInputProvider',
    );
  }
  return {
    ...stable,
    ...live,
  };
}

/** Stable-only context (no re-renders from notes/audio level). */
export function useLearnInputStable(): StableContextValue {
  const ctx = useContext(StableCtx);
  if (!ctx) {
    throw new Error(
      'useLearnInputStable must be used within a LearnInputProvider',
    );
  }
  return ctx;
}

/** Live-only context (activeNotes + inputLevel). */
export function useLearnInputLive(): LiveContextValue {
  const ctx = useContext(LiveCtx);
  if (!ctx) {
    throw new Error(
      'useLearnInputLive must be used within a LearnInputProvider',
    );
  }
  return ctx;
}

/**
 * Optional stable context — returns null if no LearnInputProvider exists.
 * Use this in components that may render both inside and outside the
 * Learn section (e.g., ChordPressGame in markdown/classroom contexts).
 */
export function useOptionalLearnInputStable(): StableContextValue | null {
  return useContext(StableCtx);
}

// Re-export types for convenience
export type { InputSource, UseLearnInputOptions, UseLearnInputReturn };
