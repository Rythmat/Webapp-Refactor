/**
 * Anonymized text-answer card wall over a `VizTextAggregate` — the "reveal"
 * moment for text questions. Staggered dark-glass cards with a bilingual
 * "+N more" chip.
 *
 * THE CAP IS SIZED TO ITS BOX, not fixed.
 *
 * It used to be a flat 40. At projector scale a one-line card is ~70px tall in
 * a 3-column grid, so 40 cards is ~14 rows ≈ 1150px — rendered into a reveal
 * band of ~316px design px, inside a `SlideFrame` that is `overflow-hidden`
 * with no scroll. Two thirds of the class's answers were being silently
 * dropped off the bottom, with the "+N more" chip itself clipped away too, so
 * nothing on screen said so. Deriving the cap from the available height means
 * overflow surfaces through the chip instead of vanishing.
 *
 * Pure props-in: the aggregate carries bare answer strings only (see
 * buildVizAggregate.ts); this component never touches response hooks.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { StudentLanguage } from '../../types';
import type { VizTextAggregate } from './buildVizAggregate';

export interface ResponseCardWallProps {
  aggregate: VizTextAggregate;
  /** 'projector' = big-screen scale (default); 'panel' = compact teacher dashboard. */
  size?: 'projector' | 'panel';
  language?: StudentLanguage;
  /**
   * Height of the box this wall is rendered into, in design px. Given by the
   * reveal band; omit on auto-height/scrolling surfaces.
   */
  availableHeight?: number;
}

/** Hard ceiling regardless of box size — past this a wall stops being readable. */
const MAX_CARDS = 40;

/** Approximate rendered card height, in design px, per size. */
const CARD_H = { projector: 70, panel: 34 } as const;
/** Grid columns the wall uses at each size (its widest breakpoint). */
const CARD_COLS = { projector: 3, panel: 2 } as const;
/** Room the "+N more" chip needs below the grid. */
const MORE_CHIP_H = { projector: 52, panel: 32 } as const;

/**
 * How many cards actually fit in `availableHeight` design px.
 *
 * Undefined height (the teacher dashboard's auto-height column) keeps the old
 * behaviour — that surface scrolls, so nothing is lost there.
 */
export const cardCapForHeight = (
  size: 'projector' | 'panel',
  availableHeight?: number,
): number => {
  if (availableHeight === undefined) return MAX_CARDS;
  const usable = Math.max(0, availableHeight - MORE_CHIP_H[size]);
  const rows = Math.floor(usable / CARD_H[size]);
  // Always show at least one row, or a small class sees nothing at all.
  return Math.max(CARD_COLS[size], Math.min(MAX_CARDS, rows * CARD_COLS[size]));
};
const STAGGER_SEC = 0.06;
/** Cards past this index enter together — a 40-card wall shouldn't take 2.4s. */
const MAX_STAGGER_STEPS = 20;

const CARD_SPRING = { type: 'spring', stiffness: 260, damping: 24 } as const;

const moreLabel = (count: number, language: StudentLanguage): string => {
  if (language === 'es') return `+${count} más`;
  if (language === 'both') return `+${count} more · +${count} más`;
  return `+${count} more`;
};

export const ResponseCardWall = ({
  aggregate,
  size = 'projector',
  language = 'en',
  availableHeight,
}: ResponseCardWallProps) => {
  const reduce = useReducedMotion();
  const projector = size === 'projector';
  const cap = cardCapForHeight(size, availableHeight);
  const visible = aggregate.answers.slice(0, cap);
  const overflow = aggregate.answers.length - visible.length;

  return (
    <div className="w-full">
      <div
        className={`grid grid-cols-1 ${
          projector
            ? 'gap-4 sm:grid-cols-2 lg:grid-cols-3'
            : 'gap-2 sm:grid-cols-2'
        }`}
      >
        <AnimatePresence>
          {visible.map((answer, index) => (
            <motion.div
              key={`${index}-${answer}`}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      ...CARD_SPRING,
                      delay: Math.min(index, MAX_STAGGER_STEPS) * STAGGER_SEC,
                    }
              }
              className={`break-words rounded-2xl border border-white/10 bg-white/[0.03] text-white/90 ${
                projector
                  ? 'px-5 py-4 text-xl md:text-2xl'
                  : 'px-3 py-2.5 text-sm'
              }`}
            >
              {answer}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {overflow > 0 && (
        <div
          className={
            projector ? 'mt-5 flex justify-center' : 'mt-3 flex justify-center'
          }
        >
          <span
            className={`inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] tabular-nums text-white/70 ${
              projector ? 'px-4 py-1.5 text-lg' : 'px-3 py-1 text-xs'
            }`}
          >
            {moreLabel(overflow, language)}
          </span>
        </div>
      )}
    </div>
  );
};
