/**
 * Count-only live participation display for check-in / exit slides on the
 * projector: a big "N / M" counter inside a ring of anonymous dots that pop
 * in as the count grows.
 *
 * Rule 2b by construction: props are NUMBERS ONLY. This component never
 * receives or renders response payloads — check-in values are hard-blocked
 * from the projector, and there is structurally nothing here to leak.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { LocalizedText, StudentLanguage } from '../../types';

export interface ParticipationPulseProps {
  responded: number;
  /** Roster size. Omitted → dots ring sizes itself to the responded count. */
  total?: number;
  label?: LocalizedText;
  language?: StudentLanguage;
}

const TEAL = '#7ecfcf';
/** Dot-slot cap — beyond this the ring fills proportionally. */
const MAX_DOTS = 48;

const DOT_SPRING = { type: 'spring', stiffness: 300, damping: 15 } as const;

export const ParticipationPulse = ({
  responded,
  total,
  label,
  language = 'en',
}: ParticipationPulseProps) => {
  const reduce = useReducedMotion();

  const slots = Math.max(
    1,
    Math.min(total ?? Math.max(responded, 12), MAX_DOTS),
  );
  const filled =
    typeof total === 'number' && total > 0
      ? Math.round((Math.min(responded, total) / total) * slots)
      : Math.min(responded, slots);

  const primaryLabel = label ? pickLocalized(label, language) : null;
  const secondaryLabel = label ? secondaryLine(label, language) : null;

  return (
    <div className="relative mx-auto h-72 w-72" aria-live="polite">
      {/* Ring of anonymous dots. */}
      {Array.from({ length: slots }, (_, i) => {
        const angle = (i / slots) * 360;
        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${angle}deg) translateY(-8.25rem)` }}
            aria-hidden="true"
          >
            {i < filled ? (
              <motion.span
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={reduce ? { duration: 0 } : DOT_SPRING}
                className="block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: TEAL }}
              />
            ) : (
              <span className="block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15" />
            )}
          </span>
        );
      })}

      {/* Center counter. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          key={responded}
          initial={reduce ? false : { scale: 0.85 }}
          animate={{ scale: 1 }}
          transition={reduce ? { duration: 0 } : DOT_SPRING}
          className="text-6xl font-semibold tabular-nums text-white"
        >
          {responded}
          {typeof total === 'number' && (
            <span className="text-white/40"> / {total}</span>
          )}
        </motion.div>
        {primaryLabel && (
          <div className="mt-2 text-lg text-white/70">{primaryLabel}</div>
        )}
        {secondaryLabel && (
          <div className="text-lg text-white/50">{secondaryLabel}</div>
        )}
      </div>
    </div>
  );
};
