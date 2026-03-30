/* eslint-disable react/jsx-sort-props */
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  startEpSampler,
  triggerEpAttackRelease,
} from '@/audio/epSampler';
import { usePrismRhythms } from '@/hooks/data/prism/usePrismRhythms';

// ── Constants ─────────────────────────────────────────────────────────────────

const TICKS_PER_QUARTER = 480;
const BPM = 100;
const TICK_DURATION_S = 60 / (BPM * TICKS_PER_QUARTER);
const HIT_NOTE = 'C4';
const HIT_DURATION_S = 0.15;
const HIT_VELOCITY = 0.85;
const TOLERANCE_RATIO = 0.1;
const FLASH_HOLD_MS = 180;

// ── Types ─────────────────────────────────────────────────────────────────────

type RhythmHit = [start: number, duration: number];

type Phase = 'loading' | 'ready' | 'listening' | 'input' | 'success' | 'fail';

// ── Helpers ───────────────────────────────────────────────────────────────────

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function ticksToMs(ticks: number) {
  return ticks * TICK_DURATION_S * 1000;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

// ── Hex Pillar SVG ────────────────────────────────────────────────────────────

type PillarGlow = 'idle' | 'hit' | 'success' | 'fail';

function HexPillar({ glow }: { glow: PillarGlow }) {
  // Side-view of a hexagonal pillar: a tall rectangle capped by angled faces.
  // Canvas 90×200.  Hex cross-section half-width = 43.
  const W = 90;
  const H = 200;
  const cx = 45;
  const hw = 43; // half-width of hex
  const capH = 22; // height of the angled cap faces

  const topY = 10;
  const botY = H - 10;

  // Top cap (two angled faces meeting at apex)
  const topApex = `${cx},${topY}`;
  const topLeft = `${cx - hw},${topY + capH}`;
  const topRight = `${cx + hw},${topY + capH}`;

  // Bottom cap
  const botApex = `${cx},${botY}`;
  const botLeft = `${cx - hw},${botY - capH}`;
  const botRight = `${cx + hw},${botY - capH}`;

  // Body rect
  const bodyTop = topY + capH;
  const bodyBot = botY - capH;

  const lit = glow === 'hit' || glow === 'success';
  const isSuccess = glow === 'success';
  const isFail = glow === 'fail';

  const bodyFill = isSuccess
    ? 'url(#pl-success)'
    : isFail
      ? 'url(#pl-fail)'
      : lit
        ? 'url(#pl-lit)'
        : 'url(#pl-dark)';

  const strokeColor = isSuccess
    ? '#22c55e'
    : isFail
      ? '#f87171'
      : lit
        ? '#a78bfa'
        : '#3a3a52';

  const glowStyle: CSSProperties =
    lit || isSuccess || isFail
      ? {
          filter: isSuccess
            ? 'drop-shadow(0 0 18px rgba(34,197,94,0.7)) drop-shadow(0 0 36px rgba(34,197,94,0.3))'
            : isFail
              ? 'drop-shadow(0 0 18px rgba(248,113,113,0.7)) drop-shadow(0 0 36px rgba(248,113,113,0.3))'
              : 'drop-shadow(0 0 16px rgba(167,139,250,0.9)) drop-shadow(0 0 32px rgba(56,189,248,0.4))',
        }
      : {};

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        overflow: 'visible',
        transition: 'filter 0.18s ease',
        ...glowStyle,
      }}
    >
      <defs>
        <linearGradient id="pl-lit" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="pl-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a2a3e" />
          <stop offset="100%" stopColor="#16162a" />
        </linearGradient>
        <linearGradient id="pl-success" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="pl-fail" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="50%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>

      {/* Ambient glow */}
      {(lit || isSuccess || isFail) && (
        <ellipse
          cx={cx}
          cy={H / 2}
          rx={55}
          ry={100}
          fill={
            isSuccess
              ? 'rgba(34,197,94,0.12)'
              : isFail
                ? 'rgba(248,113,113,0.12)'
                : 'rgba(139,92,246,0.14)'
          }
          style={{ filter: 'blur(18px)' }}
        />
      )}

      {/* Top cap */}
      <polygon
        points={`${topApex} ${topRight} ${topLeft}`}
        fill={bodyFill}
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Body */}
      <rect
        x={cx - hw}
        y={bodyTop}
        width={hw * 2}
        height={bodyBot - bodyTop}
        fill={bodyFill}
        stroke={strokeColor}
        strokeWidth={1.5}
      />

      {/* Bottom cap */}
      <polygon
        points={`${botLeft},${botRight},${botApex}`}
        fill={bodyFill}
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Centre spine */}
      <line
        x1={cx}
        y1={topY}
        x2={cx}
        y2={botY}
        stroke={
          lit || isSuccess ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)'
        }
        strokeWidth={1}
      />

      {/* Upper and lower girdle lines */}
      {[bodyTop, bodyBot].map((y) => (
        <line
          key={y}
          x1={cx - hw}
          y1={y}
          x2={cx + hw}
          y2={y}
          stroke={
            lit || isSuccess
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.03)'
          }
          strokeWidth={0.8}
        />
      ))}

      {/* Highlight shard when lit */}
      {lit && !isSuccess && !isFail && (
        <rect
          x={cx - hw + 4}
          y={bodyTop + 8}
          width={14}
          height={bodyBot - bodyTop - 16}
          rx={3}
          fill="rgba(255,255,255,0.13)"
        />
      )}
    </svg>
  );
}

