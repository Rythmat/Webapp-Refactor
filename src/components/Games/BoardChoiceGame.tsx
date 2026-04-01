/* eslint-disable react/jsx-sort-props */
/* eslint-disable sonarjs/cognitive-complexity */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { v4 as uuidv4 } from 'uuid';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import { ionianChordColor } from '@/lib/ionianChordColor';

const MAX_BEATS = 16;
const BEAT_REWARD = 4;
const BEAT_PENALTY = 4;
const COUNT_IN_BEATS = 4;
const BPM_OPTIONS = [60, 70, 80, 90, 100, 110, 120];
const DEFAULT_BPM = 100;

type ChordType = 'maj' | 'min' | 'dim' | 'aug' | '7' | 'maj7' | 'min7';
type GameLevel = 1 | 2 | 3 | 4;

const LEVEL_CONFIG: Record<
  GameLevel,
  { label: string; chordPool: ChordType[]; useInversions: boolean }
> = {
  1: {
    label: 'Root Position Triads',
    chordPool: ['maj', 'min', 'dim'],
    useInversions: false,
  },
  2: {
    label: 'Root Position 7ths',
    chordPool: ['7', 'maj7', 'min7'],
    useInversions: false,
  },
  3: {
    label: 'Inverted Triads',
    chordPool: ['maj', 'min', 'dim'],
    useInversions: true,
  },
  4: {
    label: 'Inverted 7ths',
    chordPool: ['7', 'maj7', 'min7'],
    useInversions: true,
  },
};

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

type CreateRoundArgs = {
  chordPool: ChordType[];
  baseOctaveRoot: number;
  preferredChord?: ChordSpec;
  useInversions?: boolean;
};

function invertChord(midi: number[], inversion: number): number[] {
  const notes = [...midi];
  for (let i = 0; i < inversion; i++) {
    const lowest = notes.shift()!;
    notes.push(lowest + 12);
  }
  return notes;
}

function randomInversion(midi: number[]): number[] {
  const maxInv = midi.length - 1;
  const inv = Math.floor(Math.random() * (maxInv + 1));
  return invertChord(midi, inv);
}

