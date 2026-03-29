/* eslint-disable react/jsx-sort-props */
/* eslint-disable sonarjs/cognitive-complexity */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';

type ChordType = 'maj' | 'min' | 'dim' | 'aug' | '7' | 'maj7' | 'min7';

type ChordSpec = {
  rootPc: number;
  type: ChordType;
};

type ChordOption = {
  id: string;
  midi: number[];
  isCorrect: boolean;
  spec?: ChordSpec;
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

type CreateRoundArgs = {
  chordPool: ChordType[];
  baseOctaveRoot: number;
  preferredChord?: ChordSpec;
};

type RoundState = {
  targetLabel: string;
  targetNotes: number[];
  options: ChordOption[];
};

function buildChord(rootMidi: number, type: ChordType) {
  const octaveStart = Math.floor(rootMidi / 12) * 12;
  return CHORD_INTERVALS[type].map((interval) => {
    const note = rootMidi + interval;
    return note > octaveStart + 11 ? note - 12 : note;
  });
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

function midiToNoteName(midi: number) {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${PITCH_CLASS_NAMES[pitchClass] ?? 'Unknown'}${octave}`;
}

function intervalsSignature(root: number, notes: number[]) {
  return notes.map((note) => note - root);
}

function signatureToString(signature: number[]) {
  return [signature].join(',');
}

function normalizeNotes(notes: number[]) {
  return [...notes].sort((a, b) => a - b);
}

function createCustomOptions(targetNotes: number[]): {
  options: ChordOption[];
  targetNotes: number[];
} {
  const normalizedTarget = normalizeNotes(targetNotes);
  if (normalizedTarget.length === 0) {
    return { options: [], targetNotes: [] };
  }
  const root = normalizedTarget[0];
  if (!Number.isFinite(root)) {
    return { options: [], targetNotes: [] };
  }
  const targetSignature = intervalsSignature(root, normalizedTarget);
  const used = new Set<string>([signatureToString(normalizedTarget)]);
  const options: ChordOption[] = [
    {
      id: uuidv4(),
      midi: normalizedTarget,
      isCorrect: true,
    },
  ];

  const octave = Math.floor(root / 12);
  let possibleRoots = Array.from({ length: 12 }, (_, index) => index)
    .map((i) => i + 12 * octave)
    .filter((i) => i !== root);
  while (options.length < 4 && possibleRoots.length > 0) {
    const candiRoot = shuffle(possibleRoots)[0];
    possibleRoots = possibleRoots.filter((i) => i !== candiRoot);
    const candidateNotes = [...targetSignature].map(
      (interval) => candiRoot + interval,
    );
    const normalizedCandidate = normalizeNotes(candidateNotes);
    if (used.has(signatureToString(normalizedCandidate))) {
      continue;
    }
    used.add(signatureToString(normalizedCandidate));
    options.push({
      id: uuidv4(),
      midi: normalizedCandidate,
      isCorrect: false,
    });
  }

  while (options.length < 4) {
    options.push({
      id: uuidv4(),
      midi: normalizedTarget,
      isCorrect: false,
    });
  }

  return { options: shuffle(options), targetNotes: normalizedTarget };
}

function createRound({
  chordPool,
  baseOctaveRoot,
  preferredChord,
}: CreateRoundArgs): RoundState {
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

  const targetNotes = buildChord(baseOctaveRoot + target.rootPc, target.type);
  return {
    targetLabel: chordName(target.rootPc, target.type) ?? 'Unknown chord',
    targetNotes,
    options: shuffle(options),
  };
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

// ── Component ──────────────────────────────────────────────────────────────

export type BoardChoiceGameProps = {
  startC?: number;
  /** @default 4 — one octave */
  endC?: number;
  chordPool?: ChordType[];
  showChordName?: boolean;
  keyboardBaseOctave?: number;
  initialChord?: ChordSpec;
  targetNotes?: number[];
  targetLabel?: string;
  className?: string;
  onComplete?: () => void;
};

export function BoardChoiceGame({
  startC = 4,
  endC = 4,
  chordPool = DEFAULT_CHORD_POOL,
  showChordName = true,
  keyboardBaseOctave = 4,
  initialChord,
  targetNotes,
  targetLabel,
  className,
  onComplete,
}: BoardChoiceGameProps) {
  const baseOctaveRoot = keyboardBaseOctave * 12;
  const initialChordKey = initialChord ? chordSignature(initialChord) : 'none';
  const customNotesKey = targetNotes ? targetNotes.join(',') : 'none';

  const [selectedOption, setSelectedOption] = useState<ChordOption | null>(
    null,
  );
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionSuccessful, setSessionSuccessful] = useState(0);

  const [round, setRound] = useState<RoundState>(() => {
    if (targetNotes && targetNotes.length > 0) {
      const { options, targetNotes: normalizedTarget } =
        createCustomOptions(targetNotes);
      return {
        targetLabel: targetLabel ?? 'Unknown chord',
        targetNotes: normalizedTarget,
        options,
      };
    }
    return createRound({
      chordPool,
      baseOctaveRoot,
      preferredChord: initialChord,
    });
  });

  const startNewRound = useCallback(
    (preferred?: ChordSpec) => {
      if (targetNotes && targetNotes.length > 0) {
        const { options, targetNotes: normalizedTarget } =
          createCustomOptions(targetNotes);
        setRound({
          targetLabel: targetLabel ?? 'Unknown chord',
          targetNotes: normalizedTarget,
          options,
        });
        setSelectedOption(null);

        return;
      }
      setRound(
        createRound({ chordPool, baseOctaveRoot, preferredChord: preferred }),
      );
      setSelectedOption(null);
    },
    [baseOctaveRoot, chordPool, targetLabel, targetNotes],
  );

  useEffect(() => {
    startNewRound(initialChord);
  }, [initialChordKey, initialChord, startNewRound, customNotesKey]);

  const selectedOptionId = selectedOption?.id ?? null;
  const resolvedTargetLabel = round.targetLabel;
  const resolvedTargetNotes = round.targetNotes;
  const targetNoteNames = useMemo(
    () => resolvedTargetNotes.map(midiToNoteName),
    [resolvedTargetNotes],
  );

  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (selectedOption) return;
      const option = round.options.find((item) => item.id === optionId);
      if (!option) return;

      setSelectedOption(option);
    },
    [round.options, selectedOption],
  );

  const handlePlayAgain = useCallback(() => {
    if (!selectedOption) return;
    setSessionTotal((prev) => prev + 1);
    if (selectedOption.isCorrect) setSessionSuccessful((prev) => prev + 1);
    if (onComplete) {
      onComplete();
      return;
    }
    startNewRound(initialChord);
  }, [initialChord, onComplete, selectedOption, startNewRound]);

  const feedback = useMemo(() => {
    if (!selectedOption) return null;

    if (selectedOption.isCorrect) {
      return (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
          Correct! You nailed the chord.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>
          Not quite.
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-dim, #6b7280)',
          }}
        >
          The correct keyboard shows {resolvedTargetLabel}
          {targetNoteNames.length > 0 && (
            <span style={{ color: '#bae6fd' }}>
              {' '}
              ({targetNoteNames.join(', ')})
            </span>
          )}
          .
        </div>
      </div>
    );
  }, [selectedOption, resolvedTargetLabel, targetNoteNames]);

  return (
    <div className={className}>
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
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
          Board Choice
        </h1>
        {showChordName && (
          <p
            style={{
              fontSize: 11,
              color: 'var(--color-text-dim, #6b7280)',
              marginTop: 6,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Which keyboard highlights{' '}
            <span style={{ color: '#ddd6fe', fontWeight: 600 }}>
              {resolvedTargetLabel}
            </span>
            ?
          </p>
        )}
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

      {/* Options grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
        }}
      >
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

          const borderColor = showResult
            ? isCorrect
              ? '#22c55e'
              : isSelected
                ? '#f87171'
                : 'rgba(255,255,255,0.07)'
            : isSelected
              ? '#a78bfa'
              : 'rgba(255,255,255,0.1)';

          const bg = showResult
            ? isCorrect
              ? 'rgba(34,197,94,0.08)'
              : isSelected
                ? 'rgba(248,113,113,0.08)'
                : 'rgba(255,255,255,0.02)'
            : isSelected
              ? 'rgba(167,139,250,0.1)'
              : 'rgba(255,255,255,0.03)';

          const labelColor = showResult
            ? isCorrect
              ? '#22c55e'
              : isSelected
                ? '#f87171'
                : 'rgba(255,255,255,0.35)'
            : '#ddd6fe';

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionSelect(option.id)}
              disabled={Boolean(selectedOptionId)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                borderRadius: 12,
                border: `1.5px solid ${borderColor}`,
                backgroundColor: bg,
                padding: 14,
                textAlign: 'left',
                cursor: selectedOptionId ? 'default' : 'pointer',
                transition: 'all 0.18s ease',
                width: '100%',
                maxWidth: 400,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ color: labelColor }}>
                  Option {String.fromCharCode(65 + index)}
                </span>
                {showResult && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 1,
                      color: isCorrect
                        ? '#22c55e'
                        : isSelected
                          ? '#f87171'
                          : 'rgba(255,255,255,0.25)',
                    }}
                  >
                    {isCorrect
                      ? 'Correct'
                      : isSelected
                        ? 'Your Pick'
                        : 'Incorrect'}
                  </span>
                )}
              </div>
              <div style={{ pointerEvents: 'none' }}>
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

      {/* Feedback */}
      {feedback && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>{feedback}</div>
      )}

      {/* Play Again */}
      {selectedOptionId && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={handlePlayAgain} style={BTN}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
