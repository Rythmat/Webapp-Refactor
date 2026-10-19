import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Eye,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import type {
  TutorialDemoPhase,
  TutorialStepStatus,
} from '@/daw/store/tutorialSlice';
import {
  type AnchorRack,
  type Rect,
  type Target,
  anchorKey,
  idsOf,
  subscribeAnchorRect,
} from './anchorRegistry';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

// ── CoachCard ───────────────────────────────────────────────────────────────
// Floating, draggable step card shown over the Studio while a lesson runs.
// Mirrors the reference "beatspark" card: stage label, progress bar + counter,
// instruction, a Waiting… status on validated steps, and Back / Next / Quit.
// It dynamically anchors itself clear of the spotlighted region so it never
// obstructs the highlighted control.
//
// A step with a demo (TutorialStep.demo) has two states: "Watch" while the
// demo plays, with Skip and the demo's caption read out, then "Your turn",
// with the instruction and "Show me again". A step without one shows as it
// always has. A course lesson says where it is in its course ("Lesson 3 of
// 9").

interface CoachCardProps {
  title: string;
  stage: string;
  instruction: string;
  hint?: string;
  /** Same target as the spotlight — used to position the card clear of it. */
  target?: Target;
  /** Same rack as the spotlight (see anchorRegistry.ts). */
  rack?: AnchorRack;
  stepIndex: number;
  total: number;
  status: TutorialStepStatus;
  isValidated: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onQuit: () => void;
  /** The step's demo, when it has one. */
  demo?: {
    phase: TutorialDemoPhase;
    /** The caption on screen while it plays. */
    caption: string | null;
    onSkip: () => void;
    onReplay: () => void;
  };
  /** A course lesson's place in its course: "Lesson 3 of 9". */
  lessonPlace?: string;
  /**
   * Room kept clear all around the target, past its own box: while a demo
   * plays, its callout sits beside the cursor on the target.
   */
  clearance?: number;
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
  borderRadius: 9999,
  border: '1px solid var(--daw-hairline)',
  background: 'transparent',
  color: disabled ? 'var(--daw-text-3)' : 'var(--daw-text)',
  opacity: disabled ? 0.4 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

// The app's primary action is the landing's white pill. White text on the
// old teal fill was about 1.8:1; #101012 on white passes at any size. A
// validated step's Next stays a quiet pill until the move is made, so it
// doesn't read as clickable while it isn't.
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 700,
  borderRadius: 9999,
  border: 'none',
  background: disabled ? 'var(--daw-surface-2)' : '#fff',
  color: disabled ? 'var(--daw-text-3)' : '#101012',
  opacity: disabled ? 0.6 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

export function CoachCard({
  title,
  stage,
  instruction,
  hint,
  target,
  rack,
  stepIndex,
  total,
  status,
  isValidated,
  isLast,
  onBack,
  onNext,
  onQuit,
  demo,
  lessonPlace,
  clearance = 0,
}: CoachCardProps) {
  const done = status === 'done';
  const watching = demo?.phase === 'watch';
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

  // Re-anchor clear of the target whenever the anchor registry reports it
  // moved (a spring, a scroll, the add-track menu opening → the spotlight
  // jumps from the button to the Synth card), the card itself changes size
  // (a longer instruction) or the window resizes. The card glides there.
  const reducedMotion = usePrefersReducedMotion();
  const targetRect = useRef<Rect | null>(null);
  const key = anchorKey(target, rack);
  useEffect(() => {
    const recompute = () => {
      const box = cardRef.current?.getBoundingClientRect();
      const r = targetRect.current;
      const next = computeCardPos(
        r && clearance
          ? {
              top: r.top - clearance,
              left: r.left - clearance,
              width: r.width + clearance * 2,
              height: r.height + clearance * 2,
            }
          : r,
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
    // Until the registry measures the new target (next frame), the card
    // stays clear of the last one.
    const unsubscribe = subscribeAnchorRect(
      target,
      (rect) => {
        targetRect.current = rect;
        recompute();
      },
      { rack },
    );
    if (idsOf(target).length === 0) {
      targetRect.current = null;
      recompute();
    }
    const card = cardRef.current;
    const ro =
      card && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(recompute)
        : null;
    if (card) ro?.observe(card);
    window.addEventListener('resize', recompute);
    return () => {
      unsubscribe();
      ro?.disconnect();
      window.removeEventListener('resize', recompute);
    };
    // `key` is the value-stable form of `target` + `rack`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, clearance]);

  return (
    <motion.div
      ref={cardRef}
      data-testid="tutorial-coach-card"
      drag
      dragMomentum={false}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: CARD_WIDTH,
        maxWidth: 'calc(100vw - 24px)',
        pointerEvents: 'auto',
        zIndex: 2,
        background: 'var(--daw-surface-1)',
        border: '1px solid var(--daw-hairline)',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        cursor: 'grab',
        transition: reducedMotion ? 'none' : 'top 0.3s ease, left 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 11px',
          borderBottom: '1px solid var(--daw-hairline)',
        }}
      >
        <GraduationCap size={16} style={{ color: 'var(--daw-accent)' }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.3,
            color: 'var(--daw-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        {lessonPlace && (
          <span
            data-testid="tutorial-lesson-place"
            style={{
              fontSize: 12,
              color: 'var(--daw-text-3)',
              whiteSpace: 'nowrap',
            }}
          >
            {lessonPlace}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--daw-text-3)' }}>
          {stepIndex + 1} / {total}
        </span>
        <button
          onClick={onQuit}
          aria-label="Quit tutorial"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 5,
            border: 'none',
            background: 'transparent',
            color: 'var(--daw-text-3)',
            cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--daw-surface-2)' }}>
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: 'var(--daw-accent)',
            transition: reducedMotion ? 'none' : 'width 240ms ease',
          }}
        />
      </div>

      {/* Body */}
      {watching ? (
        <div style={{ padding: '12px 14px' }} data-demo-phase="watch">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: 'var(--daw-accent)',
              marginBottom: 7,
            }}
          >
            <Eye size={14} aria-hidden />
            Watch
          </div>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: 'var(--daw-text)',
              margin: 0,
            }}
          >
            Watch first, then it’s your turn.
          </p>
          <p
            aria-live="polite"
            data-testid="tutorial-demo-caption"
            style={{
              fontSize: 13,
              color: 'var(--daw-text-2)',
              margin: '7px 0 0',
              minHeight: 20,
            }}
          >
            {demo?.caption ? <Rich text={demo.caption} /> : null}
          </p>
        </div>
      ) : (
        <div
          style={{ padding: '12px 14px' }}
          data-demo-phase={demo ? 'turn' : undefined}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: 'var(--daw-accent)',
              marginBottom: 7,
            }}
          >
            {demo ? `Your turn · ${stage}` : stage}
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
                color: 'var(--daw-text)',
                opacity: 0.85,
                margin: '7px 0 0',
              }}
            >
              <Rich text={hint} />
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
                <span style={{ color: 'var(--daw-accent)', fontWeight: 700 }}>
                  ✓ Nice!
                </span>
              ) : (
                <>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--daw-accent)',
                      animation: reducedMotion
                        ? 'none'
                        : 'tutorialDot 1.1s ease-in-out infinite',
                    }}
                  />
                  <span style={{ color: 'var(--daw-text)' }}>
                    Waiting for your move…
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {watching ? (
        <div style={{ display: 'flex', gap: 6, padding: '4px 14px 14px' }}>
          <div style={{ flex: 1 }} />
          <button onClick={demo?.onSkip} style={primaryBtn(false)}>
            Skip <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, padding: '4px 14px 14px' }}>
          <button
            onClick={onBack}
            disabled={stepIndex === 0}
            style={ctrlBtn(stepIndex === 0)}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ flex: 1 }} />
          {demo && (
            <button onClick={demo.onReplay} style={ctrlBtn(false)}>
              <RotateCcw size={14} /> Show me again
            </button>
          )}
          <button
            onClick={onNext}
            disabled={nextDisabled}
            style={primaryBtn(nextDisabled)}
          >
            {isLast ? 'Finish' : 'Next'} <ArrowRight size={15} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