type RoundState = {
  targetLabel: string;
  targetNotes: number[];
  options: ChordOption[];
  optionColors: Map<string, string>;
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
  optionColors: Map<string, string>;
} {
  const normalizedTarget = normalizeNotes(targetNotes);
  if (normalizedTarget.length === 0) {
    return { options: [], targetNotes: [], optionColors: new Map() };
  }
  const root = normalizedTarget[0];
  if (!Number.isFinite(root)) {
    return { options: [], targetNotes: [], optionColors: new Map() };
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

  const shuffled = shuffle(options);
  const optionColors = new Map<string, string>();
  for (const opt of shuffled) {
    optionColors.set(opt.id, ionianChordColor(opt.midi));
  }
  return { options: shuffled, targetNotes: normalizedTarget, optionColors };
}

function createRound({
  chordPool,
  baseOctaveRoot,
  preferredChord,
  useInversions = false,
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
    let midi = buildChord(baseOctaveRoot + spec.rootPc, spec.type);
    if (useInversions) {
      midi = randomInversion(midi);
    }
    options.push({
      id: uuidv4(),
      spec,
      midi,
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

  const targetNotes = options.find((o) => o.isCorrect)?.midi ?? [];
  const shuffled = shuffle(options);
  const optionColors = new Map<string, string>();
  for (const opt of shuffled) {
    optionColors.set(opt.id, ionianChordColor(opt.midi));
  }
  return {
    targetLabel: chordName(target.rootPc, target.type) ?? 'Unknown chord',
    targetNotes,
    options: shuffled,
    optionColors,
  };
}

// ── Styles ─────────────────────────────────────────────────────────────────

const BTN: React.CSSProperties = {
  padding: '9px 28px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.10)',
  backgroundColor: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  color: '#e8e8f0',
  fontSize: 12,
  fontWeight: 600,
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
  startC = 3,
  endC = 5,
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
  const [level, setLevel] = useState<GameLevel>(1);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [score, setScore] = useState(0);
  const [beatsLeft, setBeatsLeft] = useState(MAX_BEATS);
  const [multiplier, setMultiplier] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [countingIn, setCountingIn] = useState(true);
  const [countInBeat, setCountInBeat] = useState(0);
  const [, setCurrentBeatIndex] = useState(0);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metronomePlayerRef = useRef<Tone.Player | null>(null);
  const downbeatPlayerRef = useRef<Tone.Player | null>(null);
  const beatCountRef = useRef(0);

  const [round, setRound] = useState<RoundState>(() => {
    if (targetNotes && targetNotes.length > 0) {
      const {
        options,
        targetNotes: normalizedTarget,
        optionColors,
      } = createCustomOptions(targetNotes);
      return {
        targetLabel: targetLabel ?? 'Unknown chord',
        targetNotes: normalizedTarget,
        options,
        optionColors,
      };
    }
    const initConfig = LEVEL_CONFIG[1];
    return createRound({
      chordPool: initConfig.chordPool,
      baseOctaveRoot,
      preferredChord: initialChord,
      useInversions: initConfig.useInversions,
    });
  });

  const startNewRound = useCallback(
    (preferred?: ChordSpec) => {
      if (targetNotes && targetNotes.length > 0) {
        const {
          options,
          targetNotes: normalizedTarget,
          optionColors,
        } = createCustomOptions(targetNotes);
        setRound({
          targetLabel: targetLabel ?? 'Unknown chord',
          targetNotes: normalizedTarget,
          options,
          optionColors,
        });
        setSelectedOption(null);
        return;
      }
      const config = LEVEL_CONFIG[level];
      setRound(
        createRound({
          chordPool: config.chordPool,
          baseOctaveRoot,
          preferredChord: preferred,
          useInversions: config.useInversions,
        }),
      );
      setSelectedOption(null);
    },
    [baseOctaveRoot, level, targetLabel, targetNotes],
  );

  useEffect(() => {
    startNewRound(initialChord);
  }, [initialChordKey, initialChord, startNewRound, customNotesKey]);

  // Initialize metronome audio players
  useEffect(() => {
    const metro = new Tone.Player('/sound/metronomeClick.mp3').toDestination();
    const downbeat = new Tone.Player(
      '/sound/firstMetronomeClick.mp3',
    ).toDestination();
    metronomePlayerRef.current = metro;
    downbeatPlayerRef.current = downbeat;
    return () => {
      metro.dispose();
      downbeat.dispose();
    };
  }, []);

  const playClick = useCallback((isDownbeat: boolean) => {
    const player = isDownbeat
      ? downbeatPlayerRef.current
      : metronomePlayerRef.current;
    if (!player?.loaded) return;
    if (Tone.getContext().state !== 'running') return;
    const now = Tone.now();
    try {
      if ((player as unknown as { state: string }).state === 'started') {
        player.stop(now);
      }
    } catch {
      /* ignore */
    }
    try {
      player.start(now);
    } catch {
      /* ignore */
    }
  }, []);

  // Beat loop — handles count-in and gameplay beats
  useEffect(() => {
    if (!gameStarted) return;
    if (gameOver) return;
    if (selectedOption && !countingIn) return;

    beatCountRef.current = 0;

    beatIntervalRef.current = setInterval(
      () => {
        const beat = beatCountRef.current;

        if (countingIn) {
          const isDownbeat = beat % 4 === 0;
          playClick(isDownbeat);
          setCountInBeat(beat + 1);
          beatCountRef.current = beat + 1;
          if (beat + 1 >= COUNT_IN_BEATS) {
            setCountingIn(false);
            beatCountRef.current = 0;
          }
          return;
        }

        // Gameplay beat
        const isDownbeat = beat % 4 === 0;
        playClick(isDownbeat);
        setCurrentBeatIndex(beat % 4);

        setBeatsLeft((prev) => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });

        beatCountRef.current = beat + 1;
      },
      (60 / bpm) * 1000,
    );

    return () => {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    };
  }, [gameStarted, gameOver, selectedOption, countingIn, playClick, bpm]);

  const selectedOptionId = selectedOption?.id ?? null;
  const resolvedTargetLabel = round.targetLabel;

  const handleStart = useCallback(async () => {
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    startNewRound(initialChord);
    setGameStarted(true);
  }, [initialChord, startNewRound]);

  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (selectedOption || gameOver || countingIn) return;
      const option = round.options.find((item) => item.id === optionId);
      if (!option) return;

      setSelectedOption(option);
      setSessionTotal((prev) => prev + 1);

      if (option.isCorrect) {
        setScore((prev) => prev + bpm);
        setBeatsLeft((prev) => {
          if (prev >= MAX_BEATS) {
            setMultiplier((m) => m + 1);
          }
          return prev + BEAT_REWARD;
        });
      } else {
        setBeatsLeft((prev) => {
          const newBeats = prev - BEAT_PENALTY;
          if (newBeats <= 0) {
            setGameOver(true);
            return 0;
          }
          return newBeats;
        });
      }

      // Auto-advance after feedback delay
      setTimeout(() => {
        if (onComplete) {
          onComplete();
          return;
        }
        startNewRound(initialChord);
      }, 1200);
    },
    [
      round.options,
      selectedOption,
      gameOver,
      countingIn,
      bpm,
      initialChord,
      onComplete,
      startNewRound,
    ],
  );

  const handleRestart = useCallback(() => {
    setBeatsLeft(MAX_BEATS);
    setMultiplier(1);
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setCountingIn(true);
    setCountInBeat(0);
    setCurrentBeatIndex(0);
    setSessionTotal(0);
    setSelectedOption(null);
    beatCountRef.current = 0;
  }, []);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: '100dvh',
        boxSizing: 'border-box',
        padding: '12px 0',
        overflow: 'hidden',
      }}
    >
      {/* Beat indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 3,
          marginBottom: 6,
        }}
      >
        {Array.from({ length: MAX_BEATS }, (_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor:
                i < beatsLeft
                  ? 'rgba(255,255,255,0.7)'
                  : 'rgba(255,255,255,0.08)',
              marginRight: (i + 1) % 4 === 0 && i < MAX_BEATS - 1 ? 8 : 0,
              transition: 'all 0.15s ease',
            }}
          />
        ))}
      </div>

      {/* Chord name + multiplier */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
        }}
      >
        {showChordName && !countingIn && (
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#e8e8f0',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {resolvedTargetLabel}
          </span>
        )}
        {multiplier > 1 && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#22c55e',
            }}
          >
            x{multiplier}
          </span>
        )}
      </div>

      {!gameStarted ? (
        /* Start screen — level & BPM selection */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 24,
          }}
        >
          {/* Level selector */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Level
            </span>
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {([1, 2, 3, 4] as GameLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  style={{
                    ...BTN,
                    fontSize: 11,
                    padding: '8px 14px',
                    backgroundColor:
                      lvl === level
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.05)',
                    borderColor:
                      lvl === level
                        ? 'rgba(255,255,255,0.25)'
                        : 'rgba(255,255,255,0.10)',
                  }}
                >
                  {lvl}. {LEVEL_CONFIG[lvl].label}
                </button>
              ))}
            </div>
          </div>

          {/* BPM selector */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Tempo — {bpm} pts per correct
            </span>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {BPM_OPTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBpm(b)}
                  style={{
                    ...BTN,
                    fontSize: 11,
                    padding: '6px 12px',
                    minWidth: 48,
                    backgroundColor:
                      b === bpm
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.05)',
                    borderColor:
                      b === bpm
                        ? 'rgba(255,255,255,0.25)'
                        : 'rgba(255,255,255,0.10)',
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            style={{ ...BTN, padding: '12px 40px', fontSize: 14 }}
          >
            Start
          </button>
        </div>
      ) : countingIn ? (
        /* Count-in overlay */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <p
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#e8e8f0',
              margin: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {countInBeat || ''}
          </p>
        </div>
      ) : gameOver ? (
        /* Game Over screen */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            flex: 1,
          }}
        >
          <p
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#e8e8f0',
              letterSpacing: 3,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Time&apos;s Up
          </p>
          <p
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#e8e8f0',
              margin: 0,
            }}
          >
            {multiplier > 1
              ? `${score} × ${multiplier} = ${score * multiplier}`
              : score}
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginLeft: 6,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              pts
            </span>
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              margin: 0,
            }}
          >
            {sessionTotal} rounds • Level {level} • {bpm} BPM
          </p>
          <button type="button" onClick={handleRestart} style={BTN}>
            Play Again
          </button>
          {level < 4 && sessionTotal >= 5 && score > 0 && (
            <button
              type="button"
              onClick={() => {
                setLevel((prev) => Math.min(prev + 1, 4) as GameLevel);
                handleRestart();
              }}
              style={{
                ...BTN,
                borderColor: 'rgba(34,197,94,0.4)',
                color: '#22c55e',
                backgroundColor: 'rgba(34,197,94,0.08)',
              }}
            >
              Next Level
            </button>
          )}
        </div>
      ) : (
        /* Options grid — 2×2 */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            maxWidth: 820,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {round.options.map((option) => {
            const isSelected = option.id === selectedOptionId;
            const isCorrect = option.isCorrect;
            const showResult = Boolean(selectedOptionId);

            const ionianColor = round.optionColors.get(option.id) ?? '#60a5fa';
            const color = showResult
              ? isCorrect
                ? '#22c55e'
                : isSelected
                  ? '#ef4444'
                  : '#94a3b8'
              : ionianColor;

            const playingNotes = toPlaybackEvents(
              option.midi,
              color,
              option.id,
            );

            const borderColor = showResult
              ? isCorrect
                ? 'rgba(34,197,94,0.5)'
                : isSelected
                  ? 'rgba(248,113,113,0.5)'
                  : 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.08)';

            const bg = showResult
              ? isCorrect
                ? 'rgba(34,197,94,0.06)'
                : isSelected
                  ? 'rgba(248,113,113,0.06)'
                  : 'rgba(255,255,255,0.02)'
              : 'rgba(255,255,255,0.03)';

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleOptionSelect(option.id)}
                disabled={Boolean(selectedOptionId) || gameOver}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 12,
                  border: `1px solid ${borderColor}`,
                  backgroundColor: bg,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)',
                  padding: '6px 10px',
                  cursor: selectedOptionId || gameOver ? 'default' : 'pointer',
                  transition: 'all 0.18s ease',
                  width: '100%',
                }}
              >
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
      )}
    </div>
  );
}
