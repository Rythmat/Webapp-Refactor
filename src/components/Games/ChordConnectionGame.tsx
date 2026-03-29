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
  idle: '#a78bfa',
  correct: '#22c55e',
  incorrect: '#f87171',
};

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
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionSuccessful, setSessionSuccessful] = useState(0);

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
  }, [baseOctaveRoot, chordPool, initialChord, initialChordKey, pairs]);

  const resetConnections = useCallback(() => {
    setConnections([]);
    setActiveChord(null);
    setActiveKeyboard(null);
    setLines([]);
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

  const handlePlayAgain = useCallback(() => {
    if (!attachmentsFilled) return;
    setSessionTotal((prev) => prev + 1);
    if (allMatchesCorrect) setSessionSuccessful((prev) => prev + 1);
    if (onComplete) {
      onComplete({ success: allMatchesCorrect });
      return;
    }
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
  }, [
    allMatchesCorrect,
    attachmentsFilled,
    baseOctaveRoot,
    chordPool,
    initialChord,
    onComplete,
    pairs,
  ]);

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
        <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
          Perfect! All matches are correct.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>
          Mixed results.
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-dim, #6b7280)',
          }}
        >
          You matched {correctCount} of {connections.length} chords correctly.
        </div>
      </div>
    );
  }, [attachmentsFilled, connections]);

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
    <div className={className}>
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
          Chord Connection
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
          Match chord names to their keyboards
        </p>
      </div>

      {/* Session + Stats bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          marginBottom: 20,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.5,
          color: 'var(--color-text-dim, #6b7280)',
        }}
      >
        {sessionTotal > 0 && (
          <span style={{ color: '#a78bfa' }}>
            Session: {Math.round((sessionSuccessful / sessionTotal) * 100)}%
          </span>
        )}
        <span>
          Matches: {connections.length}/{round.chords.length}
        </span>
        <span>Accuracy: {accuracy !== null ? `${accuracy}%` : '—'}</span>
      </div>

      {/* Connection area */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
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
                strokeWidth={2.5}
                strokeLinecap="round"
                style={{ transition: 'stroke 0.3s' }}
              />
            );
          })}
        </svg>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            maxWidth: '100%',
            padding: '0 8px',
          }}
        >
          {/* Chords column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'var(--color-text-dim, #6b7280)',
                marginBottom: 4,
              }}
            >
              Chords
            </h3>
            {round.chords.map((item) => {
              const isActive = activeChord === item.id;
              const isComplete = connections.some(
                (connection) => connection.chordId === item.id,
              );

              const borderColor = isComplete
                ? '#22c55e'
                : isActive
                  ? '#a78bfa'
                  : 'rgba(255,255,255,0.1)';
              const bg = isComplete
                ? 'rgba(34,197,94,0.08)'
                : isActive
                  ? 'rgba(167,139,250,0.12)'
                  : 'rgba(255,255,255,0.03)';
              const textColor = isComplete
                ? '#22c55e'
                : isActive
                  ? '#ddd6fe'
                  : 'var(--color-text, #e2e8f0)';

              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    chordRefs.current[item.id] = node;
                  }}
                  type="button"
                  onClick={() => handleChordClick(item.id)}
                  disabled={isComplete}
                  style={{
                    width: '60%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '20px 16px',
                    borderRadius: 10,
                    border: `1.5px solid ${borderColor}`,
                    backgroundColor: bg,
                    color: textColor,
                    cursor: isComplete ? 'default' : 'pointer',
                    transition: 'all 0.18s ease',
                    minHeight: 80,
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {showChordNames ? item.label : 'Chord'}
                  </span>
                  {isComplete && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        color: '#22c55e',
                      }}
                    >
                      Matched
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Keyboards column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'var(--color-text-dim, #6b7280)',
                marginBottom: 4,
              }}
            >
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
              const playingNotes = toPlaybackEvents(item.midi, color, item.id);

              const borderColor = isComplete
                ? '#22c55e'
                : isActive
                  ? '#a78bfa'
                  : 'rgba(255,255,255,0.1)';
              const bg = isComplete
                ? 'rgba(34,197,94,0.08)'
                : isActive
                  ? 'rgba(167,139,250,0.12)'
                  : 'rgba(255,255,255,0.03)';

              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    keyboardRefs.current[item.id] = node;
                  }}
                  type="button"
                  onClick={() => handleKeyboardClick(item.id)}
                  disabled={isComplete}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: 14,
                    borderRadius: 10,
                    border: `1.5px solid ${borderColor}`,
                    backgroundColor: bg,
                    cursor: isComplete ? 'default' : 'pointer',
                    transition: 'all 0.18s ease',
                    minHeight: 80,
                  }}
                >
                  <div
                    style={{
                      pointerEvents: 'none',
                      transform: 'scale(0.9)',
                      transformOrigin: 'top center',
                    }}
                  >
                    <PianoKeyboard
                      startC={3}
                      endC={5}
                      playingNotes={playingNotes}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {connectionSummary && (
          <div style={{ textAlign: 'center' }}>{connectionSummary}</div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={resetConnections}
            disabled={connections.length === 0}
            style={{
              ...BTN_OUTLINE,
              opacity: connections.length === 0 ? 0.4 : 1,
              pointerEvents: connections.length === 0 ? 'none' : 'auto',
            }}
          >
            Clear Lines
          </button>
          <button
            onClick={handlePlayAgain}
            disabled={!attachmentsFilled}
            style={{
              ...BTN,
              opacity: !attachmentsFilled ? 0.4 : 1,
              pointerEvents: !attachmentsFilled ? 'none' : 'auto',
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
