import { type CSSProperties, useState, useEffect, useRef, useCallback } from 'react';
import { startPianoSampler, triggerPianoAttackRelease } from '@/audio/pianoSampler';
import { CircleOfFifths } from '@/daw/components/Prism/CircleOfFifths';
import { useStore } from '@/daw/store';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_DURATION_S = 0.6;
const NOTE_GAP_MS     = 1100;
const FLASH_MS        = 700;
const POST_FLASH_MS   = 500;

// ── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';

type Phase =
  | 'select'
  | 'playing'
  | 'input'
  | 'evaluating'
  | 'wrong'
  | 'success'
  | 'game-over';

interface DiffConfig {
  label:      string;
  attempts:   number;
  color:      string;
  extraNotes: () => number;
}

// ── Difficulty config ─────────────────────────────────────────────────────────

const DIFF: Record<Difficulty, DiffConfig> = {
  easy:   { label: 'Easy',   attempts: 2, color: '#22c55e', extraNotes: () => 1 },
  medium: { label: 'Medium', attempts: 2, color: '#f59e0b', extraNotes: () => 2 + Math.floor(Math.random() * 2) },
  hard:   { label: 'Hard',   attempts: 3, color: '#ef4444', extraNotes: () => 5 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function generateSequence(difficulty: Difficulty): number[] {
  const root  = Math.floor(Math.random() * 12);
  const extra = DIFF[difficulty].extraNotes();
  const notes = [root];
  for (let i = 0; i < extra; i++) {
    const interval = 1 + Math.floor(Math.random() * 11);
    notes.push((root + interval) % 12);
  }
  return notes;
}

// ── Crystal SVG ───────────────────────────────────────────────────────────────

function Crystal({ lit }: { lit: boolean }) {
  const W = 80, H = 140;
  const cx = W / 2;

  // Six-point elongated crystal (diamond-hexagonal)
  const pts = [
    [cx,      0],
    [cx + 36, 42],
    [cx + 36, 98],
    [cx,      H],
    [cx - 36, 98],
    [cx - 36, 42],
  ].map(([x, y]) => `${x},${y}`).join(' ');

  const glowStyle: CSSProperties = lit
    ? { filter: 'drop-shadow(0 0 16px rgba(167,139,250,0.9)) drop-shadow(0 0 32px rgba(56,189,248,0.4))' }
    : {};

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ overflow: 'visible', transition: 'filter 0.5s ease', ...glowStyle }}
    >
      <defs>
        <linearGradient id="cr-lit" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%"   stopColor="#e9d5ff" />
          <stop offset="45%"  stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="cr-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#2a2a3e" />
          <stop offset="100%" stopColor="#16162a" />
        </linearGradient>
      </defs>

      {/* Ambient glow behind when lit */}
      {lit && (
        <ellipse
          cx={cx} cy={H / 2} rx={52} ry={68}
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
      <line x1={cx} y1={0} x2={cx} y2={H}
        stroke={lit ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)'}
        strokeWidth={1} />

      {/* Upper girdle */}
      <line x1={cx - 36} y1={42} x2={cx + 36} y2={42}
        stroke={lit ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)'}
        strokeWidth={0.8} />

      {/* Lower girdle */}
      <line x1={cx - 36} y1={98} x2={cx + 36} y2={98}
        stroke={lit ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)'}
        strokeWidth={0.8} />

      {/* Upper highlight shard */}
      {lit && (
        <polygon
          points={`${cx},8 ${cx + 16},42 ${cx},34 ${cx - 16},42`}
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
  label?:   string;
  active?:  boolean;
  filled?:  boolean;
  reveal?:  boolean;
}) {
  let borderColor = 'rgba(255,255,255,0.1)';
  let bg          = 'rgba(255,255,255,0.03)';
  let color       = 'rgba(255,255,255,0.2)';

  if (active) {
    borderColor = '#a78bfa';
    bg          = 'rgba(167,139,250,0.18)';
    color       = '#ddd6fe';
  } else if (reveal) {
    borderColor = '#c4b5fd';
    bg          = 'rgba(196,181,253,0.12)';
    color       = '#ddd6fe';
  } else if (filled) {
    borderColor = '#38bdf8';
    bg          = 'rgba(56,189,248,0.12)';
    color       = '#bae6fd';
  }

  return (
    <div
      style={{
        width: 38, height: 38,
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

function AttemptPips({ total, remaining }: { total: number; remaining: number }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 9, height: 9,
            borderRadius: '50%',
            backgroundColor: i < remaining ? '#a78bfa' : 'rgba(255,255,255,0.1)',
            transition: 'background-color 0.3s',
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Chroma() {
  const rootNote    = useStore((s) => s.rootNote);
  const setRootNote = useStore((s) => s.setRootNote);

  const [difficulty,   setDifficulty]   = useState<Difficulty>('easy');
  const [phase,        setPhase]        = useState<Phase>('select');
  const [sequence,     setSequence]     = useState<number[]>([]);
  const [userInput,    setUserInput]    = useState<number[]>([]);
  const [attemptsLeft, setAttemptsLeft] = useState(2);
  const [crystalLit,   setCrystalLit]  = useState(false);
  const [flashRed,     setFlashRed]    = useState(false);
  const [playingIdx,   setPlayingIdx]  = useState<number | null>(null);

  // Stable refs for use inside async callbacks
  const phaseRef       = useRef<Phase>('select');
  const sequenceRef    = useRef<number[]>([]);
  const userInputRef   = useRef<number[]>([]);
  const attemptsRef    = useRef(2);
  const difficultyRef  = useRef<Difficulty>('easy');

  // Sync difficulty ref
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  // Sync phase to both state and ref
  const sp = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ── Sequence playback ───────────────────────────────────────────────────

  const playSeq = useCallback(async (seq: number[]) => {
    await startPianoSampler();
    for (let i = 0; i < seq.length; i++) {
      setPlayingIdx(i);
      setRootNote(seq[i]); // highlight current note in circle
      await triggerPianoAttackRelease(
        CHROMATIC_NOTES[seq[i]] + '4',
        NOTE_DURATION_S,
        0.85,
      );
      await wait(NOTE_GAP_MS);
    }
    setPlayingIdx(null);
    setRootNote(null);
  }, [setRootNote]);

  // ── Evaluation ──────────────────────────────────────────────────────────

  const evaluate = useCallback(async (input: number[]) => {
    const correct = input.every((n, i) => n === sequenceRef.current[i]);

    if (correct) {
      setCrystalLit(true);
      sp('success');
      return;
    }

    // Wrong — decrement attempts
    const remaining = attemptsRef.current - 1;
    attemptsRef.current = remaining;
    setAttemptsLeft(remaining);

    // Flash red + show "wrong" message
    setFlashRed(true);
    sp('wrong');
    await wait(FLASH_MS);
    setFlashRed(false);

    if (remaining <= 0) {
      sp('game-over');
      return;
    }

    // Replay sequence
    await wait(POST_FLASH_MS);
    userInputRef.current = [];
    setUserInput([]);
    sp('playing');
    await playSeq(sequenceRef.current);
    sp('input');
  }, [sp, playSeq]);

  // ── Capture circle-of-fifths clicks as game input ───────────────────────

  useEffect(() => {
    // Only process during active input phase
    if (phaseRef.current !== 'input') return;
    if (rootNote === null) return;
    // Guard against overfill (sequence already complete)
    if (userInputRef.current.length >= sequenceRef.current.length) return;

    const captured = rootNote;
    // Clear immediately so the same note can be re-selected next turn
    setRootNote(null);

    const newInput = [...userInputRef.current, captured];
    userInputRef.current = newInput;
    setUserInput([...newInput]);

    if (newInput.length >= sequenceRef.current.length) {
      sp('evaluating');
      evaluate(newInput);
    }
  }, [rootNote, evaluate, setRootNote, sp]);

  // ── Start ───────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    const diff = difficultyRef.current;
    const seq  = generateSequence(diff);
    const cfg  = DIFF[diff];

    sequenceRef.current  = seq;
    userInputRef.current = [];
    attemptsRef.current  = cfg.attempts;

    setSequence(seq);
    setUserInput([]);
    setAttemptsLeft(cfg.attempts);
    setCrystalLit(false);
    setRootNote(null);

    sp('playing');
    await playSeq(seq);
    sp('input');
  }, [sp, playSeq, setRootNote]);

  // ── Reset ───────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setCrystalLit(false);
    setSequence([]);
    setUserInput([]);
    setPlayingIdx(null);
    setRootNote(null);
    sp('select');
  }, [sp, setRootNote]);

  // ── Derived display ─────────────────────────────────────────────────────

  const isInputActive  = phase === 'input';
  const showSlots      = phase === 'playing' || phase === 'input' || phase === 'evaluating' || phase === 'wrong';
  const showPips       = phase !== 'select' && phase !== 'success' && phase !== 'game-over';
  const diffCfg        = DIFF[difficulty];

  const statusLabel: Record<Phase, string> = {
    select:      '',
    playing:     'Listen carefully…',
    input:       'Replay the sequence',
    evaluating:  'Checking…',
    wrong:       'Not quite — listen again…',
    success:     'Crystal attuned!',
    'game-over': '',
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
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(220,38,38,0.22)',
          pointerEvents: 'none',
          zIndex: 200,
          opacity: flashRed ? 1 : 0,
          transition: flashRed ? 'opacity 0.08s ease-in' : 'opacity 0.55s ease-out',
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
          Pitch sequence recall
        </p>
      </div>

      {/* ── Crystal ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Crystal lit={crystalLit} />
        <div
          style={{
            fontSize: 11,
            color: phase === 'success' ? '#a78bfa' : phase === 'wrong' ? '#f87171' : 'var(--color-text-dim, #6b7280)',
            fontWeight: 500,
            minHeight: 16,
            textAlign: 'center',
            transition: 'color 0.3s',
          }}
        >
          {statusLabel[phase]}
        </div>
      </div>

      {/* ── Note slots ── */}
      {showSlots && sequence.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {sequence.map((note, i) => {
            // Playing phase: reveal notes as they're played
            if (phase === 'playing') {
              const isPlayed  = playingIdx !== null && i <= playingIdx;
              const isCurrent = i === playingIdx;
              return (
                <NoteSlot
                  key={i}
                  label={isPlayed ? CHROMATIC_NOTES[note] : undefined}
                  active={isCurrent}
                  reveal={isPlayed && !isCurrent}
                />
              );
            }

            // Input / evaluating / wrong: show user's answers
            const entered = userInput[i];
            const isFilled = entered !== undefined;
            const isNext   = i === userInput.length && phase === 'input';
            return (
              <NoteSlot
                key={i}
                label={isFilled ? CHROMATIC_NOTES[entered] : undefined}
                active={isNext}
                filled={isFilled}
              />
            );
          })}
        </div>
      )}

      {/* ── Attempt pips ── */}
      {showPips && (
        <AttemptPips total={diffCfg.attempts} remaining={attemptsLeft} />
      )}

      {/* ── Difficulty select + Start button ── */}
      {phase === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {/* Difficulty buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
              const cfg     = DIFF[d];
              const selected = difficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 8,
                    border: `1.5px solid ${selected ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                    backgroundColor: selected ? `${cfg.color}1a` : 'transparent',
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
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(167,139,250,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(167,139,250,0.14)';
            }}
          >
            Start
          </button>
        </div>
      )}

      {/* ── Success screen ── */}
      {phase === 'success' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
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
          <p style={{ fontSize: 12, color: '#f87171', fontWeight: 600, margin: 0 }}>
            The sequence was:
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {sequence.map((note, i) => (
              <div
                key={i}
                style={{
                  width: 38, height: 38,
                  borderRadius: 7,
                  border: '2px solid #f87171',
                  backgroundColor: 'rgba(248,113,113,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fca5a5',
                  letterSpacing: 0.5,
                }}
              >
                {CHROMATIC_NOTES[note]}
              </div>
            ))}
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

      {/* ── Circle of Fifths ── */}
      <div
        style={{
          pointerEvents: isInputActive ? 'auto' : 'none',
          opacity: isInputActive ? 1 : 0.4,
          transition: 'opacity 0.3s ease',
        }}
      >
        <CircleOfFifths size={300} />
      </div>
    </div>
  );
}
