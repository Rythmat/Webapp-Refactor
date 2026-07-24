/**
 * Likert / scale distribution over a `VizScaleAggregate` — one animated bar per
 * scale value with counts + percents, plus the mean. Pure props-in, identity-
 * free (built from anonymized number payloads via buildVizAggregate).
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { VizScaleAggregate } from './buildVizAggregate';

export interface ScaleRevealProps {
  aggregate: VizScaleAggregate;
  size?: 'projector' | 'panel';
}

export const ScaleReveal = ({
  aggregate,
  size = 'projector',
}: ScaleRevealProps) => {
  const reduced = useReducedMotion();
  const { points, total } = aggregate;
  const maxCount = points.reduce((m, p) => Math.max(m, p.count), 0);
  const mean =
    total > 0
      ? points.reduce((s, p) => s + p.value * p.count, 0) / total
      : null;
  const big = size === 'projector';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-center gap-3">
        {points.map((p, i) => {
          const h = maxCount === 0 ? 0 : (p.count / maxCount) * 100;
          const lead = p.count === maxCount && maxCount > 0;
          return (
            <div key={p.value} className="flex flex-col items-center gap-1.5">
              <span
                className={
                  'tabular-nums ' +
                  (big ? 'text-sm text-white/60' : 'text-xs text-white/50')
                }
              >
                {p.count}
              </span>
              <div
                className={
                  'flex items-end rounded-t-lg ' + (big ? 'w-14' : 'w-7')
                }
                style={{ height: big ? 180 : 90 }}
              >
                <motion.div
                  initial={reduced ? false : { height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: reduced ? 0 : i * 0.05 }}
                  className={
                    'w-full rounded-t-lg ' +
                    (lead ? 'bg-[#7ecfcf]' : 'bg-white/20')
                  }
                />
              </div>
              <span
                className={
                  'tabular-nums font-semibold ' +
                  (big ? 'text-xl text-white/80' : 'text-sm text-white/70')
                }
              >
                {p.value}
              </span>
            </div>
          );
        })}
      </div>
      {mean !== null && (
        <p
          className={
            'text-center text-white/50 ' + (big ? 'text-base' : 'text-xs')
          }
        >
          Average {mean.toFixed(1)} · {total} response{total === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
};
