/* eslint-disable react/jsx-sort-props */
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import {
  OCTAVE_HEIGHT,
  OCTAVE_WIDTH,
} from '@/components/PianoKeyboard/useExpandedRange';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import { ArcadeGameHeader } from './ArcadeGameHeader';

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

// Every keyboard renders exactly two octaves, so its footprint is fixed. The
// chord-name buttons are sized to match this so both columns line up 1:1.
const KEYBOARD_OCTAVES = 2;
const KEYBOARD_WIDTH = OCTAVE_WIDTH * KEYBOARD_OCTAVES;
const KEYBOARD_HEIGHT = OCTAVE_HEIGHT;

// ── Component ──────────────────────────────────────────────────────────────

export type ChordConnectionGameProps = {
  chordPool?: ChordType[];
  keyboardBaseOctave?: number;
  showChordNames?: boolean;
  pairs?: number;
  initialChord?: ChordSpec;
  className?: string;
  arcade?: boolean;
  onComplete?: (result: { success: boolean }) => void;
  onCorrect?: () => void;
  onWrong?: () => void;
};

export function ChordConnectionGame({
  chordPool = DEFAULT_CHORD_POOL,
  keyboardBaseOctave = 4,
  showChordNames = true,
  pairs = 4,
  initialChord,
  className,
  arcade,
  onComplete,
  onCorrect,
  onWrong,
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
      if (correct) onCorrect?.();
      else onWrong?.();
      setConnections((prev) => [...prev, { chordId, keyboardId, correct }]);
      setActiveChord(null);
      setActiveKeyboard(null);
    },
    [connections, round.chords, round.keyboards, onCorrect, onWrong],
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

  const clearLinesButton = (
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
  );

  const continueButton = (
    <button
      onClick={handleContinue}
      disabled={!attachmentsFilled || submitted}
      style={{
        ...BTN,
        opacity: !attachmentsFilled || submitted ? 0.4 : 1,
        pointerEvents: !attachmentsFilled || submitted ? 'none' : 'auto',
      }}
    >
      Continue
    </button>
  );

  // Column headers sit centered above each button column.
  const columnLabelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'var(--color-text-dim, #6b7280)',
    marginBottom: 4,
    textAlign: 'center',
  };

  const renderChordButton = (item: MatchColumnItem) => {
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
          width: KEYBOARD_WIDTH,
          height: KEYBOARD_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '12px 16px',
          borderRadius: 10,
          border: `1.5px solid ${borderColor}`,
          backgroundColor: bg,
          color: textColor,
          cursor: isComplete ? 'default' : 'pointer',
          transition: 'all 0.18s ease',
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
  };

  const renderKeyboardButton = (item: KeyboardOption) => {
    const isActive = activeKeyboard === item.id;
    const isComplete = connections.some(
      (connection) => connection.keyboardId === item.id,
    );

    const color = attachmentsFilled
      ? CONNECTION_COLORS.correct
      : CONNECTION_COLORS.idle;
    const playingNotes = toPlaybackEvents(item.midi, color, item.id);

    // Always show two octaves: start at the octave of the lowest note and, when
    // the chord fits within a single octave, include the next one up as well.
    // The fit-content wrapper stops PianoKeyboard from auto-expanding wider.
    const startOctave = Math.floor(Math.min(...item.midi) / 12);
    let endOctave = Math.floor(Math.max(...item.midi) / 12);
    if (endOctave === startOctave) endOctave += 1;

    // The keyboard itself is the button — a selection ring (not a box) shows state.
    const ringColor = isComplete
      ? '#22c55e'
      : isActive
        ? '#a78bfa'
        : 'transparent';

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
          display: 'inline-flex',
          padding: 0,
          border: 'none',
          background: 'transparent',
          borderRadius: 8,
          outline: `2px solid ${ringColor}`,
          outlineOffset: 4,
          cursor: isComplete ? 'default' : 'pointer',
          transition: 'outline-color 0.18s ease',
          width: 'fit-content',
        }}
      >
        <div style={{ pointerEvents: 'none' }}>
          <PianoKeyboard
            startC={startOctave}
            endC={endOctave}
            playingNotes={playingNotes}
          />
        </div>
      </button>
    );
  };

  const connectionArea = (
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

      {/* Both columns share one grid so each chord row lines up with its
          keyboard row, vertically centered for straight connector lines. The
          two content-width columns are centered as a group so they sit an
          equal distance either side of the middle. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          justifyContent: 'center',
          columnGap: 56,
          rowGap: 12,
          alignItems: 'center',
          padding: '0 8px',
        }}
      >
        <h3 style={columnLabelStyle}>Chords</h3>
        <h3 style={columnLabelStyle}>Keyboards</h3>
        {round.chords.map((chordItem, idx) => {
          const keyboardItem = round.keyboards[idx];
          return (
            <Fragment key={chordItem.id}>
              {renderChordButton(chordItem)}
              {keyboardItem && renderKeyboardButton(keyboardItem)}
            </Fragment>
          );
        })}
      </div>
    </div>
  );

  if (arcade) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          minHeight: 0,
        }}
      >
        <ArcadeGameHeader
          title="Chord Connection"
          stats={[
            {
              label: 'Matches',
              value: `${connections.length}/${round.chords.length}`,
            },
            {
              label: 'Accuracy',
              value: accuracy !== null ? `${accuracy}%` : '—',
            },
          ]}
        />

        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
          {/* Connection area */}
          {connectionArea}

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
              {clearLinesButton}
              {continueButton}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 5,
            color: '#a78bfa',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Chord Connection
        </h1>
        <p
          style={{
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#71717a',
            marginTop: 6,
          }}
        >
          Match chord names to their keyboards
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginBottom: 16,
          fontSize: 13,
          color: '#a1a1aa',
        }}
      >
        <span>
          Matches: {connections.length}/{round.chords.length}
        </span>
        <span>Accuracy: {accuracy !== null ? `${accuracy}%` : '—'}</span>
      </div>

      {/* Connection area */}
      {connectionArea}

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
          {clearLinesButton}
          {continueButton}
        </div>
      </div>
    </div>
  );
}
