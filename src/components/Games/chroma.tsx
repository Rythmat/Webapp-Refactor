import {
  type CSSProperties,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { ArcadeGameHeader } from './ArcadeGameHeader';
import {
  CHROMA_FRESH,
  CHROMA_INTERVALS,
  CHROMA_ROOT,
  chromaInterval,
  intervalLabel,
  pickIntervals,
  roundNotes,
  type ChromaLevel,
  type IntervalNaming,
} from './chromaRounds';
import { useChromaSound } from './chromaSound';
import { useArcadeStreak, useStreakCelebration } from './scoring/ArcadeStreak';

// ── Constants ─────────────────────────────────────────────────────────────────

const NOTE_DURATION_S = 0.6;
/** From the root to its interval note. */
const ROOT_GAP_MS = 750;
/** From an interval note to the next root. */
const PAIR_GAP_MS = 1250;
/** An answer sounds as the root, then the interval chosen. */
const ANSWER_GAP_MS = 450;
/** The answer's root ends before the interval chosen starts. */
const ANSWER_ROOT_S = 0.4;
const FLASH_MS = 700;
const POST_FLASH_MS = 500;

const NAMING_KEY = 'chroma-interval-naming';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'select' | 'playing' | 'input' | 'wrong' | 'success' | 'game-over';

interface LevelConfig {
  label: string;
  attempts: number;
  color: string;
}

// ── Level config ──────────────────────────────────────────────────────────────

/** A level is how many intervals a round asks for. */
const LEVELS: Record<ChromaLevel, LevelConfig> = {
  1: { label: 'Level 1', attempts: 2, color: '#22c55e' },
  2: { label: 'Level 2', attempts: 2, color: '#f59e0b' },
  3: { label: 'Level 3', attempts: 3, color: '#ef4444' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** The naming the player last chose; words until they choose. */
function savedNaming(): IntervalNaming {
  try {
    return localStorage.getItem(NAMING_KEY) === 'numbers' ? 'numbers' : 'words';
  } catch {
    return 'words';
  }
}

function saveNaming(naming: IntervalNaming) {
  try {
    localStorage.setItem(NAMING_KEY, naming);
  } catch {
    // Private windows and blocked storage: the choice lasts the visit.
  }
}

// ── Crystal SVG ───────────────────────────────────────────────────────────────

function Crystal({ lit }: { lit: boolean }) {
  // Regular hexagon, pointy-top, radius 50, canvas 90×106, centred at (45,53)
  const W = 90,
    H = 106;
  const cx = 45,
    cy = 53;
  // r=50 → half-width = r*sin60 ≈ 43, half-height = r=50
  const pts = [
    [cx, cy - 50], // top apex
    [cx + 43, cy - 25], // top-right
    [cx + 43, cy + 25], // bottom-right
    [cx, cy + 50], // bottom apex
    [cx - 43, cy + 25], // bottom-left
    [cx - 43, cy - 25], // top-left
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');

  const glowStyle: CSSProperties = lit
    ? {
        filter:
          'drop-shadow(0 0 16px rgba(167,139,250,0.9)) drop-shadow(0 0 32px rgba(56,189,248,0.4))',
      }
    : {};

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        overflow: 'visible',
        transition: 'filter 0.5s ease',
        ...glowStyle,
      }}
    >
      <defs>
        <linearGradient id="cr-lit" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="cr-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a2a3e" />
          <stop offset="100%" stopColor="#16162a" />
        </linearGradient>
      </defs>

      {/* Ambient glow behind when lit */}
      {lit && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={55}
          ry={55}
          fill="rgba(139,92,246,0.18)"
          style={{ filter: 'blur(14px)' }}
        />
      )}

      {/* Main body */}
      <polygon
        points={pts}
        fill={lit ? 'url(#cr-lit)' : 'url(#cr-dark)'}
        stroke={lit ? '#a78bfa' : '#3a3a52'}
        strokeWidth={1.5}
      />

      {/* Vertical spine */}
      <line
        x1={cx}
        y1={cy - 50}
        x2={cx}
        y2={cy + 50}
        stroke={lit ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)'}
        strokeWidth={1}
      />

      {/* Upper girdle — connects the two upper side vertices */}
      <line
        x1={cx - 43}
        y1={cy - 25}
        x2={cx + 43}
        y2={cy - 25}
        stroke={lit ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)'}
        strokeWidth={0.8}
      />

      {/* Lower girdle — connects the two lower side vertices */}
      <line
        x1={cx - 43}
        y1={cy + 25}
        x2={cx + 43}
        y2={cy + 25}
        stroke={lit ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)'}
        strokeWidth={0.8}
      />

      {/* Upper highlight shard */}
      {lit && (
        <polygon
          points={`${cx},${cy - 47} ${cx + 22},${cy - 25} ${cx},${cy - 32} ${cx - 22},${cy - 25}`}
          fill="rgba(255,255,255,0.22)"
        />
      )}
    </svg>
  );
}

