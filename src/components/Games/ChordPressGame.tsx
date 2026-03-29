/* eslint-disable react/jsx-sort-props */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { v4 as uuidv4 } from 'uuid';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { usePlayNote } from '@/contexts/PianoContext';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { useOptionalLearnInputStable } from '@/learn/context/LearnInputContext';

type ChordType = 'maj' | 'min' | 'dim' | 'aug' | '7' | 'maj7' | 'min7';

type KeyboardBinding = {
  key: string;
  offset: number;
};

const CHORD_INTERVALS: Record<ChordType, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
};

const PITCH_CLASS_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

const DEFAULT_CHORD_POOL: ChordType[] = ['maj', 'min', 'dim', 'aug'];

const KEYBOARD_BINDINGS: KeyboardBinding[] = [
  { key: 'a', offset: 0 },
  { key: 'w', offset: 1 },
  { key: 's', offset: 2 },
  { key: 'e', offset: 3 },
  { key: 'd', offset: 4 },
  { key: 'f', offset: 5 },
  { key: 't', offset: 6 },
  { key: 'g', offset: 7 },
  { key: 'y', offset: 8 },
  { key: 'h', offset: 9 },
  { key: 'u', offset: 10 },
  { key: 'j', offset: 11 },
];

function pc(note: number) {
  return ((note % 12) + 12) % 12;
}

function uniquePitchClasses(notes: number[]): number[] {
  const s = new Set(notes.map(pc));
  return [...s].sort((a, b) => a - b);
}

