/**
 * Projector-grade horizontal bar chart over a `VizChoiceAggregate` — the
 * "reveal" moment for choice questions. Spring-animated bar widths (mount and
 * every count change re-spring), leading option in teal, stable option order.
 *
 * IT COMPRESSES TO FIT; IT NEVER TRUNCATES.
 *
 * A six-option poll at projector scale is ~480px of rows rendered into a
 * ~316px reveal band — a browser check showed "Piano/Keys" clipped mid-row and
 * "Voice"/"Synth" gone entirely. Unlike a card wall, where a "+N more" chip is
 * an honest summary, dropping a poll option MISREPRESENTS THE RESULT: the class
 * would see a vote with options missing and no indication any existed. So when
 * a height is given, the rows shrink to fit instead.
 *
 * Pure props-in: the aggregate is already identity-free by construction (see
 * buildVizAggregate.ts); this component never touches response hooks.
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { VizChoiceAggregate } from './buildVizAggregate';

export interface AnimatedChoiceBarsProps {
  aggregate: VizChoiceAggregate;
  /** 'projector' = big-screen scale (default); 'panel' = compact teacher dashboard. */
  size?: 'projector' | 'panel';
  /**
   * Height of the box this chart renders into, in design px. When given, rows
   * compress so every option stays visible. Omit on auto-height surfaces.
   */
  availableHeight?: number;
}

const TEAL = '#7ecfcf';

const BAR_SPRING = { type: 'spring', stiffness: 120, damping: 20 } as const;

/** Comfortable row metrics per size, in design px. */
const ROW = {
  // `label` is the LINE BOX, not the font size — a text-3xl label occupies
  // ~36px of height, and modelling it as 30 is what left the last option
  // clipped in a browser check.
  projector: { label: 36, bar: 24, gapInner: 6, gapOuter: 20 },
  panel: { label: 18, bar: 12, gapInner: 4, gapOuter: 12 },
} as const;

/** Never shrink past legibility from the back of a classroom. */
const MIN_LABEL_PX = { projector: 15, panel: 11 } as const;

/**
 * How much to scale row metrics so `count` options fit `availableHeight`.
 * Returns 1 when they already fit, or when no height is known.
 */
export const barRowScale = (
  size: 'projector' | 'panel',
  count: number,
  availableHeight?: number,
): number => {
  if (!availableHeight || count <= 0) return 1;
  const m = ROW[size];
  const natural =
    count * (m.label + m.gapInner + m.bar) +
    Math.max(0, count - 1) * m.gapOuter;
  if (natural <= availableHeight) return 1;
  const floor = MIN_LABEL_PX[size] / m.label;
  return Math.max(floor, availableHeight / natural);
};

export const AnimatedChoiceBars = ({
  aggregate,
  size = 'projector',
  availableHeight,
}: AnimatedChoiceBarsProps) => {
  const reduce = useReducedMotion();
  const projector = size === 'projector';
  const maxCount = aggregate.options.reduce((m, o) => Math.max(m, o.count), 0);

  const rowScale = barRowScale(size, aggregate.options.length, availableHeight);
  const m = ROW[size];
  const compressed = rowScale < 1;

  return (
    <div
      className={`flex w-full flex-col ${compressed ? '' : projector ? 'gap-5' : 'gap-3'}`}
      style={compressed ? { gap: m.gapOuter * rowScale } : undefined}
      role="img"
      aria-label={`${aggregate.total} responses`}
    >
      {aggregate.options.map((option, index) => {
        const leading = maxCount > 0 && option.count === maxCount;
        // Keep a sliver of bar visible for any non-zero count.
        const widthPercent = option.count > 0 ? Math.max(option.percent, 3) : 0;
        return (
          <div
            key={index}
            className={compressed ? 'flex flex-col' : 'flex flex-col gap-1.5'}
            style={compressed ? { gap: m.gapInner * rowScale } : undefined}
          >
            <div
              className={`flex items-baseline justify-between gap-4 ${
                compressed ? '' : projector ? 'text-2xl md:text-3xl' : 'text-sm'
              }`}
              style={
                compressed
                  ? // `lineHeight: 1` makes the line box equal the font size,
                    // which is what ROW.label models. Left at the default the
                    // label occupies ~1.5x and the last option falls out of
                    // the band.
                    { fontSize: m.label * rowScale, lineHeight: 1 }
                  : undefined
              }
            >
              <span
                className={leading ? 'font-medium text-white' : 'text-white/80'}
              >
                {option.label}
              </span>
              <span
                className={`flex-shrink-0 tabular-nums ${
                  compressed
                    ? ''
                    : projector
                      ? 'text-xl md:text-2xl'
                      : 'text-xs'
                } ${leading ? 'text-[#7ecfcf]' : 'text-white/60'}`}
                style={
                  compressed
                    ? { fontSize: m.label * rowScale * 0.8, lineHeight: 1 }
                    : undefined
                }
              >
                {option.count} · {option.percent}%
              </span>
            </div>
            <div
              className={`w-full overflow-hidden rounded-full bg-white/[0.06] ${
                compressed ? '' : projector ? 'h-6' : 'h-3'
              }`}
              style={compressed ? { height: m.bar * rowScale } : undefined}
            >
              <motion.div
                className={`h-full rounded-full ${
                  leading ? '' : 'bg-white/25'
                }`}
                style={leading ? { backgroundColor: TEAL } : undefined}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={reduce ? { duration: 0 } : BAR_SPRING}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