// ── Note Slot ─────────────────────────────────────────────────────────────────

function NoteSlot({
  label,
  active = false,
  filled = false,
  reveal = false,
}: {
  label?: string;
  active?: boolean;
  filled?: boolean;
  reveal?: boolean;
}) {
  let borderColor = 'rgba(255,255,255,0.1)';
  let bg = 'rgba(255,255,255,0.03)';
  let color = 'rgba(255,255,255,0.2)';

  if (active) {
    borderColor = '#a78bfa';
    bg = 'rgba(167,139,250,0.18)';
    color = '#ddd6fe';
  } else if (reveal) {
    borderColor = '#c4b5fd';
    bg = 'rgba(196,181,253,0.12)';
    color = '#ddd6fe';
  } else if (filled) {
    borderColor = '#38bdf8';
    bg = 'rgba(56,189,248,0.12)';
    color = '#bae6fd';
  }

  return (
    <div
      style={{
        minWidth: 38,
        height: 38,
        padding: '0 8px',
        boxSizing: 'border-box',
        borderRadius: 7,
        border: `2px solid ${borderColor}`,
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        color,
        transition: 'all 0.18s ease',
        letterSpacing: 0.5,
      }}
    >
      {label ?? '?'}
    </div>
  );
}

// ── Attempt Pips ──────────────────────────────────────────────────────────────

function AttemptPips({
  total,
  remaining,
}: {
  total: number;
  remaining: number;
}) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            backgroundColor:
              i < remaining ? '#a78bfa' : 'rgba(255,255,255,0.1)',
            transition: 'background-color 0.3s',
          }}
        />
      ))}
    </div>
  );
}

// ── Interval Buttons ─────────────────────────────────────────────────────────

function IntervalButtons({
  naming,
  onSelect,
  disabled,
}: {
  naming: IntervalNaming;
  onSelect: (semitones: number) => void;
  disabled: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        maxWidth: 340,
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {CHROMA_INTERVALS.map(({ semitones, words, number }) => (
        <button
          key={semitones}
          type="button"
          title={naming === 'numbers' ? words : number}
          onClick={() => onSelect(semitones)}
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
          {naming === 'numbers' ? number : words}
        </button>
      ))}
    </div>
  );
}

// ── Streak win ───────────────────────────────────────────────────────────────

/** The win's arpeggio on the lead, after the answer that won it has sounded. */
const WIN_JINGLE_DELAY_MS = 1100;
const WIN_JINGLE = [72, 76, 79, 84];
const WIN_JINGLE_STEP_MS = 140;

// ── Main Component ────────────────────────────────────────────────────────────

export type ChromaProps = {
  onCorrect?: () => void;
  onWrong?: () => void;
};