function equalPitchClassSets(a: number[], b: number[]) {
  const aa = uniquePitchClasses(a);
  const bb = uniquePitchClasses(b);
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

function buildChord(rootMidi: number, type: ChordType): number[] {
  return CHORD_INTERVALS[type].map((interval) => rootMidi + interval);
}

function chordName(rootPc: number, type: ChordType) {
  const root = PITCH_CLASS_NAMES[rootPc];
  switch (type) {
    case 'maj':
      return `${root} Major`;
    case 'min':
      return `${root} Minor`;
    case 'dim':
      return `${root} Diminished`;
    case 'aug':
      return `${root} Augmented`;
    case '7':
      return `${root} Dominant 7`;
    case 'maj7':
      return `${root} Major 7`;
    case 'min7':
      return `${root} Minor 7`;
  }
}

function toEvents(midi: number[], color?: string): PlaybackEvent[] {
  const now = Date.now();
  return midi.map((value) => ({
    id: `selected-${value}`,
    type: 'note',
    midi: value,
    time: now,
    duration: 1,
    velocity: 1,
    color,
  }));
}

// ── Styles ─────────────────────────────────────────────────────────────────

const BTN: React.CSSProperties = {
  padding: '9px 28px',
  borderRadius: 10,
  border: '1.5px solid #a78bfa',
  backgroundColor: 'rgba(167,139,250,0.14)',
  color: '#ddd6fe',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: 2,
  textTransform: 'uppercase',
  transition: 'all 0.18s ease',
};

const BTN_OUTLINE: React.CSSProperties = {
  ...BTN,
  border: '1.5px solid rgba(255,255,255,0.15)',
  backgroundColor: 'rgba(255,255,255,0.03)',
  color: 'var(--color-text-dim, #6b7280)',
};

// ── Component ──────────────────────────────────────────────────────────────

export type ChordPressGameProps = {
  startC?: number;
  endC?: number;
  chordPool?: ChordType[];
  showChordName?: boolean;
  enableMIDI?: boolean;
  enableComputerKeyboard?: boolean;
  keyboardBaseOctave?: number;
  initialChord?: { rootPc: number; type: ChordType };
  targetNotes?: number[];
  targetLabel?: string;
  className?: string;
  onComplete?: () => void;
};

export function ChordPressGame({
  startC = 3,
  endC = 5,
  chordPool = DEFAULT_CHORD_POOL,
  showChordName = true,
  enableMIDI = true,
  enableComputerKeyboard = true,
  keyboardBaseOctave = 4,
  initialChord,
  targetNotes,
  targetLabel,
  className,
  onComplete,
}: ChordPressGameProps) {
  const baseOctaveRoot = 60; // middle C

  const playNote = usePlayNote();
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const [seed] = useState(uuidv4());
  const [selected, setSelected] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionSuccessful, setSessionSuccessful] = useState(0);
  const [current, setCurrent] = useState<{ rootPc: number; type: ChordType }>(
    () =>
      initialChord || {
        rootPc: Math.floor(Math.random() * 12),
        type: chordPool[Math.floor(Math.random() * chordPool.length)]!,
      },
  );

  const initialChordKey = initialChord
    ? `${initialChord.rootPc}:${initialChord.type}`
    : 'none';
  const targetNotesKey = targetNotes ? targetNotes.join(',') : 'none';
  const rangeStart = startC * 12;
  const rangeEnd = (endC + 1) * 12 - 1;
  const keyboardBaseMidi = keyboardBaseOctave * 12;

  const keyboardMap = useMemo(() => {
    const bindings = new Map<string, number>();
    KEYBOARD_BINDINGS.forEach(({ key, offset }) => {
      const midi = keyboardBaseMidi + offset;
      if (midi >= rangeStart && midi <= rangeEnd) {
        bindings.set(key, midi);
      }
    });
    return bindings;
  }, [keyboardBaseMidi, rangeStart, rangeEnd]);

  const targetMidi = useMemo(() => {
    if (targetNotes && targetNotes.length > 0) {
      return targetNotes;
    }
    const rootMidi = baseOctaveRoot + current.rootPc;
    return buildChord(rootMidi, current.type);
  }, [current, targetNotes]);

  const isCorrect = useMemo(
    () => equalPitchClassSets(selected, targetMidi),
    [selected, targetMidi],
  );

  const missingAndExtra = useMemo(() => {
    const sel = uniquePitchClasses(selected);
    const tgt = uniquePitchClasses(targetMidi);
    const missing = tgt.filter((value) => !sel.includes(value));
    const extra = sel.filter((value) => !tgt.includes(value));
    return { missing, extra };
  }, [selected, targetMidi]);

  const resetSelection = useCallback(() => {
    setSelected([]);
    setChecked(false);
    pressedKeysRef.current.clear();
  }, []);

  const selectNextRandomChord = useCallback(() => {
    const pool = chordPool.length > 0 ? chordPool : DEFAULT_CHORD_POOL;
    const nextType = pool[Math.floor(Math.random() * pool.length)]!;
    setCurrent({
      rootPc: Math.floor(Math.random() * 12),
      type: nextType,
    });
  }, [chordPool]);

  useEffect(() => {
    if (targetNotes && targetNotes.length > 0) {
      resetSelection();
      return;
    }
    if (initialChord) {
      setCurrent(initialChord);
      resetSelection();
      return;
    }
    const pool = chordPool.length > 0 ? chordPool : DEFAULT_CHORD_POOL;
    const nextType = pool[Math.floor(Math.random() * pool.length)]!;
    setCurrent({
      rootPc: Math.floor(Math.random() * 12),
      type: nextType,
    });
    resetSelection();
  }, [
    initialChordKey,
    initialChord,
    chordPool,
    resetSelection,
    targetNotes,
    targetNotesKey,
  ]);

  const toggleNote = useCallback(
    (midi: number) => {
      if (checked && isCorrect) return;
      setSelected((prev) =>
        prev.includes(midi)
          ? prev.filter((value) => value !== midi)
          : [...prev, midi],
      );
    },
    [checked, isCorrect],
  );

  const onMidiInput = useCallback(
    (event: MidiNoteEvent) => {
      toggleNote(event.number);
    },
    [toggleNote],
  );

  const learnInput = useOptionalLearnInputStable();
  const hasLearnContext = learnInput !== null;

  useEffect(() => {
    if (!learnInput) return;
    return learnInput.subscribeNoteOn(onMidiInput);
  }, [learnInput, onMidiInput]);

  useEffect(() => {
    if (!enableComputerKeyboard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!keyboardMap.has(key)) return;
      if (event.repeat) return;
      if (pressedKeysRef.current.has(key)) return;
      const midi = keyboardMap.get(key);
      if (typeof midi !== 'number') return;
      pressedKeysRef.current.add(key);
      event.preventDefault();
      playNote(midi);
      toggleNote(midi);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (pressedKeysRef.current.has(key)) {
        pressedKeysRef.current.delete(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enableComputerKeyboard, keyboardMap, playNote, toggleNote]);

  const selectedEvents: PlaybackEvent[] = useMemo(() => {
    const color = !checked ? '#a78bfa' : isCorrect ? '#22c55e' : '#f87171';
    return toEvents(selected, color);
  }, [selected, checked, isCorrect]);

  const keyboardId = useMemo(() => `kbd-${seed}`, [seed]);
  const title = targetLabel ?? chordName(current.rootPc, current.type);

  const handlePlayAgain = useCallback(() => {
    if (!checked) return;
    setSessionTotal((prev) => prev + 1);
    if (isCorrect) setSessionSuccessful((prev) => prev + 1);
    if (onComplete) {
      onComplete();
      return;
    }
    if (targetNotes && targetNotes.length > 0) {
      resetSelection();
      return;
    }
    if (initialChord) {
      resetSelection();
      return;
    }
    selectNextRandomChord();
    resetSelection();
  }, [
    checked,
    initialChord,
    isCorrect,
    onComplete,
    resetSelection,
    selectNextRandomChord,
    targetNotes,
  ]);

  const feedback = useMemo(() => {
    if (!checked) return null;
    if (isCorrect)
      return (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
          Correct! Nice job.
        </div>
      );
    const miss = missingAndExtra.missing
      .map((value) => PITCH_CLASS_NAMES[value])
      .join(', ');
    const extra = missingAndExtra.extra
      .map((value) => PITCH_CLASS_NAMES[value])
      .join(', ');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>
          Not quite.
        </div>
        {miss && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-dim, #6b7280)',
            }}
          >
            Missing: <span style={{ color: '#bae6fd' }}>{miss}</span>
          </div>
        )}
        {extra && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-dim, #6b7280)',
            }}
          >
            Extra: <span style={{ color: '#fca5a5' }}>{extra}</span>
          </div>
        )}
      </div>
    );
  }, [checked, isCorrect, missingAndExtra]);

  const canCheck = selected.length > 0 && !(checked && isCorrect);
  const canClear = selected.length > 0 && !(checked && isCorrect);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 5,
            color: '#a78bfa',
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          Chord Press
        </h1>
        <p
          style={{
            fontSize: 11,
            color: 'var(--color-text-dim, #6b7280)',
            marginTop: 6,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          Play the chord tones on the keyboard
        </p>
        {sessionTotal > 0 && (
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: '#a78bfa',
            }}
          >
            Session: {Math.round((sessionSuccessful / sessionTotal) * 100)}%
          </div>
        )}
      </div>

      {/* Target chord */}
      {showChordName && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#ddd6fe',
              letterSpacing: 1,
            }}
          >
            {title}
          </span>
        </div>
      )}

      {/* Piano keyboard */}
      <div
        style={{
          borderRadius: 12,
          border: '1.5px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(255,255,255,0.02)',
          padding: 10,
          marginBottom: 16,
        }}
      >
        <PianoKeyboard
          key={keyboardId}
          startC={3}
          endC={6}
          gaming={true}
          onKeyClick={toggleNote}
          onMidiInput={
            hasLearnContext ? undefined : enableMIDI ? onMidiInput : undefined
          }
          enableMidiInterface={hasLearnContext ? false : enableMIDI}
          playingNotes={selectedEvents}
          activeWhiteKeyColor={undefined}
          activeBlackKeyColor={undefined}
          showOctaveStart
        />
      </div>

      {/* Target notes hint */}
      <div
        style={{
          textAlign: 'right',
          fontSize: 10,
          color: 'var(--color-text-dim, #6b7280)',
          letterSpacing: 0.5,
          marginBottom: 16,
        }}
      >
        Target:{' '}
        {targetMidi
          .map((value) => Tone.Frequency(value, 'midi').toNote())
          .join(' ')}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setChecked(true)}
          disabled={!canCheck}
          style={{
            ...BTN,
            opacity: canCheck ? 1 : 0.4,
            pointerEvents: canCheck ? 'auto' : 'none',
          }}
        >
          Check Answer
        </button>
        <button
          onClick={resetSelection}
          disabled={!canClear}
          style={{
            ...BTN_OUTLINE,
            opacity: canClear ? 1 : 0.4,
            pointerEvents: canClear ? 'auto' : 'none',
          }}
        >
          Clear Selection
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>{feedback}</div>
      )}

      {/* Play Again */}
      {checked && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={handlePlayAgain} style={BTN}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
