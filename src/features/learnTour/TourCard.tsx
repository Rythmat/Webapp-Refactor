import { motion } from 'framer-motion';
import { ArrowRight, Compass, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  openOverlayRects,
  placeCard,
} from '@/daw/components/Tutorial/cardPlacement';
import { usePrefersReducedMotion } from '@/daw/components/Tutorial/usePrefersReducedMotion';
import { TourRichText } from './TourRichText';
import type { Rect } from './targets';
import {
  primaryButton,
  secondaryButton,
  TOUR_ACCENT,
  TOUR_FONT,
  TOUR_HAIRLINE,
  TOUR_SURFACE,
  TOUR_TEXT,
  TOUR_TEXT_DIM,
} from './tourStyle';

// ── The tour's card ────────────────────────────────────────────────────────
// Studio Basics' coach card (daw/components/Tutorial/CoachCard.tsx) in
// Learn's colors: the tour's name and where it is, a progress line, the part
// of Learn it's on, its words, and always Quit Tutorial and Next, so a player
// is never stuck in it (Peter, 2026-10-21). It keeps clear of the target and
// of any sheet, menu or dialog open on the page, and can be dragged aside.

const CARD_WIDTH = 360;
const MARGIN = 16;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export type CardSpot = 'center' | 'bottom';

/** Below or above the target, centered on it; to its side if it's tall. */
function preferredSpot(
  target: Rect | null,
  card: { w: number; h: number },
  view: { w: number; h: number },
  spot: CardSpot,
): { top: number; left: number } {
  const centeredLeft = (view.w - card.w) / 2;
  if (!target) {
    return spot === 'bottom'
      ? { top: view.h - card.h - 28, left: centeredLeft }
      : { top: (view.h - card.h) / 2, left: centeredLeft };
  }
  const left = clamp(
    target.left + target.width / 2 - card.w / 2,
    MARGIN,
    view.w - card.w - MARGIN,
  );
  const below = view.h - (target.top + target.height);
  const need = card.h + MARGIN * 2;
  if (below >= need || target.top >= need) {
    const top =
      below >= target.top
        ? target.top + target.height + MARGIN
        : target.top - card.h - MARGIN;
    return { top, left };
  }
  const toRight = view.w - (target.left + target.width) >= target.left;
  return {
    top: target.top + target.height / 2 - card.h / 2,
    left: toRight
      ? target.left + target.width + MARGIN
      : target.left - card.w - MARGIN,
  };
}

export interface TourCardProps {
  title: string;
  chapter: string;
  text: string;
  /** Step n of total, from 0; omitted on a prompt. */
  index?: number;
  total?: number;
  target: Rect | null;
  spot?: CardSpot;
  /** The buttons, Quit Tutorial and Next unless a prompt brings its own. */
  actions: ReactNode;
  /** The X in the corner. */
  onClose?: () => void;
  closeLabel?: string;
}

export function TourCard({
  title,
  chapter,
  text,
  index,
  total,
  target,
  spot = 'center',
  actions,
  onClose,
  closeLabel = 'Quit tutorial',
}: TourCardProps) {
  const reducedMotion = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(target);
  targetRef.current = target;
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Placed clear of the target, and again whenever it moves, the card
  // changes size, the window resizes or a sheet, menu or dialog comes or goes.
  useLayoutEffect(() => {
    const place = () => {
      const box = cardRef.current?.getBoundingClientRect();
      const card = { w: box?.width || CARD_WIDTH, h: box?.height || 200 };
      const view = { w: window.innerWidth, h: window.innerHeight };
      const t = targetRef.current;
      const next = placeCard(
        preferredSpot(t, card, view, spot),
        card,
        view,
        t,
        openOverlayRects(document, view),
      );
      setPos((was) =>
        was &&
        Math.abs(was.top - next.top) < 4 &&
        Math.abs(was.left - next.left) < 4
          ? was
          : next,
      );
    };
    place();
    const ro =
      typeof ResizeObserver !== 'undefined' && cardRef.current
        ? new ResizeObserver(place)
        : null;
    if (cardRef.current) ro?.observe(cardRef.current);
    let frame = 0;
    const soon = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const mo =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(soon)
        : null;
    mo?.observe(document.body, { childList: true });
    window.addEventListener('resize', place);
    return () => {
      ro?.disconnect();
      mo?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
    };
  }, [
    spot,
    target?.top,
    target?.left,
    target?.width,
    target?.height,
    target === null,
  ]);

  const counted = index !== undefined && total !== undefined && total > 0;

  return (
    <motion.div
      ref={cardRef}
      role="dialog"
      aria-modal={false}
      aria-label={title}
      data-testid="learn-tour-card"
      drag
      dragMomentum={false}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: pos ? 1 : 0, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: CARD_WIDTH,
        maxWidth: 'calc(100vw - 24px)',
        pointerEvents: 'auto',
        background: TOUR_SURFACE,
        border: `1px solid ${TOUR_HAIRLINE}`,
        borderRadius: 14,
        boxShadow: '0 14px 44px rgba(0,0,0,0.55)',
        overflow: 'hidden',
        color: TOUR_TEXT,
        fontFamily: TOUR_FONT,
        cursor: 'grab',
        transition: reducedMotion ? 'none' : 'top 0.3s ease, left 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderBottom: `1px solid ${TOUR_HAIRLINE}`,
        }}
      >
        <Compass size={16} style={{ color: TOUR_ACCENT }} aria-hidden />
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1 }} />
        {counted && (
          <span
            style={{ fontSize: 12, color: TOUR_TEXT_DIM }}
            data-testid="learn-tour-count"
          >
            {index + 1} / {total}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 26,
              height: 26,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: TOUR_TEXT_DIM,
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {counted && (
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div
            style={{
              height: '100%',
              width: `${((index + 1) / total) * 100}%`,
              background: TOUR_ACCENT,
              transition: reducedMotion ? 'none' : 'width 240ms ease',
            }}
          />
        </div>
      )}

      <div style={{ padding: '12px 14px 4px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: TOUR_ACCENT,
            marginBottom: 7,
          }}
        >
          {chapter}
        </div>
        <p
          aria-live="polite"
          data-testid="learn-tour-text"
          style={{ fontSize: 15, lineHeight: 1.5, margin: 0 }}
        >
          <TourRichText text={text} />
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 14px 14px',
          cursor: 'default',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {actions}
      </div>
    </motion.div>
  );
}

/** Quit Tutorial and Next: on every step of a tour. */
export function TourStepActions({
  onQuit,
  onNext,
  nextLabel = 'Next',
  busy = false,
  extra,
}: {
  onQuit: () => void;
  onNext?: () => void;
  nextLabel?: string;
  busy?: boolean;
  extra?: ReactNode;
}) {
  return (
    <>
      <button type="button" onClick={onQuit} style={secondaryButton}>
        Quit Tutorial
      </button>
      <div style={{ flex: 1 }} />
      {extra}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={busy}
          data-testid="learn-tour-next"
          style={{ ...primaryButton, opacity: busy ? 0.6 : 1 }}
        >
          {nextLabel} <ArrowRight size={15} aria-hidden />
        </button>
      )}
    </>
  );
}
