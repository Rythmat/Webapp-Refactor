import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, GraduationCap } from 'lucide-react';
import type { TutorialStepStatus } from '@/daw/store/tutorialSlice';
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
// It anchors itself clear of the spotlighted region, and of any open menu,
// popover or dialog (where the student clicks next), so it never covers what
// the step asks for.

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
}

const CARD_WIDTH = 380;
const MARGIN = 16;
/** The target's keep-clear border: the spotlight ring's gap and glow. */
const KEEP_CLEAR = 12;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** Open menus, select lists, popovers and dialogs: where a click goes next. */
const FLOATING_SELECTOR =
  '[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]';

/** The open floating surfaces outside the lesson layer, as boxes. */
export function floatingSurfaces(): Rect[] {
  if (typeof document === 'undefined') return [];
  const out: Rect[] = [];
  for (const el of document.querySelectorAll(FLOATING_SELECTOR)) {
    if (el.closest('[data-tutorial-layer]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      out.push({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  }
  return out;
}

const overlapArea = (a: Rect, b: Rect) =>
  Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left),
  ) *
  Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top),
  );

/**
 * Place the card clear of the target and of open menus and dialogs
 * (`obstacles`). It tries, in order: the larger vertical gap, then the other,
 * centred on the target; the larger side gap, then the other; then the
 * window's corners and edges. Each place is clamped to the window, and the
 * first that covers nothing wins. When every place covers something (a
 * target nearly the size of the window), the one covering the least of the
 * target wins, and of the obstacles after that. With no target it rests
 * low-centre, clear of the obstacles.
 */
export function computeCardPos(
  rect: Rect | null,
  cardW: number,
  cardH: number,
  vw: number,
  vh: number,
  obstacles: Rect[] = [],
): { top: number; left: number } {
  const maxLeft = Math.max(MARGIN, vw - cardW - MARGIN);
  const maxTop = Math.max(MARGIN, vh - cardH - MARGIN);
  const place = (top: number, left: number) => ({
    top: Math.round(clamp(top, MARGIN, maxTop)),
    left: Math.round(clamp(left, MARGIN, maxLeft)),
  });
  const candidates: Array<{ top: number; left: number }> = [];
  if (rect) {
    const midX = rect.left + rect.width / 2 - cardW / 2;
    const midY = rect.top + rect.height / 2 - cardH / 2;
    const below = place(rect.top + rect.height + MARGIN, midX);
    const above = place(rect.top - cardH - MARGIN, midX);
    const right = place(midY, rect.left + rect.width + MARGIN);
    const left = place(midY, rect.left - cardW - MARGIN);
    const gapBelow = vh - (rect.top + rect.height);
    const gapRight = vw - (rect.left + rect.width);
    candidates.push(
      ...(gapBelow >= rect.top ? [below, above] : [above, below]),
      ...(gapRight >= rect.left ? [right, left] : [left, right]),
    );
  } else {
    candidates.push(place(vh * 0.6, (vw - cardW) / 2));
  }
  for (const top of [MARGIN, maxTop, (vh - cardH) / 2]) {
    for (const left of [MARGIN, maxLeft, (vw - cardW) / 2]) {
      candidates.push(place(top, left));
    }
  }

  const clear = rect && {
    top: rect.top - KEEP_CLEAR,
    left: rect.left - KEEP_CLEAR,
    width: rect.width + KEEP_CLEAR * 2,
    height: rect.height + KEEP_CLEAR * 2,
  };
  let best = candidates[0];
  let bestCost = Infinity;
  for (const c of candidates) {
    const box = { ...c, width: cardW, height: cardH };
    const onTarget = clear ? overlapArea(box, clear) : 0;
    const onObstacles = obstacles.reduce(
      (sum, o) => sum + overlapArea(box, o),
      0,
    );
    // Covering the target always costs more than covering a menu.
    const cost = onTarget * (vw * vh + 1) + onObstacles;
    if (cost < bestCost) {
      best = c;
      bestCost = cost;
      if (cost === 0) break;
    }
  }
  return best;
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

  // Re-anchor clear of the target whenever the anchor registry reports it
  // moved (a spring, a scroll, the add-track menu opening → the spotlight
  // jumps from the button to the Synth card), the card itself changes size
  // (a longer instruction) or the window resizes. The card glides there.
  const reducedMotion = usePrefersReducedMotion();
  const targetRect = useRef<Rect | null>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const key = anchorKey(target, rack);
  useEffect(() => {
    const recompute = () => {
      const box = cardRef.current?.getBoundingClientRect();
      const next = computeCardPos(
        targetRect.current,
        box?.width || CARD_WIDTH,
        box?.height || 220,
        window.innerWidth,
        window.innerHeight,
        floatingSurfaces(),
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
    // Menus, popovers and dialogs mount in portals on <body>: the card moves
    // off one that opens (the Add MIDI submenu) on the next frame.
    let pending = 0;
    const mo =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            if (pending) return;
            pending = window.requestAnimationFrame(() => {
              pending = 0;
              recompute();
            });
          })
        : null;
    mo?.observe(document.body, { childList: true });
    // A new step re-anchors the card from where it is placed, not from
    // where the student last dragged it.
    dragX.set(0);
    dragY.set(0);
    return () => {
      unsubscribe();
      ro?.disconnect();
      mo?.disconnect();
      if (pending) window.cancelAnimationFrame(pending);
      window.removeEventListener('resize', recompute);
    };
    // `key` is the value-stable form of `target` + `rack`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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
        x: dragX,
        y: dragY,
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
      <div style={{ padding: '12px 14px' }}>
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