export default function Chroma({ onCorrect, onWrong }: ChromaProps = {}) {
  // The lead starts loading with the first render, and Start stays held until
  // it can actually play — the notes are the whole puzzle, so a silent round
  // is an unplayable one.
  const { ready: audioReady, play } = useChromaSound();

  const [level, setLevel] = useState<ChromaLevel>(1);
  const [naming, setNaming] = useState<IntervalNaming>(savedNaming);
  const [phase, setPhase] = useState<Phase>('select');
  // A round is its intervals, heard from the game's own root. The Studio's key
  // (the DAW store's rootNote) belongs to the project open there: the game
  // used to clear it on every Start and Play Again, wiping that project's key,
  // key color and key lock.
  const [intervals, setIntervals] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [attemptsLeft, setAttemptsLeft] = useState(2);
  const [crystalLit, setCrystalLit] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  // The note sounding, as an index into roundNotes(intervals).
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  // Whether the game is still on screen: a round left mid-play stops sounding.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // A won streak (the page's, shown in the strip under the header): the
  // crystal lights and the lead plays an arpeggio.
  const playRef = useRef(play);
  playRef.current = play;
  const celebrating = useStreakCelebration(
    useArcadeStreak()?.win ?? null,
    () => {
      const timers = WIN_JINGLE.map((midi, i) =>
        window.setTimeout(
          () => {
            if (aliveRef.current)
              playRef.current(
                midi,
                i === WIN_JINGLE.length - 1 ? 0.6 : 0.12,
                0.8,
              );
          },
          WIN_JINGLE_DELAY_MS + i * WIN_JINGLE_STEP_MS,
        ),
      );
      return () => timers.forEach((t) => window.clearTimeout(t));
    },
  );

  // Stable refs for use inside async callbacks
  const phaseRef = useRef<Phase>('select');
  const intervalsRef = useRef<number[]>([]);
  const userInputRef = useRef<number[]>([]);
  const attemptsRef = useRef(2);
  const levelRef = useRef<ChromaLevel>(1);
  // The intervals heard lately, newest last: a new round leaves them out.
  const recentRef = useRef<number[]>([]);

  // Sync level ref
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const chooseNaming = useCallback((next: IntervalNaming) => {
    setNaming(next);
    saveNaming(next);
  }, []);

  // Sync phase to both state and ref
  const sp = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ── Round playback: the root before every interval note ─────────────────

  const playRound = useCallback(
    async (round: number[]) => {
      const notes = roundNotes(round);
      for (let i = 0; i < notes.length; i++) {
        if (!aliveRef.current) return;
        setPlayingIdx(i);
        play(notes[i].midi, NOTE_DURATION_S, 0.85);
        await wait(notes[i].isRoot ? ROOT_GAP_MS : PAIR_GAP_MS);
      }
      setPlayingIdx(null);
    },
    [play],
  );

  // ── Interval input check ─────────────────────────────────────────────────

  const handleIntervalInput = useCallback(
    async (chosenInterval: number) => {
      if (phaseRef.current !== 'input') return;

      const round = intervalsRef.current;
      const expectedInterval = round[userInputRef.current.length];

      // The answer sounds as the round does: the root, then the interval chosen.
      play(CHROMA_ROOT, ANSWER_ROOT_S, 0.75);
      void wait(ANSWER_GAP_MS).then(() => {
        if (aliveRef.current)
          play(CHROMA_ROOT + chosenInterval, NOTE_DURATION_S, 0.75);
      });

      if (chosenInterval !== expectedInterval) {
        onWrong?.();
        // Wrong interval — immediate feedback
        const remaining = attemptsRef.current - 1;
        attemptsRef.current = remaining;
        setAttemptsLeft(remaining);

        setFlashRed(true);
        sp('wrong');
        await wait(FLASH_MS);
        setFlashRed(false);

        if (remaining <= 0) {
          sp('game-over');
          return;
        }

        await wait(POST_FLASH_MS);
        userInputRef.current = [];
        setUserInput([]);
        sp('playing');
        await playRound(intervalsRef.current);
        sp('input');
      } else {
        onCorrect?.();
        const newInput = [...userInputRef.current, chosenInterval];
        userInputRef.current = newInput;
        setUserInput([...newInput]);

        // All intervals identified
        if (newInput.length >= round.length) {
          setCrystalLit(true);
          sp('success');
        }
      }
    },
    [sp, play, playRound, onCorrect, onWrong],
  );

  // ── Start ───────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    const lvl = levelRef.current;
    const round = pickIntervals(lvl, Math.random, recentRef.current);
    recentRef.current = [...recentRef.current, ...round].slice(-CHROMA_FRESH);
    const cfg = LEVELS[lvl];

    intervalsRef.current = round;
    userInputRef.current = [];
    attemptsRef.current = cfg.attempts;

    setIntervals(round);
    setUserInput([]);
    setAttemptsLeft(cfg.attempts);
    setCrystalLit(false);

    sp('playing');
    await playRound(round);
    sp('input');
  }, [sp, playRound]);

  // ── Reset ───────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setCrystalLit(false);
    setIntervals([]);
    setUserInput([]);
    setPlayingIdx(null);
    sp('select');
  }, [sp]);

  // ── Derived display ─────────────────────────────────────────────────────

  const isInputActive = phase === 'input';
  const showSlots =
    phase === 'playing' || phase === 'input' || phase === 'wrong';
  const showPips =
    phase !== 'select' && phase !== 'success' && phase !== 'game-over';
  const levelCfg = LEVELS[level];

  const statusLabel: Record<Phase, string> = {
    select: '',
    playing: 'Listen carefully…',
    input: intervals.length > 1 ? 'Name the intervals' : 'Name the interval',
    wrong: 'Not quite — listen again…',
    success: 'Crystal attuned!',
    'game-over': '',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#101012',
        color: 'var(--color-text, #e2e8f0)',
        position: 'relative',
        overflow: 'hidden',
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

      <ArcadeGameHeader title="Chroma" />

      {/* ── Body ── */}
      <div
        style={{
          position: 'relative',
          flex: '1 1 0%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '24px 16px',
        }}
      >
        {/* ── Crystal ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Crystal lit={crystalLit || celebrating !== null} />
          <div
            style={{
              fontSize: 11,
              color:
                phase === 'success'
                  ? '#a78bfa'
                  : phase === 'wrong'
                    ? '#f87171'
                    : 'var(--color-text-dim, #6b7280)',
              fontWeight: 500,
              minHeight: 16,
              textAlign: 'center',
              transition: 'color 0.3s',
            }}
          >
            {statusLabel[phase]}
          </div>
        </div>

        {/* ── Note slots: Root → interval, once per interval ── */}
        {showSlots && intervals.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {intervals.map((semitones, i) => {
              const isFilled = userInput[i] !== undefined;
              const isNext = i === userInput.length && phase === 'input';
              return (
                <span
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <NoteSlot label="Root" active={playingIdx === i * 2} reveal />
                  <span
                    style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}
                  >
                    →
                  </span>
                  <NoteSlot
                    label={
                      phase !== 'playing' && isFilled
                        ? intervalLabel(semitones, naming)
                        : undefined
                    }
                    active={playingIdx === i * 2 + 1 || isNext}
                    filled={isFilled}
                  />
                </span>
              );
            })}
          </div>
        )}

        {/* ── Attempt pips ── */}
        {showPips && (
          <AttemptPips total={levelCfg.attempts} remaining={attemptsLeft} />
        )}

        {/* ── Difficulty select + Start button ── */}
        {phase === 'select' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {/* Level buttons: how many intervals a round asks for */}
            <div style={{ display: 'flex', gap: 8 }}>
              {([1, 2, 3] as ChromaLevel[]).map((lvl) => {
                const cfg = LEVELS[lvl];
                const selected = level === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    aria-pressed={selected}
                    title={`${lvl} interval${lvl > 1 ? 's' : ''} a round`}
                    onClick={() => setLevel(lvl)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 8,
                      border: `1.5px solid ${selected ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                      backgroundColor: selected
                        ? `${cfg.color}1a`
                        : 'transparent',
                      color: selected ? cfg.color : 'rgba(255,255,255,0.45)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      letterSpacing: 0.5,
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Name the intervals in words or by number */}
            <div
              role="group"
              aria-label="Name intervals by"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: 0.5,
                }}
              >
                Name them by
              </span>
              {(
                [
                  ['words', 'Words'],
                  ['numbers', 'Numbers'],
                ] as [IntervalNaming, string][]
              ).map(([value, text]) => {
                const selected = naming === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    title={
                      value === 'numbers'
                        ? 'Perfect 4th is 4, Minor 3rd ♭3, Tritone ♯4, Octave 8'
                        : 'Perfect 4th, Minor 3rd, Tritone, Octave'
                    }
                    onClick={() => chooseNaming(value)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 999,
                      border: `1px solid ${selected ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
                      backgroundColor: selected
                        ? 'rgba(167,139,250,0.14)'
                        : 'transparent',
                      color: selected ? '#ddd6fe' : 'rgba(255,255,255,0.45)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {text}
                  </button>
                );
              })}
            </div>

            {/* Start button — held until the lead can play the round */}
            <button
              onClick={handleStart}
              disabled={!audioReady}
              style={{
                padding: '9px 36px',
                borderRadius: 10,
                border: '1.5px solid #a78bfa',
                backgroundColor: 'rgba(167,139,250,0.14)',
                color: '#ddd6fe',
                fontSize: 13,
                fontWeight: 700,
                cursor: audioReady ? 'pointer' : 'progress',
                opacity: audioReady ? 1 : 0.55,
                letterSpacing: 2,
                textTransform: 'uppercase',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                if (!audioReady) return;
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'rgba(167,139,250,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'rgba(167,139,250,0.14)';
              }}
            >
              {audioReady ? 'Start' : 'Loading sounds…'}
            </button>
          </div>
        )}

        {/* ── Success screen ── */}
        {phase === 'success' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <button
              onClick={handleReset}
              style={{
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
              }}
            >
              Play Again
            </button>
          </div>
        )}

        {/* ── Game over screen ── */}
        {phase === 'game-over' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: '#f87171',
                fontWeight: 600,
                margin: 0,
              }}
            >
              The intervals were:
            </p>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {/* Root tile — the starting note the intervals were measured from */}
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: '2px solid #a78bfa',
                  backgroundColor: 'rgba(167,139,250,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#ddd6fe',
                    letterSpacing: 0.5,
                  }}
                >
                  Root
                </span>
                <span
                  style={{
                    fontSize: 8,
                    color: 'rgba(221,214,254,0.7)',
                  }}
                >
                  {chromaInterval(0).note}
                </span>
              </div>
              {intervals.map((semitones, i) => {
                return (
                  <div
                    key={i}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: '2px solid #f87171',
                      backgroundColor: 'rgba(248,113,113,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#fca5a5',
                        letterSpacing: 0.5,
                      }}
                    >
                      {intervalLabel(semitones, naming)}
                    </span>
                    <span
                      style={{
                        fontSize: 8,
                        color: 'rgba(252,165,165,0.7)',
                      }}
                    >
                      {chromaInterval(semitones).note}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleReset}
              style={{
                marginTop: 4,
                padding: '9px 28px',
                borderRadius: 10,
                border: '1.5px solid #f87171',
                backgroundColor: 'rgba(248,113,113,0.1)',
                color: '#fca5a5',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Interval buttons ── */}
        <IntervalButtons
          naming={naming}
          onSelect={handleIntervalInput}
          disabled={!isInputActive}
        />
      </div>
    </div>
  );
}
