/**
 * Word cloud over a `VizWordCloudAggregate` — frequency-sized words, most
 * common in teal. Pure props-in: the aggregate carries bare {text,count} pairs
 * only (see buildVizAggregate.toWordCloud); no identity, no response hooks.
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { VizWordCloudAggregate } from './buildVizAggregate';

export interface WordCloudRevealProps {
  aggregate: VizWordCloudAggregate;
  size?: 'projector' | 'panel';
}

export const WordCloudReveal = ({
  aggregate,
  size = 'projector',
}: WordCloudRevealProps) => {
  const reduced = useReducedMotion();
  const words = aggregate.words;
  if (words.length === 0) {
    return (
      <p className="text-sm text-white/50">No words yet — answers coming in.</p>
    );
  }

  const maxCount = words[0]?.count ?? 1;
  const base = size === 'projector' ? 1.4 : 0.85; // rem
  const span = size === 'projector' ? 3.2 : 1.6;

  return (
    <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
      {words.map((w, i) => {
        const weight = maxCount <= 1 ? 1 : w.count / maxCount;
        const fontSize = `${base + span * weight}rem`;
        const top = i < 3;
        return (
          <motion.span
            key={w.text}
            initial={reduced ? false : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduced ? 0 : Math.min(i, 20) * 0.03 }}
            style={{ fontSize }}
            className={
              'font-semibold leading-none ' +
              (top ? 'text-[#7ecfcf]' : 'text-white/70')
            }
            title={`${w.count}`}
          >
            {w.text}
          </motion.span>
        );
      })}
    </div>
  );
};
