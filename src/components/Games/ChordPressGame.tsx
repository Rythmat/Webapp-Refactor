/* eslint-disable react/jsx-sort-props */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { v4 as uuidv4 } from 'uuid';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/components/utilities';
import { usePlayNote } from '@/contexts/PianoContext';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';

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
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
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
  // const keyboardLegend = useMemo(() => {
  //   return Array.from(keyboardMap.entries()).map(([key, midi]) => ({
  //     key: key.toUpperCase(),
  //     note: Tone.Frequency(midi, 'midi').toNote(),
  //   }));
  // }, [keyboardMap]);

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
    setSubmitted(false);
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
    const color = !checked ? '#60a5fa' : isCorrect ? '#22c55e' : '#ef4444';
    return toEvents(selected, color);
  }, [selected, checked, isCorrect]);

  const keyboardId = useMemo(() => `kbd-${seed}`, [seed]);
  const title = targetLabel ?? chordName(current.rootPc, current.type);

  const handleContinue = useCallback(() => {
    if (!checked || submitted) return;
    if (onComplete) {
      setSubmitted(true);
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
    onComplete,
    resetSelection,
    selectNextRandomChord,
    submitted,
    targetNotes,
  ]);
  const feedback = useMemo(() => {
    if (!checked) return null;
    if (isCorrect)
      return (
        <div className="text-sm font-medium text-green-600">
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
      <div className="space-y-1 text-sm">
        <div className="font-medium text-red-600">Not quite.</div>
        {miss && (
          <div>
            Missing: <span className="text-foreground/90">{miss}</span>
          </div>
        )}
        {extra && (
          <div>
            Extra: <span className="text-foreground/90">{extra}</span>
          </div>
        )}
      </div>
    );
  }, [checked, isCorrect, missingAndExtra]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          <span>Chord Press Challenge</span>
        </CardTitle>
        <p className="text-center">
          Trigger the chord tones using your MIDI controller, computer keyboard,
          or by clicking the keys below.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <div className="space-y-2 text-sm text-muted-foreground">
          {showChordName && (
            <span className="text-base font-bold text-muted-foreground">
              {title}
            </span>
          )}
        </div>
        <div className="rounded-lg border bg-background p-2">
          <PianoKeyboard
            key={keyboardId}
            startC={3}
            endC={6}
            gaming={true}
            onKeyClick={toggleNote}
            onMidiInput={enableMIDI ? onMidiInput : undefined}
            enableMidiInterface={enableMIDI}
            playingNotes={selectedEvents}
            activeWhiteKeyColor={undefined}
            activeBlackKeyColor={undefined}
            showOctaveStart
          />
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          Target:{' '}
          {targetMidi
            .map((value) => Tone.Frequency(value, 'midi').toNote())
            .join(' ')}
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => setChecked(true)}
              disabled={selected.length === 0 || (checked && isCorrect)}
            >
              Check Answer
            </Button>
            <Button
              variant="outline"
              onClick={resetSelection}
              disabled={selected.length === 0 || (checked && isCorrect)}
            >
              Clear Selection
            </Button>
          </div>
        </div>
        {feedback}
        {checked && (
          <div className="flex justify-center">
            <Button onClick={handleContinue} disabled={submitted}>
              Continue
            </Button>
          </div>
        )}{' '}
      </CardContent>
    </Card>
  );
}
