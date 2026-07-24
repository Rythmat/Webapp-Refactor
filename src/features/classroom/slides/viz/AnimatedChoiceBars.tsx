/**
 * Projector-grade horizontal bar chart over a `VizChoiceAggregate` — the
 * "reveal" moment for choice questions. Spring-animated bar widths (mount and
 * every count change re-spring), leading option in teal, stable option order.
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
}

const TEAL = '#7ecfcf';

const BAR_SPRING = { type: 'spring', stiffness: 120, damping: 20 } as const;

export const AnimatedChoiceBars = ({
  aggregate,
  size = 'projector',
}: AnimatedChoiceBarsProps) => {
  const reduce = useReducedMotion();
  const projector = size === 'projector';
  const maxCount = aggregate.options.reduce((m, o) => Math.max(m, o.count), 0);

  return (
    <div
      className={`flex w-full flex-col ${projector ? 'gap-5' : 'gap-3'}`}
      role="img"
      aria-label={`${aggregate.total} responses`}
    >
      {aggregate.options.map((option, index) => {
        const leading = maxCount > 0 && option.count === maxCount;
        // Keep a sliver of bar visible for any non-zero count.
        const widthPercent =
          option.count > 0 ? Math.max(option.percent, 3) : 0;
        return (
          <div key={index} className="flex flex-col gap-1.5">
            <div
              className={`flex items-baseline justify-between gap-4 ${
                projector ? 'text-2xl md:text-3xl' : 'text-sm'
              }`}
            >
              <span
                className={
                  leading ? 'font-medium text-white' : 'text-white/80'
                }
              >
                {option.label}
              </span>
              <span
                className={`flex-shrink-0 tabular-nums ${
                  projector ? 'text-xl md:text-2xl' : 'text-xs'
                } ${leading ? 'text-[#7ecfcf]' : 'text-white/60'}`}
              >
                {option.count} · {option.percent}%
              </span>
            </div>
            <div
              className={`w-full overflow-hidden rounded-full bg-white/[0.06] ${
                projector ? 'h-6' : 'h-3'
              }`}
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
