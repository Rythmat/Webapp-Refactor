import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import { usePlayNote } from '@/contexts/PianoContext';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';

type KeyboardBinding = {
  key: string;
  offset: number;
};

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

export type ChordPressKeyboardProps = {
  startC?: number;
  endC?: number;
  enableMIDI?: boolean;
  enableComputerKeyboard?: boolean;
  keyboardBaseOctave?: number;
  targetNotes: number[];
  className?: string;
  onComplete?: () => void;
};

export function ChordPressKeyboard({
  startC = 3,
  endC = 6,
  enableMIDI = true,
  enableComputerKeyboard = true,
  keyboardBaseOctave = 4,
  targetNotes,
  className,
  onComplete,
}: ChordPressKeyboardProps) {
  const playNote = usePlayNote();
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const [seed] = useState(uuidv4());
  const [selected, setSelected] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);

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
  }, [keyboardBaseMidi, rangeEnd, rangeStart]);

  const toggleNote = useCallback((midi: number) => {
    if (completed) return;
    setSelected((prev) =>
      prev.includes(midi) ? prev.filter((value) => value !== midi) : [...prev, midi],
    );
  }, [completed]);

  const onMidiInput = useCallback(
    (event: MidiNoteEvent) => {
      toggleNote(event.number);
    },
    [toggleNote],
  );

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

  useEffect(() => {
    setSelected([]);
    setCompleted(false);
    pressedKeysRef.current.clear();
  }, [targetNotes]);

  useEffect(() => {
    if (completed) return;
    if (!targetNotes || targetNotes.length === 0) return;
    if (!equalPitchClassSets(selected, targetNotes)) return;
    setCompleted(true);
    onComplete?.();
  }, [completed, onComplete, selected, targetNotes]);

  const selectedEvents: PlaybackEvent[] = useMemo(() => {
    const color = completed ? '#22c55e' : '#60a5fa';
    return toEvents(selected, color);
  }, [completed, selected]);

  const keyboardId = useMemo(() => `kbd-${seed}`, [seed]);

  return (
    <PianoKeyboard
      key={keyboardId}
      className={className}
      startC={startC}
      endC={endC}
      gaming
      onKeyClick={toggleNote}
      onMidiInput={enableMIDI ? onMidiInput : undefined}
      enableMidiInterface={enableMIDI}
      playingNotes={selectedEvents}
      activeWhiteKeyColor={undefined}
      activeBlackKeyColor={undefined}
      showOctaveStart
    />
  );
}
