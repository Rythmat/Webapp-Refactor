/**
 * Anonymized text-answer card wall over a `VizTextAggregate` — the "reveal"
 * moment for text questions. Staggered dark-glass cards, capped at 40 with a
 * bilingual "+N more" chip.
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
}

const MAX_CARDS = 40;
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
}: ResponseCardWallProps) => {
  const reduce = useReducedMotion();
  const projector = size === 'projector';
  const visible = aggregate.answers.slice(0, MAX_CARDS);
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
