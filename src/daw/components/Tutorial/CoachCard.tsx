import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, GraduationCap } from 'lucide-react';
import type { TutorialStepStatus } from '@/daw/store/tutorialSlice';
import { type Rect, type Target, idsOf, resolveTargetRect } from './targetRect';

// ── CoachCard ───────────────────────────────────────────────────────────────
// Floating, draggable step card shown over the Studio while a lesson runs.
// Mirrors the reference "beatspark" card: stage label, progress bar + counter,
// instruction, a Waiting… status on validated steps, and Back / Next / Quit.
// It dynamically anchors itself clear of the spotlighted region so it never
// obstructs the highlighted control.

interface CoachCardProps {
  title: string;
  stage: string;
  instruction: string;
  hint?: string;
  /** Same target as the spotlight — used to position the card clear of it. */
  target?: Target;
  stepIndex: number;
  total: number;
  status: TutorialStepStatus;
  isValidated: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onQuit: () => void;
}

const CARD_WIDTH = 380;
const MARGIN = 16;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** Place the card clear of the target: in the larger vertical gap (above/below),
 *  horizontally centered on it and clamped to the viewport. Falls back to a side
 *  when the target is too tall, and to low-center when there's no target. */
function computeCardPos(
  rect: Rect | null,
  cardW: number,
  cardH: number,
  vw: number,
  vh: number,
): { top: number; left: number } {
  if (!rect) {
    return { top: Math.round(vh * 0.6), left: Math.round((vw - cardW) / 2) };
  }
  const gapTop = rect.top;
  const gapBottom = vh - (rect.top + rect.height);
  const needV = cardH + MARGIN * 2;
  const left = clamp(
    rect.left + rect.width / 2 - cardW / 2,
    MARGIN,
    vw - cardW - MARGIN,
  );

  if (gapBottom >= needV || gapTop >= needV) {
    const below = gapBottom >= gapTop;
    const top = below
      ? rect.top + rect.height + MARGIN
      : rect.top - cardH - MARGIN;
    return { top: clamp(top, MARGIN, vh - cardH - MARGIN), left };
  }

  // Target too tall for vertical placement → go to the larger side.
  const right = vw - (rect.left + rect.width) >= rect.left;
  const sideLeft = right
    ? rect.left + rect.width + MARGIN
    : rect.left - cardW - MARGIN;
  const top = clamp(
    rect.top + rect.height / 2 - cardH / 2,
    MARGIN,
    vh - cardH - MARGIN,
  );
  return { top, left: clamp(sideLeft, MARGIN, vw - cardW - MARGIN) };
}

/** Render text with **bold** segments. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const ctrlBtn = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 7,
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: disabled ? 'var(--color-text-dim)' : 'var(--color-text)',
  opacity: disabled ? 0.4 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 700,
  borderRadius: 7,
  border: 'none',
  background: disabled ? 'var(--color-surface-2)' : 'var(--color-accent)',
  color: disabled ? 'var(--color-text-dim)' : '#fff',
  opacity: disabled ? 0.6 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

export function CoachCard({
  title,
  stage,
  instruction,
  hint,
  target,
  stepIndex,
  total,
  status,
  isValidated,
  isLast,
  onBack,
  onNext,
  onQuit,
}: CoachCardProps) {
  const done = status === 'done';
  const progress = total > 0 ? (stepIndex + (done ? 1 : 0)) / total : 0;
  const nextDisabled = isValidated && !done;

  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>(() =>
    computeCardPos(
      null,
      CARD_WIDTH,
      220,
      typeof window !== 'undefined' ? window.innerWidth : 1440,
      typeof window !== 'undefined' ? window.innerHeight : 900,
    ),
  );

  // Re-anchor clear of the target. Sampled on a light interval (not per-frame,
  // so the card glides), which also catches the target moving mid-step (e.g. the
  // add-track menu opening → spotlight jumps from the button to the Synth card).
  const targetKey = idsOf(target).join('|');
  useEffect(() => {
    const recompute = () => {
      const box = cardRef.current?.getBoundingClientRect();
      const next = computeCardPos(
        resolveTargetRect(target),
        box?.width || CARD_WIDTH,
        box?.height || 220,
        window.innerWidth,
        window.innerHeight,
      );
      setPos((prev) =>
        Math.abs(prev.top - next.top) < 4 && Math.abs(prev.left - next.left) < 4
          ? prev
          : next,
      );
    };
    recompute();
    const id = window.setInterval(recompute, 150);
    window.addEventListener('resize', recompute);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  return (
    <motion.div
      ref={cardRef}
      drag
      dragMomentum={false}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: CARD_WIDTH,
        maxWidth: 'calc(100vw - 24px)',
        pointerEvents: 'auto',
        zIndex: 2,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        cursor: 'grab',
        transition: 'top 0.3s ease, left 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 11px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <GraduationCap size={16} style={{ color: 'var(--color-accent)' }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.3,
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
          {stepIndex + 1} / {total}
        </span>
        <button
          onClick={onQuit}
          aria-label="Quit tutorial"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 5,
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--color-surface-2)' }}>
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: 'var(--color-accent)',
            transition: 'width 240ms ease',
          }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
            marginBottom: 7,
          }}
        >
          {stage}
        </div>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            color: '#fff',
            margin: 0,
          }}
        >
          <Rich text={instruction} />
        </p>
        {hint && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text)',
              opacity: 0.85,
              margin: '7px 0 0',
            }}
          >
            {hint}
          </p>
        )}

        {isValidated && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              fontSize: 13,
            }}
          >
            {done ? (
              <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                ✓ Nice!
              </span>
            ) : (
              <>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    animation: 'tutorialDot 1.1s ease-in-out infinite',
                  }}
                />
                <span style={{ color: 'var(--color-text)' }}>
                  Waiting for your move…
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 14px 14px' }}>
        <button
          onClick={onBack}
          disabled={stepIndex === 0}
          style={ctrlBtn(stepIndex === 0)}
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={onNext}
          disabled={nextDisabled}
          style={primaryBtn(nextDisabled)}
        >
          {isLast ? 'Finish' : 'Next'} <ArrowRight size={15} />
        </button>
      </div>
    </motion.div>
  );
}
