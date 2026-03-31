import {
  type CSSProperties,
  useState,
  useRef,
  useCallback,
} from 'react';
import {
  startPianoSampler,
  triggerPianoAttackRelease,
  triggerPianoAttack,
  releaseAllPianoNotes,
} from '@/audio/pianoSampler';
import { CRYSTAL_PATHS } from '@/daw/components/Controls/CrystalIcons';
import { useStore } from '@/daw/store';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHROMATIC_NOTES = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
];

const NOTE_DURATION_S = 0.6;
const NOTE_GAP_MS = 1100;
const FLASH_MS = 700;
const CORRECT_FLASH_MS = 600;
const ADVANCE_DELAY_CORRECT = 800;
const ADVANCE_DELAY_WRONG = 1400;
const CHORD_RING_MS = 1500;

// ── Types ─────────────────────────────────────────────────────────────────────

type GameType = 'intervals' | 'chords' | 'scales';
type Phase = 'select' | 'playing' | 'input' | 'correct' | 'wrong';

interface Question {
  type: GameType;
  rootNoteIndex: number;
  rootOctave: number;
  answer: string;
  notes: string[];
  playMode: 'sequential' | 'simultaneous';
}

// ── Interval Definitions ──────────────────────────────────────────────────────

const ALL_INTERVAL_BUTTONS: { label: string; semitones: number }[] = [
  { label: 'Unison', semitones: 0 },
  { label: 'b2', semitones: 1 },
  { label: '2', semitones: 2 },
  { label: 'b3', semitones: 3 },
  { label: '3', semitones: 4 },
  { label: '4', semitones: 5 },
  { label: '#4/b5', semitones: 6 },
  { label: '5', semitones: 7 },
  { label: '#5/b6', semitones: 8 },
  { label: '6', semitones: 9 },
  { label: 'b7', semitones: 10 },
  { label: '7', semitones: 11 },
  { label: 'Octave', semitones: 12 },
];

