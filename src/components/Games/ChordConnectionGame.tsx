/* eslint-disable react/jsx-sort-props */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/components/utilities';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';

type ChordType = 'maj' | 'min' | 'dim' | 'aug' | '7' | 'maj7' | 'min7';

type ChordSpec = {
  rootPc: number;
  type: ChordType;
};

type MatchColumnItem = {
  id: string;
  spec: ChordSpec;
  label: string;
};

type KeyboardOption = {
  id: string;
  spec: ChordSpec;
  midi: number[];
};

type Connection = {
  chordId: string;
  keyboardId: string;
  correct: boolean;
};

type ConnectorLine = {
  chordId: string;
  keyboardId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  correct: boolean;
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

const CONNECTION_COLORS = {
  idle: '#60a5fa',
  correct: '#22c55e',
  incorrect: '#ef4444',
};

const ITEM_BUTTON_BASE_CLASS =
  'relative w-full rounded-md border bg-card/80 px-4 py-6 text-left transition shadow-sm min-h-[120px]';

const ITEM_BUTTON_IDLE_CLASS = 'hover:border-primary/50 hover:text-foreground';

const KEYBOARD_CLASS = 'pointer-events-none';

const KEYBOARD_SCALE_CLASS = 'scale-95 origin-top';

type CreateRoundArgs = {
  chordPool: ChordType[];
  baseOctaveRoot: number;
  preferredChord?: ChordSpec;
  pairs?: number;
};

type RoundState = {
  chords: MatchColumnItem[];
  keyboards: KeyboardOption[];
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
    default:
      return `${root} ${type}`;
  }
}

