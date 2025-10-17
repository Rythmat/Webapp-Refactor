import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { cn } from '@/components/utilities';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import { useState, useMemo, useCallback, useEffect } from 'react';

type ChordType = 'maj' | 'min' | 'dim' | 'aug' | '7' | 'maj7' | 'min7';

type ChordSpec = {
  rootPc: number;
  type: ChordType;
};

type ChordOption = {
  id: string;
  spec: ChordSpec;
  midi: number[];
  isCorrect: boolean;
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

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const DEFAULT_CHORD_POOL: ChordType[] = ['maj', 'min', 'dim', 'aug'];

type CreateRoundArgs = {
  chordPool: ChordType[];
  baseOctaveRoot: number;
  preferredChord?: ChordSpec;
};

type RoundState = {
  target: ChordSpec;
  options: ChordOption[];
};

function buildChord(rootMidi: number, type: ChordType) {
  return CHORD_INTERVALS[type].map((interval) => rootMidi + interval);
}

function chordName(rootPc: number, type: ChordType) {
  const root = PITCH_CLASS_NAMES[((rootPc % 12) + 12) % 12];
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

function randomChordSpec(chordPool: ChordType[]): ChordSpec {
  const type = chordPool[Math.floor(Math.random() * chordPool.length)];
  return {
    rootPc: Math.floor(Math.random() * 12),
    type: type ?? 'maj',
  };
}

function chordSignature({ rootPc, type }: ChordSpec) {
  return `${rootPc}:${type}`;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toPlaybackEvents(notes: number[], color: string, optionId: string): PlaybackEvent[] {
  return notes.map((note) => ({
    id: `${optionId}-${note}`,
    type: 'note',
    midi: note,
    time: 0,
    duration: 1,
    velocity: 1,
    color,
  }));
}

function midiToNoteName(midi: number) {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${PITCH_CLASS_NAMES[pitchClass] ?? 'Unknown'}${octave}`;
}

function createRound({ chordPool, baseOctaveRoot, preferredChord }: CreateRoundArgs): RoundState {
  if (chordPool.length === 0) {
    throw new Error('Chord pool must contain at least one chord type.');
  }

  const target = preferredChord ?? randomChordSpec(chordPool);
  const used = new Set<string>();
  const options: ChordOption[] = [];

  const addOption = (spec: ChordSpec, isCorrect: boolean) => {
    const signature = chordSignature(spec);
    if (used.has(signature)) {
      return false;
    }
    used.add(signature);
    options.push({
      id: uuidv4(),
      spec,
      midi: buildChord(baseOctaveRoot + spec.rootPc, spec.type),
      isCorrect,
    });
    return true;
  };

  addOption(target, true);

  let attempts = 0;
  while (options.length < 4 && attempts < 100) {
    attempts += 1;
    const candidate = randomChordSpec(chordPool);
    addOption(candidate, false);
  }

  if (options.length < 4) {
    throw new Error('Unable to generate a full set of chord options.');
  }

  return {
    target,
    options: shuffle(options),
  };
}

export type BoardChoiceGameProps = {
  startC?: number;
  endC?: number;
  chordPool?: ChordType[];
  showChordName?: boolean;
  keyboardBaseOctave?: number;
  initialChord?: ChordSpec;
  className?: string;
  onComplete?: (result: { success: boolean }) => void;
};

export function BoardChoiceGame({
  startC = 3,
  endC = 5,
  chordPool = DEFAULT_CHORD_POOL,
  showChordName = true,
  keyboardBaseOctave = 4,
  initialChord,
  className,
  onComplete,
}: BoardChoiceGameProps) {
  const baseOctaveRoot = keyboardBaseOctave * 12;
  const initialChordKey = initialChord ? chordSignature(initialChord) : 'none';

  const [selectedOption, setSelectedOption] = useState<ChordOption | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [round, setRound] = useState<RoundState>(() =>
    createRound({ chordPool, baseOctaveRoot, preferredChord: initialChord }),
  );

  const startNewRound = useCallback(
    (preferred?: ChordSpec) => {
      setRound(createRound({ chordPool, baseOctaveRoot, preferredChord: preferred }));
      setSelectedOption(null);
      setSubmitted(false);
    },
    [baseOctaveRoot, chordPool],
  );

  useEffect(() => {
    startNewRound(initialChord);
  }, [initialChordKey, initialChord, startNewRound]);

  const selectedOptionId = selectedOption?.id ?? null;
  const target = round.target;
  const targetLabel = useMemo(
    () => chordName(target.rootPc, target.type) ?? 'Unknown chord',
    [target.rootPc, target.type],
  );
  const targetNotes = useMemo(
    () => buildChord(baseOctaveRoot + target.rootPc, target.type),
    [baseOctaveRoot, target.rootPc, target.type],
  );
  const targetNoteNames = useMemo(
    () => targetNotes.map(midiToNoteName),
    [targetNotes],
  );


  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (selectedOption) return;
      const option = round.options.find((item) => item.id === optionId);
      if (!option) return;

      setSelectedOption(option);
      setSubmitted(false);
    },
    [round.options, selectedOption],
  );


  const handleContinue = useCallback(() => {
    if (!selectedOption || submitted) return;
    setSubmitted(true);
    onComplete?.({ success: selectedOption.isCorrect });
  }, [onComplete, selectedOption, submitted]);
  const feedback = useMemo(() => {
    if (!selectedOption) return null;

    if (selectedOption.isCorrect) {
      return (
        <div className="text-sm font-medium text-green-600">Correct! You nailed the chord.</div>
      );
    }

    return (
      <div className="space-y-1 text-sm">
        <div className="font-medium text-red-600">Not quite.</div>
        <div>
          The correct keyboard shows {targetLabel}
          {targetNoteNames.length > 0 && (
            <span className="text-foreground/90"> ({targetNoteNames.join(', ')})</span>
          )}
          .
        </div>
      </div>
    );
  }, [selectedOption, targetLabel, targetNoteNames]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold">Chord Board Challenge</CardTitle>
        {showChordName && (
          <p className="text-sm text-muted-foreground">
            Which keyboard highlights the notes of <span className="font-semibold">{targetLabel}</span>?
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid gap-4 md:grid-cols-2">
          {round.options.map((option, index) => {
            const isSelected = option.id === selectedOptionId;
            const isCorrect = option.isCorrect;
            const showResult = Boolean(selectedOptionId);

            const color = showResult
              ? isCorrect
                ? '#22c55e'
                : isSelected
                  ? '#ef4444'
                  : '#94a3b8'
              : '#60a5fa';

            const playingNotes = toPlaybackEvents(option.midi, color, option.id);

            const borderClass = showResult
              ? isCorrect
                ? 'border-green-500'
                : isSelected
                  ? 'border-red-500'
                  : 'border-muted'
              : 'border-muted';

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleOptionSelect(option.id)}
                className={cn(
                  'group flex flex-col gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  borderClass,
                  showResult && isCorrect && 'ring-1 ring-green-200',
                  isSelected && !isCorrect && 'ring-1 ring-red-200',
                )}
                disabled={Boolean(selectedOptionId)}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Option {String.fromCharCode(65 + index)}</span>
                  {showResult && (
                    <span className={cn(
                      'text-xs font-semibold uppercase tracking-wide',
                      isCorrect ? 'text-green-600' : isSelected ? 'text-red-600' : 'text-muted-foreground/70',
                    )}>
                      {isCorrect ? 'Correct' : isSelected ? 'Your Pick' : 'Incorrect'}
                    </span>
                  )}
                </div>
                <div className="pointer-events-none">
                  <PianoKeyboard
                    startC={startC}
                    endC={endC}
                    playingNotes={playingNotes}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {feedback}

        {selectedOptionId && (
          <div className="flex justify-center">
            <Button onClick={handleContinue} disabled={submitted}>
              Continue
            </Button>
          </div>
        )}


      </CardContent>
    </Card>
  );
}