const INTERVAL_LEVELS: { label: string; hint: string; semitones: number[] }[] = [
  { label: 'Level 1', hint: 'Major Scale', semitones: [0, 2, 4, 5, 7, 9, 11, 12] },
  { label: 'Level 2', hint: 'Minor Scale', semitones: [0, 2, 3, 5, 7, 8, 10, 12] },
  { label: 'Level 3', hint: 'All Intervals', semitones: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
];

// ── Chord Definitions ─────────────────────────────────────────────────────────

const CHORD_DEFS: Record<string, number[]> = {
  'Major':      [0, 4, 7],
  'Minor':      [0, 3, 7],
  'Augmented':  [0, 4, 8],
  'Diminished': [0, 3, 6],
  'Major7':     [0, 4, 7, 11],
  'Minor7':     [0, 3, 7, 10],
  'Dom7':       [0, 4, 7, 10],
  'Min7(b5)':   [0, 3, 6, 10],
  'Dim7':       [0, 3, 6, 9],
  'Major9':     [0, 4, 7, 11, 14],
  'Minor9':     [0, 3, 7, 10, 14],
  'Dom9':       [0, 4, 7, 10, 14],
  'Sus':        [0, 5, 7],
};

const CHORD_LEVELS: { label: string; hint: string; pool: string[] }[] = [
  { label: 'Level 1', hint: 'Triads', pool: ['Major', 'Minor'] },
  { label: 'Level 2', hint: 'Triads+', pool: ['Major', 'Minor', 'Augmented', 'Diminished'] },
  { label: 'Level 3', hint: '7th Chords', pool: ['Major7', 'Minor7', 'Dom7', 'Min7(b5)', 'Dim7'] },
  { label: 'Level 4', hint: 'Extended', pool: ['Major9', 'Minor9', 'Dom9', 'Sus'] },
];

// ── Scale Definitions ─────────────────────────────────────────────────────────

const SCALE_DEFS: Record<string, number[]> = {
  // L1
  'Major':               [0, 2, 4, 5, 7, 9, 11],
  'Minor':               [0, 2, 3, 5, 7, 8, 10],
  // L2
  'Major Pentatonic':    [0, 2, 4, 7, 9],
  'Minor Pentatonic':    [0, 3, 5, 7, 10],
  'Major Blues':          [0, 2, 3, 4, 7, 9],
  'Minor Blues':          [0, 3, 5, 6, 7, 10],
  // L3 - Diatonic Modes
  'Ionian':              [0, 2, 4, 5, 7, 9, 11],
  'Dorian':              [0, 2, 3, 5, 7, 9, 10],
  'Phrygian':            [0, 1, 3, 5, 7, 8, 10],
  'Lydian':              [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian':          [0, 2, 4, 5, 7, 9, 10],
  'Aeolian':             [0, 2, 3, 5, 7, 8, 10],
  'Locrian':             [0, 1, 3, 5, 6, 8, 10],
  // L4 - Melodic Minor Modes
  'Melodic Minor':       [0, 2, 3, 5, 7, 9, 11],
  'Dorian b2':           [0, 1, 3, 5, 7, 9, 10],
  'Lydian Augmented':    [0, 2, 4, 6, 8, 9, 11],
  'Lydian Dominant':     [0, 2, 4, 6, 7, 9, 10],
  'Mixolydian b6':       [0, 2, 4, 5, 7, 8, 10],
  'Aeolian b5':          [0, 2, 3, 5, 6, 8, 10],
  'Altered':             [0, 1, 3, 4, 6, 8, 10],
  // L5 - Harmonic Minor Modes
  'Harmonic Minor':      [0, 2, 3, 5, 7, 8, 11],
  'Locrian #6':          [0, 1, 3, 5, 6, 9, 10],
  'Ionian #5':           [0, 2, 4, 5, 8, 9, 11],
  'Dorian #4':           [0, 2, 3, 6, 7, 9, 10],
  'Phrygian Dominant':   [0, 1, 4, 5, 7, 8, 10],
  'Lydian #2':           [0, 3, 4, 6, 7, 9, 11],
  'Ultralocrian':        [0, 1, 3, 4, 6, 8, 9],
  // L6 - Harmonic Major Modes
  'Harmonic Major':      [0, 2, 4, 5, 7, 8, 11],
  'Dorian b5':           [0, 2, 3, 5, 6, 9, 10],
  'Phrygian b4':         [0, 1, 3, 4, 7, 8, 10],
  'Lydian b3':           [0, 2, 3, 6, 7, 9, 11],
  'Mixolydian b2':       [0, 1, 4, 5, 7, 9, 10],
  'Lydian Aug #2':       [0, 3, 4, 6, 8, 9, 11],
  'Locrian bb7':         [0, 1, 3, 5, 6, 8, 9],
  // L7 - Double Harmonic Modes
  'Double Harmonic':     [0, 1, 4, 5, 7, 8, 11],
  'Lydian #2 #6':        [0, 3, 4, 6, 7, 10, 11],
  'Ultraphrygian':       [0, 1, 3, 4, 7, 8, 9],
  'Hungarian Minor':     [0, 2, 3, 6, 7, 8, 11],
  'Oriental':            [0, 1, 4, 5, 6, 9, 10],
  'Ionian Aug #2':       [0, 3, 4, 5, 8, 9, 11],
  'Locrian bb3 bb7':     [0, 1, 2, 5, 6, 8, 9],
};

const SCALE_LEVELS: { label: string; hint: string; pool: string[] }[] = [
  { label: 'Level 1', hint: 'Major & Minor', pool: ['Major', 'Minor'] },
  { label: 'Level 2', hint: 'Pentatonic & Blues', pool: ['Major Pentatonic', 'Minor Pentatonic', 'Major Blues', 'Minor Blues'] },
  { label: 'Level 3', hint: 'Diatonic Modes', pool: ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'] },
  { label: 'Level 4', hint: 'Melodic Minor', pool: ['Melodic Minor', 'Dorian b2', 'Lydian Augmented', 'Lydian Dominant', 'Mixolydian b6', 'Aeolian b5', 'Altered'] },
  { label: 'Level 5', hint: 'Harmonic Minor', pool: ['Harmonic Minor', 'Locrian #6', 'Ionian #5', 'Dorian #4', 'Phrygian Dominant', 'Lydian #2', 'Ultralocrian'] },
  { label: 'Level 6', hint: 'Harmonic Major', pool: ['Harmonic Major', 'Dorian b5', 'Phrygian b4', 'Lydian b3', 'Mixolydian b2', 'Lydian Aug #2', 'Locrian bb7'] },
  { label: 'Level 7', hint: 'Double Harmonic', pool: ['Double Harmonic', 'Lydian #2 #6', 'Ultraphrygian', 'Hungarian Minor', 'Oriental', 'Ionian Aug #2', 'Locrian bb3 bb7'] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function semitonesToNote(rootIndex: number, rootOctave: number, semitones: number): string {
  const noteIndex = (rootIndex + semitones) % 12;
  const octaveOffset = Math.floor((rootIndex + semitones) / 12);
  return `${CHROMATIC_NOTES[noteIndex]}${rootOctave + octaveOffset}`;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getLevelsForType(type: GameType) {
  if (type === 'intervals') return INTERVAL_LEVELS;
  if (type === 'chords') return CHORD_LEVELS;
  return SCALE_LEVELS;
}

function getAnswerOptions(type: GameType, level: number): { label: string; value: string }[] {
  if (type === 'intervals') {
    const lvl = INTERVAL_LEVELS[level - 1];
    if (!lvl) return [];
    const semiSet = new Set(lvl.semitones);
    return ALL_INTERVAL_BUTTONS
      .filter((b) => semiSet.has(b.semitones))
      .map((b) => ({ label: b.label, value: b.label }));
  }
  if (type === 'chords') {
    const lvl = CHORD_LEVELS[level - 1];
    if (!lvl) return [];
    return lvl.pool.map((name) => ({ label: name, value: name }));
  }
  const lvl = SCALE_LEVELS[level - 1];
  if (!lvl) return [];
  return lvl.pool.map((name) => ({ label: name, value: name }));
}

function generateQuestion(type: GameType, level: number, lockedRootIndex?: number): Question {
  const rootIndex = lockedRootIndex ?? Math.floor(Math.random() * 12);

  if (type === 'intervals') {
    const lvl = INTERVAL_LEVELS[level - 1];
    const semitones = pickRandom(lvl.semitones);
    const rootOctave = 4;
    const rootNote = semitonesToNote(rootIndex, rootOctave, 0);
    const questionNote = semitonesToNote(rootIndex, rootOctave, semitones);
    const answerLabel = ALL_INTERVAL_BUTTONS.find((b) => b.semitones === semitones)!.label;
    return {
      type: 'intervals',
      rootNoteIndex: rootIndex,
      rootOctave,
      answer: answerLabel,
      notes: [rootNote, questionNote],
      playMode: 'sequential',
    };
  }

  if (type === 'chords') {
    const lvl = CHORD_LEVELS[level - 1];
    const chordName = pickRandom(lvl.pool);
    const intervals = chordName === 'Sus'
      ? pickRandom([[0, 2, 7], [0, 5, 7]])
      : CHORD_DEFS[chordName];
    const maxSemitone = Math.max(...intervals);
    const rootOctave = maxSemitone > 12 ? 3 : 4;
    const notes = intervals.map((s) => semitonesToNote(rootIndex, rootOctave, s));
    return {
      type: 'chords',
      rootNoteIndex: rootIndex,
      rootOctave,
      answer: chordName,
      notes,
      playMode: 'simultaneous',
    };
  }

  // scales
  const lvl = SCALE_LEVELS[level - 1];
  const scaleName = pickRandom(lvl.pool);
  const intervals = SCALE_DEFS[scaleName];
  const rootOctave = 4;
  const notes = [...intervals, 12].map((s) => semitonesToNote(rootIndex, rootOctave, s));
  return {
    type: 'scales',
    rootNoteIndex: rootIndex,
    rootOctave,
    answer: scaleName,
    notes,
    playMode: 'sequential',
  };
}

// ── Crystal Icon Mapping ──────────────────────────────────────────────────────

const CHROMA_ICONS: Record<GameType, { key: string; color: string }[]> = {
  intervals: [
    { key: 'nam-clean-twin', color: '#f0f0f0' },       // L1 Quartz
    { key: 'nam-roland-jc120', color: '#a8c8e8' },      // L2 Celestite
    { key: 'nam-vox-ac30', color: '#50c878' },           // L3 Emerald
  ],
  chords: [
    { key: 'nam-marshall-jcm-clean', color: '#f5a623' }, // L1 Amber
    { key: 'nam-crunch-plexi', color: '#f0a040' },       // L2 Sunstone
    { key: 'nam-vox-ac15', color: '#e85d2f' },           // L3 Fire Opal
    { key: 'nam-marshall-jcm800', color: '#e0115f' },    // L4 Ruby
  ],
  scales: [
    { key: 'nam-magnatone-59', color: '#48d1cc' },       // L1 Aquamarine
    { key: 'nam-mesa-mark-iv', color: '#9966cc' },       // L2 Amethyst
    { key: 'nam-soldano-slo', color: '#2850a8' },        // L3 Sapphire
    { key: 'nam-ampeg-svt', color: '#b9f2ff' },          // L4 Diamond
    { key: 'nam-orange-rockerverb', color: '#f4a0b0' },  // L5 Rose Quartz
    { key: 'nam-engl-savage', color: '#3fb094' },         // L6 Amazonite
    { key: 'nam-darkglass-b7k', color: '#882222' },      // L7 Bloodstone
  ],
};

// ── Crystal SVG ───────────────────────────────────────────────────────────────

function Crystal({ lit, gameType, level }: { lit: boolean; gameType: GameType; level: number }) {
  const icon = CHROMA_ICONS[gameType][(level - 1)] ?? CHROMA_ICONS.intervals[0];
  const crystal = CRYSTAL_PATHS[icon.key];
  const S = 90;

  const glowStyle: CSSProperties = lit
    ? {
        filter:
          `drop-shadow(0 0 14px ${icon.color}cc) drop-shadow(0 0 28px ${icon.color}55)`,
      }
    : {};

  return (
    <svg
      width={S}
      height={S}
      viewBox={crystal.viewBox}
      style={{
        overflow: 'visible',
        transition: 'filter 0.5s ease',
        ...glowStyle,
      }}
    >
      <path
        fill={lit ? icon.color : '#2a2a3e'}
        d={crystal.d}
        style={{ transition: 'fill 0.4s ease' }}
      />
    </svg>
  );
}

// ── Answer Buttons ────────────────────────────────────────────────────────────

function AnswerButtons({
  options,
  onSelect,
  disabled,
}: {
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        maxWidth: 420,
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {options.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1.5px solid rgba(167,139,250,0.4)',
            backgroundColor: 'rgba(167,139,250,0.08)',
            color: '#ddd6fe',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: 0.5,
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(167,139,250,0.22)';
            e.currentTarget.style.borderColor = '#a78bfa';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(167,139,250,0.08)';
            e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)';
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Chroma() {
  const setRootNote = useStore((s) => s.setRootNote);

  // Selection state
  const [gameType, setGameType] = useState<GameType>('intervals');
  const [level, setLevel] = useState(1);
  const [fixedRoot, setFixedRoot] = useState(true);

  // Game state
  const [phase, setPhase] = useState<Phase>('select');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [crystalLit, setCrystalLit] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);


  // Scoring
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [streak, setStreak] = useState(0);

  // Refs for async callbacks
  const phaseRef = useRef<Phase>('select');
  const currentQuestionRef = useRef<Question | null>(null);
  const gameTypeRef = useRef<GameType>('intervals');
  const levelRef = useRef(1);
  const streakRef = useRef(0);
  const scoreRef = useRef(0);
  const cancelRef = useRef(false);
  const fixedRootRef = useRef(true);
  const lockedRootRef = useRef<number | null>(null);

  const sp = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ── Audio playback ──────────────────────────────────────────────────────

  const playQuestion = useCallback(async (q: Question) => {
    await startPianoSampler();
    if (q.playMode === 'simultaneous') {
      for (const note of q.notes) {
        triggerPianoAttack(note, 0.45);
      }
      await wait(CHORD_RING_MS);
      await releaseAllPianoNotes();
    } else {
      for (let i = 0; i < q.notes.length; i++) {
        if (cancelRef.current) return;

        await triggerPianoAttackRelease(q.notes[i], NOTE_DURATION_S, 0.55);
        await wait(NOTE_GAP_MS);
      }

    }
  }, []);

  // ── Start next question ─────────────────────────────────────────────────

  const startNextQuestion = useCallback(async () => {
    const type = gameTypeRef.current;
    const lvl = levelRef.current;
    const root = fixedRootRef.current ? lockedRootRef.current ?? undefined : undefined;
    const q = generateQuestion(type, lvl, root);

    currentQuestionRef.current = q;
    setCurrentQuestion(q);
    setCrystalLit(false);
    setCorrectAnswer(null);

    sp('playing');
    await playQuestion(q);
    if (!cancelRef.current) {
      sp('input');
    }
  }, [sp, playQuestion]);

  // ── Handle answer ───────────────────────────────────────────────────────

  const handleAnswer = useCallback(
    async (chosenValue: string) => {
      if (phaseRef.current !== 'input') return;

      const q = currentQuestionRef.current;
      if (!q) return;

      if (chosenValue === q.answer) {
        // Correct
        const newStreak = streakRef.current + 1;
        streakRef.current = newStreak;
        setStreak(newStreak);

        const points = 100 * newStreak;
        const newScore = scoreRef.current + points;
        scoreRef.current = newScore;
        setScore(newScore);
        setHighScore((prev) => Math.max(prev, newScore));

        setCrystalLit(true);
        setFlashGreen(true);
        sp('correct');

        await wait(CORRECT_FLASH_MS);
        setFlashGreen(false);

        await wait(ADVANCE_DELAY_CORRECT - CORRECT_FLASH_MS);
        if (!cancelRef.current) {
          await startNextQuestion();
        }
      } else {
        // Wrong
        streakRef.current = 0;
        setStreak(0);
        setCorrectAnswer(q.answer);

        setFlashRed(true);
        sp('wrong');

        await wait(FLASH_MS);
        setFlashRed(false);

        await wait(ADVANCE_DELAY_WRONG - FLASH_MS);
        if (!cancelRef.current) {
          await startNextQuestion();
        }
      }
    },
    [sp, startNextQuestion],
  );

  // ── Replay ──────────────────────────────────────────────────────────────

  const handleReplay = useCallback(async () => {
    if (phaseRef.current !== 'input') return;
    const q = currentQuestionRef.current;
    if (!q) return;

    sp('playing');
    await playQuestion(q);
    if (!cancelRef.current) {
      sp('input');
    }
  }, [sp, playQuestion]);

  // ── Start game ──────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    gameTypeRef.current = gameType;
    levelRef.current = level;
    cancelRef.current = false;
    fixedRootRef.current = fixedRoot;
    lockedRootRef.current = fixedRoot ? Math.floor(Math.random() * 12) : null;

    streakRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setStreak(0);
    setRootNote(null);

    await startNextQuestion();
  }, [gameType, level, fixedRoot, startNextQuestion, setRootNote]);

  // ── Back to menu ────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    cancelRef.current = true;
    setCrystalLit(false);
    setCurrentQuestion(null);
    setPlayingIdx(null);
    setCorrectAnswer(null);
    setFlashRed(false);
    setFlashGreen(false);
    setRootNote(null);
    releaseAllPianoNotes();
    sp('select');
  }, [sp, setRootNote]);

  // ── Type change resets level ────────────────────────────────────────────

  const handleTypeChange = useCallback((t: GameType) => {
    setGameType(t);
    setLevel(1);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────

  const isPlaying = phase !== 'select';
  const isInputActive = phase === 'input';
  const levels = getLevelsForType(gameType);
  const answerOptions = getAnswerOptions(gameType, level);

  const typeLabel: Record<GameType, string> = {
    intervals: 'interval',
    chords: 'chord',
    scales: 'scale',
  };

  const getStatusLabel = (): string => {
    if (phase === 'select') return '';
    if (phase === 'playing') return 'Listen carefully\u2026';
    if (phase === 'input') return `Name the ${typeLabel[currentQuestion?.type ?? 'intervals']}`;
    if (phase === 'correct') return 'Correct!';
    if (phase === 'wrong' && correctAnswer) return `It was: ${correctAnswer}`;
    return '';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg, #0f0f17)',
        color: 'var(--color-text, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: '24px 16px',
        position: 'relative',
      }}
    >
      {/* ── Red flash overlay ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(220,38,38,0.22)',
          pointerEvents: 'none',
          zIndex: 200,
          opacity: flashRed ? 1 : 0,
          transition: flashRed
            ? 'opacity 0.08s ease-in'
            : 'opacity 0.55s ease-out',
        }}
      />

      {/* ── Green flash overlay ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(34,197,94,0.18)',
          pointerEvents: 'none',
          zIndex: 200,
          opacity: flashGreen ? 1 : 0,
          transition: flashGreen
            ? 'opacity 0.08s ease-in'
            : 'opacity 0.45s ease-out',
        }}
      />

      {/* ── Title ── */}
      <div style={{ textAlign: 'center' }}>
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
          Chroma
        </h1>
        <p
          style={{
            fontSize: 10,
            color: 'var(--color-text-dim, #6b7280)',
            marginTop: 3,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          Ear Training
        </p>
      </div>

      {/* ── Score display (during gameplay) ── */}
      {isPlaying && (
        <div
          style={{
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          <span style={{ color: '#a78bfa' }}>
            Score: {score}
          </span>
          <span style={{ color: 'var(--color-text-dim, #6b7280)' }}>
            Best: {highScore}
          </span>
          {streak >= 2 && (
            <span style={{ color: '#22c55e' }}>
              {streak}x Streak!
            </span>
          )}
        </div>
      )}

      {/* ── Crystal ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Crystal lit={crystalLit} gameType={gameType} level={level} />
        <div
          style={{
            fontSize: 11,
            color:
              phase === 'correct'
                ? '#22c55e'
                : phase === 'wrong'
                  ? '#f87171'
                  : 'var(--color-text-dim, #6b7280)',
            fontWeight: 500,
            minHeight: 16,
            textAlign: 'center',
            transition: 'color 0.3s',
          }}
        >
          {getStatusLabel()}
        </div>
      </div>



      {/* ── Type/Level select + Start ── */}
      {phase === 'select' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {/* Type selector */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['intervals', 'chords', 'scales'] as GameType[]).map((t) => {
              const selected = gameType === t;
              return (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 8,
                    border: `1.5px solid ${selected ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
                    backgroundColor: selected
                      ? 'rgba(167,139,250,0.18)'
                      : 'transparent',
                    color: selected ? '#ddd6fe' : 'rgba(255,255,255,0.45)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    letterSpacing: 0.5,
                    textTransform: 'capitalize',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Level selector */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: 380,
            }}
          >
            {levels.map((lvl, i) => {
              const lvlNum = i + 1;
              const selected = level === lvlNum;
              return (
                <button
                  key={lvlNum}
                  onClick={() => setLevel(lvlNum)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: `1.5px solid ${selected ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                    backgroundColor: selected
                      ? 'rgba(56,189,248,0.14)'
                      : 'transparent',
                    color: selected ? '#bae6fd' : 'rgba(255,255,255,0.4)',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    letterSpacing: 0.3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <span>{lvl.label}</span>
                  <span
                    style={{
                      fontSize: 8,
                      opacity: 0.7,
                      fontWeight: 400,
                    }}
                  >
                    {lvl.hint}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fixed root toggle */}
          <button
            onClick={() => setFixedRoot((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 14px',
              borderRadius: 7,
              border: `1.5px solid ${fixedRoot ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
              backgroundColor: fixedRoot ? 'rgba(167,139,250,0.12)' : 'transparent',
              color: fixedRoot ? '#ddd6fe' : 'rgba(255,255,255,0.4)',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: 0.5,
              transition: 'all 0.18s ease',
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                border: `1.5px solid ${fixedRoot ? '#a78bfa' : 'rgba(255,255,255,0.2)'}`,
                backgroundColor: fixedRoot ? '#a78bfa' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                color: '#0f0f17',
                fontWeight: 800,
                transition: 'all 0.18s ease',
              }}
            >
              {fixedRoot ? '✓' : ''}
            </span>
            Fixed Root
          </button>

          {/* Start button */}
          <button
            onClick={handleStart}
            style={{
              padding: '9px 36px',
              borderRadius: 10,
              border: '1.5px solid #a78bfa',
              backgroundColor: 'rgba(167,139,250,0.14)',
              color: '#ddd6fe',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 2,
              textTransform: 'uppercase',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(167,139,250,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(167,139,250,0.14)';
            }}
          >
            Start
          </button>
        </div>
      )}

      {/* ── Answer buttons (during gameplay) ── */}
      {isPlaying && (
        <AnswerButtons
          options={answerOptions}
          onSelect={handleAnswer}
          disabled={!isInputActive}
        />
      )}

      {/* ── Replay + End Game row (during gameplay) ── */}
      {isPlaying && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          {phase === 'input' && (
            <button
              onClick={handleReplay}
              style={{
                padding: '5px 16px',
                borderRadius: 7,
                border: '1.5px solid rgba(56,189,248,0.4)',
                backgroundColor: 'rgba(56,189,248,0.08)',
                color: '#bae6fd',
                fontSize: 9,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: 1,
                textTransform: 'uppercase',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.2)';
                e.currentTarget.style.borderColor = '#38bdf8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.08)';
                e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)';
              }}
            >
              Replay
            </button>
          )}
          <button
            onClick={handleBack}
            style={{
              padding: '5px 16px',
              borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'transparent',
              color: 'rgba(255,255,255,0.35)',
              fontSize: 9,
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: 1,
              textTransform: 'uppercase',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            End Game
          </button>
        </div>
      )}
    </div>
  );
}