function randomChordSpec(chordPool: ChordType[]): ChordSpec {
  const type = chordPool[Math.floor(Math.random() * chordPool.length)];
  const resolvedType: ChordType = type ?? 'maj';
  return {
    rootPc: Math.floor(Math.random() * 12),
    type: resolvedType,
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

function toPlaybackEvents(
  notes: number[],
  color: string,
  optionId: string,
): PlaybackEvent[] {
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

function createRound({
  chordPool,
  baseOctaveRoot,
  preferredChord,
  pairs = 4,
}: CreateRoundArgs): RoundState {
  if (chordPool.length === 0) {
    throw new Error('Chord pool must contain at least one chord type.');
  }

  const used = new Set<string>();
  const specs: ChordSpec[] = [];

  const addSpec = (spec: ChordSpec) => {
    const signature = chordSignature(spec);
    if (used.has(signature)) {
      return false;
    }
    used.add(signature);
    specs.push(spec);
    return true;
  };

  if (preferredChord) {
    addSpec(preferredChord);
  }

  let attempts = 0;
  while (specs.length < pairs && attempts < 200) {
    attempts += 1;
    addSpec(randomChordSpec(chordPool));
  }

  if (specs.length < pairs) {
    throw new Error('Unable to create enough unique chord pairs.');
  }

  const chords = specs.map((spec) => ({
    id: uuidv4(),
    spec,
    label: chordName(spec.rootPc, spec.type),
  }));

  const keyboards = shuffle(
    specs.map((spec) => ({
      id: uuidv4(),
      spec,
      midi: buildChord(baseOctaveRoot + spec.rootPc, spec.type),
    })),
  );

  return { chords, keyboards };
}

export type ChordConnectionGameProps = {
  chordPool?: ChordType[];
  keyboardBaseOctave?: number;
  showChordNames?: boolean;
  pairs?: number;
  initialChord?: ChordSpec;
  className?: string;
  onComplete?: (result: { success: boolean }) => void;
};

export function ChordConnectionGame({
  chordPool = DEFAULT_CHORD_POOL,
  keyboardBaseOctave = 4,
  showChordNames = true,
  pairs = 4,
  initialChord,
  className,
  onComplete,
}: ChordConnectionGameProps) {
  const baseOctaveRoot = keyboardBaseOctave * 12;
  const initialChordKey = initialChord
    ? `${initialChord.rootPc}:${initialChord.type}`
    : 'none';

  const [round, setRound] = useState<RoundState>(() =>
    createRound({
      chordPool,
      baseOctaveRoot,
      preferredChord: initialChord,
      pairs,
    }),
  );
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeChord, setActiveChord] = useState<string | null>(null);
  const [activeKeyboard, setActiveKeyboard] = useState<string | null>(null);
  const [lines, setLines] = useState<ConnectorLine[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chordRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const keyboardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    setRound(
      createRound({
        chordPool,
        baseOctaveRoot,
        preferredChord: initialChord,
        pairs,
      }),
    );
    setConnections([]);
    setActiveChord(null);
    setActiveKeyboard(null);
    setLines([]);
    setSubmitted(false);
  }, [baseOctaveRoot, chordPool, initialChord, initialChordKey, pairs]);

  const resetConnections = useCallback(() => {
    setConnections([]);
    setActiveChord(null);
    setActiveKeyboard(null);
    setLines([]);
    setSubmitted(false);
  }, []);

  const attachmentsFilled = useMemo(
    () => connections.length === round.chords.length,
    [connections.length, round.chords.length],
  );

  const accuracy = useMemo(() => {
    if (connections.length === 0) {
      return null;
    }
    const correctCount = connections.filter(
      (connection) => connection.correct,
    ).length;
    return Math.round((correctCount / connections.length) * 100);
  }, [connections]);
  const allMatchesCorrect = useMemo(
    () =>
      connections.length === round.chords.length &&
      connections.length > 0 &&
      connections.every((connection) => connection.correct),
    [connections, round.chords.length],
  );
  const handleContinue = useCallback(() => {
    if (!attachmentsFilled || submitted) return;
    setSubmitted(true);
    onComplete?.({ success: allMatchesCorrect });
  }, [allMatchesCorrect, attachmentsFilled, onComplete, submitted]);

  const attemptConnection = useCallback(
    (chordId: string, keyboardId: string) => {
      const chord = round.chords.find((item) => item.id === chordId);
      const keyboard = round.keyboards.find((item) => item.id === keyboardId);
      if (!chord || !keyboard) return;
      if (connections.some((connection) => connection.chordId === chordId))
        return;
      if (
        connections.some((connection) => connection.keyboardId === keyboardId)
      )
        return;

      const correct =
        chordSignature(chord.spec) === chordSignature(keyboard.spec);
      setConnections((prev) => [...prev, { chordId, keyboardId, correct }]);
      setActiveChord(null);
      setActiveKeyboard(null);
    },
    [connections, round.chords, round.keyboards],
  );

  const handleChordClick = useCallback(
    (chordId: string) => {
      if (connections.some((connection) => connection.chordId === chordId)) {
        return;
      }

      if (activeChord === chordId) {
        setActiveChord(null);
        return;
      }

      if (activeKeyboard) {
        attemptConnection(chordId, activeKeyboard);
        return;
      }

      setActiveChord(chordId);
    },
    [activeChord, activeKeyboard, attemptConnection, connections],
  );

  const handleKeyboardClick = useCallback(
    (keyboardId: string) => {
      if (
        connections.some((connection) => connection.keyboardId === keyboardId)
      ) {
        return;
      }

      if (activeKeyboard === keyboardId) {
        setActiveKeyboard(null);
        return;
      }

      if (activeChord) {
        attemptConnection(activeChord, keyboardId);
        return;
      }

      setActiveKeyboard(keyboardId);
    },
    [activeChord, activeKeyboard, attemptConnection, connections],
  );

  const connectionSummary = useMemo(() => {
    if (!attachmentsFilled) return null;

    const correctCount = connections.filter(
      (connection) => connection.correct,
    ).length;
    if (correctCount === connections.length) {
      return (
        <div className="text-sm font-medium text-green-600">
          Perfect! All matches are correct.
        </div>
      );
    }

    return (
      <div className="space-y-1 text-sm">
        <div className="font-medium text-orange-600">Mixed results.</div>
        <div>
          You matched {correctCount} of {connections.length} chords correctly.
        </div>
      </div>
    );
  }, [attachmentsFilled, connections]);

  //   const map: Record<string, string[]> = {};
  //   round.keyboards.forEach((keyboard) => {
  //     map[keyboard.id] = keyboard.midi.map((value) => Tone.Frequency(value, 'midi').toNote());
  //   });
  //   return map;
  // }, [round.keyboards]);

  const computeLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const updatedLines = connections
      .map((connection) => {
        const chordElement = chordRefs.current[connection.chordId];
        const keyboardElement = keyboardRefs.current[connection.keyboardId];
        if (!chordElement || !keyboardElement) {
          return null;
        }

        const chordRect = chordElement.getBoundingClientRect();
        const keyboardRect = keyboardElement.getBoundingClientRect();

        return {
          chordId: connection.chordId,
          keyboardId: connection.keyboardId,
          x1: chordRect.right - containerRect.left,
          y1: chordRect.top + chordRect.height / 2 - containerRect.top,
          x2: keyboardRect.left - containerRect.left,
          y2: keyboardRect.top + keyboardRect.height / 2 - containerRect.top,
          correct: connection.correct,
        };
      })
      .filter((line): line is ConnectorLine => Boolean(line));

    setLines(updatedLines);
  }, [connections]);

  useLayoutEffect(() => {
    computeLines();
  }, [computeLines, round]);

  useEffect(() => {
    const handleResize = () => computeLines();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [computeLines]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold">
          Chord Connection Challenge
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Draw matches between chord names and the keyboards that highlight
          their tones.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>
            Matches made: {connections.length}/{round.chords.length}
          </span>
          <span>Accuracy: {accuracy !== null ? `${accuracy}%` : 'N/A'}</span>
        </div>

        <div ref={containerRef} className="relative">
          <svg className="pointer-events-none absolute inset-0 size-full">
            {lines.map((line) => {
              const color = attachmentsFilled
                ? line.correct
                  ? CONNECTION_COLORS.correct
                  : CONNECTION_COLORS.incorrect
                : CONNECTION_COLORS.idle;

              return (
                <line
                  key={`${line.chordId}-${line.keyboardId}`}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  className="transition-colors"
                />
              );
            })}
          </svg>

          <div className="mx-auto grid max-w-5xl gap-8 px-4 md:grid-cols-2 md:gap-12">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Chords
              </h3>
              {round.chords.map((item) => {
                const isActive = activeChord === item.id;
                const isComplete = connections.some(
                  (connection) => connection.chordId === item.id,
                );

                const chordClass = cn(
                  ITEM_BUTTON_BASE_CLASS,
                  'w-1/2 flex flex-col items-center justify-center gap-2 text-center min-h-[169px]',
                  isComplete && 'border-green-500 text-green-700',
                  !isComplete && isActive && 'border-primary text-primary',
                  !isComplete && !isActive && ITEM_BUTTON_IDLE_CLASS,
                );

                return (
                  <button
                    key={item.id}
                    ref={(node) => {
                      chordRefs.current[item.id] = node;
                    }}
                    type="button"
                    className={chordClass}
                    onClick={() => handleChordClick(item.id)}
                    disabled={isComplete}
                  >
                    <span className="text-base font-medium">
                      {showChordNames ? item.label : 'Chord'}
                    </span>
                    {isComplete && (
                      <span className="text-xs font-semibold uppercase text-green-600">
                        Matched
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Keyboards
              </h3>
              {round.keyboards.map((item) => {
                const isActive = activeKeyboard === item.id;
                const isComplete = connections.some(
                  (connection) => connection.keyboardId === item.id,
                );

                const color = attachmentsFilled
                  ? CONNECTION_COLORS.correct
                  : CONNECTION_COLORS.idle;
                const playingNotes = toPlaybackEvents(
                  item.midi,
                  color,
                  item.id,
                );

                const keyboardClass = cn(
                  ITEM_BUTTON_BASE_CLASS,
                  'flex flex-col gap-2',
                  isComplete && 'border-green-500 text-green-700',
                  !isComplete && isActive && 'border-primary text-primary',
                  !isComplete && !isActive && ITEM_BUTTON_IDLE_CLASS,
                );

                return (
                  <button
                    key={item.id}
                    ref={(node) => {
                      keyboardRefs.current[item.id] = node;
                    }}
                    type="button"
                    className={keyboardClass}
                    onClick={() => handleKeyboardClick(item.id)}
                    disabled={isComplete}
                  >
                    <div className={cn(KEYBOARD_CLASS, KEYBOARD_SCALE_CLASS)}>
                      <PianoKeyboard
                        startC={3}
                        endC={5}
                        playingNotes={playingNotes}
                        className="origin-top scale-90"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          {connectionSummary}
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              onClick={resetConnections}
              disabled={connections.length === 0}
            >
              Clear Lines
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!attachmentsFilled || submitted}
            >
              Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