// ── Hex Beat Button ───────────────────────────────────────────────────────────

function HexButton({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const W = 90;
  const H = 52;
  const cx = 45;
  const cy = 26;
  const rx = 43;
  const ry = 22;

  // Flat-top hexagon fitting in rx × ry
  const pts = [
    [cx - rx, cy],
    [cx - rx / 2, cy - ry],
    [cx + rx / 2, cy - ry],
    [cx + rx, cy],
    [cx + rx / 2, cy + ry],
    [cx - rx / 2, cy + ry],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');

  const handleDown = () => {
    if (disabled) return;
    setPressed(true);
    onPress();
  };
  const handleUp = () => setPressed(false);

  const fill =
    disabled && !pressed
      ? 'rgba(255,255,255,0.03)'
      : pressed
        ? 'rgba(167,139,250,0.35)'
        : 'rgba(167,139,250,0.1)';
  const stroke = disabled ? '#3a3a52' : pressed ? '#c4b5fd' : '#a78bfa';

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        cursor: disabled ? 'default' : 'pointer',
        transition: 'filter 0.12s',
        filter: pressed
          ? 'drop-shadow(0 0 10px rgba(167,139,250,0.6))'
          : 'none',
        userSelect: 'none',
      }}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      onTouchStart={handleDown}
      onTouchEnd={handleUp}
    >
      <polygon
        points={pts}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 2,
          fill: disabled ? '#3a3a52' : '#ddd6fe',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        HIT
      </text>
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Foli() {
  const rhythmsQuery = usePrismRhythms();

  const [phase, setPhase] = useState<Phase>('loading');
  const [pillarGlow, setPillarGlow] = useState<PillarGlow>('idle');
  const [sequence, setSequence] = useState<RhythmHit[]>([]);
  const [userHits, setUserHits] = useState<number[]>([]);

  const phaseRef = useRef<Phase>('loading');
  const sequenceRef = useRef<RhythmHit[]>([]);
  const inputStartRef = useRef<number>(0);
  const userHitsRef = useRef<number[]>([]);

  const sp = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ── Pick a random rhythm once data is loaded ─────────────────────────

  const allPatterns = useMemo(() => {
    if (!rhythmsQuery.data) return [];
    const melodies = Object.values(rhythmsQuery.data.melodies ?? {});
    const chords = Object.values(rhythmsQuery.data.chords ?? {});
    const all = [...melodies, ...chords].filter(
      (p) => Array.isArray(p) && p.length >= 2 && p.length <= 12,
    );
    return all as RhythmHit[][];
  }, [rhythmsQuery.data]);

  useEffect(() => {
    if (allPatterns.length > 0 && phaseRef.current === 'loading') {
      sp('ready');
    }
  }, [allPatterns, sp]);

  // ── Play the demonstration sequence ───────────────────────────────────

  const playSequence = useCallback(async (seq: RhythmHit[]) => {
    await startEpSampler();
    for (let i = 0; i < seq.length; i++) {
      if (phaseRef.current !== 'listening') return;
      const [startTick] = seq[i];

      if (i > 0) {
        await wait(ticksToMs(startTick - seq[i - 1][0]));
      }
      if (phaseRef.current !== 'listening') return;

      setPillarGlow('hit');
      triggerEpAttackRelease(HIT_NOTE, HIT_DURATION_S, HIT_VELOCITY);
      // Hold the flash briefly then dim
      await wait(FLASH_HOLD_MS);
      if (phaseRef.current !== 'listening') return;
      setPillarGlow('idle');
    }
  }, []);

  // ── Start a round ─────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (allPatterns.length === 0) return;

    const picked = pickRandom(allPatterns);
    sequenceRef.current = picked;
    userHitsRef.current = [];

    setSequence(picked);
    setUserHits([]);
    setPillarGlow('idle');

    sp('listening');
    // Short lead-in
    await wait(400);
    await playSequence(picked);

    if (phaseRef.current === 'listening') {
      inputStartRef.current = 0;
      sp('input');
    }
  }, [allPatterns, playSequence, sp]);

  // ── Handle user beat press ────────────────────────────────────────────

  const handleHit = useCallback(async () => {
    if (phaseRef.current !== 'input') return;

    await startEpSampler();
    triggerEpAttackRelease(HIT_NOTE, HIT_DURATION_S, HIT_VELOCITY);

    const now = performance.now();
    // Record first hit as time-zero
    if (userHitsRef.current.length === 0) {
      inputStartRef.current = now;
    }
    const relativeMs = now - inputStartRef.current;

    userHitsRef.current = [...userHitsRef.current, relativeMs];
    setUserHits([...userHitsRef.current]);

    // Flash pillar
    setPillarGlow('hit');
    setTimeout(() => {
      if (phaseRef.current === 'input') setPillarGlow('idle');
    }, FLASH_HOLD_MS);

    // Check if we've collected enough hits
    const seq = sequenceRef.current;
    if (userHitsRef.current.length >= seq.length) {
      // Small grace period then evaluate
      await wait(200);
      evaluate();
    }
  }, []);

  // ── Keyboard support: spacebar / Enter ────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (phaseRef.current === 'input') {
          handleHit();
        } else if (
          phaseRef.current === 'ready' ||
          phaseRef.current === 'success' ||
          phaseRef.current === 'fail'
        ) {
          handleStart();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleHit, handleStart]);

  // ── Evaluate the user's rhythm ────────────────────────────────────────

  const evaluate = useCallback(() => {
    const seq = sequenceRef.current;
    const hits = userHitsRef.current;

    // Convert sequence to relative ms from the first hit
    const seqTimesMs = seq.map(([startTick]) => ticksToMs(startTick));
    // Offset so first note = 0
    const firstSeqMs = seqTimesMs[0];
    const normalizedSeq = seqTimesMs.map((t) => t - firstSeqMs);

    // Total sequence span
    const seqSpan =
      normalizedSeq.length > 1 ? normalizedSeq[normalizedSeq.length - 1] : 1000;
    const windowMs = seqSpan * TOLERANCE_RATIO;

    let allGood = true;
    for (let i = 0; i < normalizedSeq.length; i++) {
      const expected = normalizedSeq[i];
      const actual = hits[i] ?? 0;
      if (Math.abs(actual - expected) > windowMs) {
        allGood = false;
        break;
      }
    }

    if (allGood) {
      setPillarGlow('success');
      sp('success');
    } else {
      setPillarGlow('fail');
      sp('fail');
    }
  }, [sp]);

  // ── Reset after result ────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setPillarGlow('idle');
    setSequence([]);
    setUserHits([]);
    userHitsRef.current = [];
    sp('ready');
  }, [sp]);

  // ── Derived display ───────────────────────────────────────────────────

  const isInputActive = phase === 'input';

  const statusLabel: Record<Phase, string> = {
    loading: 'Loading rhythms…',
    ready: '',
    listening: 'Listen to the rhythm…',
    input: 'Tap the rhythm back',
    success: 'Rhythm matched!',
    fail: 'Not quite — try again',
  };

  const hitsRemaining =
    phase === 'input' ? sequence.length - userHits.length : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: '24px 16px',
        minHeight: '70vh',
      }}
    >
      {/* Title */}
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
          Foli
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
          Rhythmic recall
        </p>
      </div>

      {/* Pillar */}
      <HexPillar glow={pillarGlow} />

      {/* Status */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          minHeight: 16,
          textAlign: 'center',
          transition: 'color 0.3s',
          color:
            phase === 'success'
              ? '#22c55e'
              : phase === 'fail'
                ? '#f87171'
                : 'var(--color-text-dim, #6b7280)',
        }}
      >
        {statusLabel[phase]}
      </div>

      {/* Hits remaining counter */}
      {hitsRemaining !== null && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          {Array.from({ length: sequence.length }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                backgroundColor:
                  i < userHits.length ? '#a78bfa' : 'rgba(255,255,255,0.1)',
                transition: 'background-color 0.15s',
              }}
            />
          ))}
        </div>
      )}

      {/* Beat button */}
      {isInputActive && <HexButton disabled={false} onPress={handleHit} />}

      {/* Start / Play Again */}
      {(phase === 'ready' || phase === 'success' || phase === 'fail') && (
        <button
          onClick={phase === 'ready' ? handleStart : handleReset}
          style={{
            padding: '9px 36px',
            borderRadius: 10,
            border: `1.5px solid ${phase === 'fail' ? '#f87171' : '#a78bfa'}`,
            backgroundColor:
              phase === 'fail'
                ? 'rgba(248,113,113,0.1)'
                : 'rgba(167,139,250,0.14)',
            color: phase === 'fail' ? '#fca5a5' : '#ddd6fe',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 2,
            textTransform: 'uppercase',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              phase === 'fail'
                ? 'rgba(248,113,113,0.2)'
                : 'rgba(167,139,250,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              phase === 'fail'
                ? 'rgba(248,113,113,0.1)'
                : 'rgba(167,139,250,0.14)';
          }}
        >
          {phase === 'ready' ? 'Start' : 'Play Again'}
        </button>
      )}

      {/* Loading state */}
      {phase === 'loading' && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-dim, #6b7280)',
            letterSpacing: 1,
          }}
        >
          Loading rhythms…
        </div>
      )}
    </div>
  );
}
