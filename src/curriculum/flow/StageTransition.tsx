import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { RunModel } from '@/curriculum/guitar/layout/types';
import { TRANSITION_MS, type StepFlow } from './useStepFlow';

// ── The change from one stage to the next ──────────────────────────────────
// A wash of the key's colour wipes across, and a line says what's different now.
// Moving and fading only. With reduced motion there's just the fade. A press skips.

function wordsFor(stage: 'demo' | 'practice' | 'perform', run: RunModel) {
  if (stage === 'perform') {
    return { title: 'Now perform it', detail: 'No help this time.' };
  }
  return {
    title: 'Your turn',
    detail:
      run.listen.mode === 'keepTime'
        ? 'Play along with the guide.'
        : 'The notes wait for you.',
  };
}

export function StageTransition({
  flow,
  accent,
}: {
  flow: StepFlow;
  accent: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const seconds = TRANSITION_MS / 1000;
  return (
    <AnimatePresence>
      {flow.transition && (
        <motion.button
          key={flow.transition}
          type="button"
          aria-label="Skip"
          data-stage-transition={flow.transition}
          onClick={flow.skip}
          className="absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden bg-[#101012]/85 outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {!reduced && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 opacity-70"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              }}
              initial={{ x: '0%' }}
              animate={{ x: '400%' }}
              transition={{ duration: seconds * 0.8, ease: 'easeInOut' }}
            />
          )}
          <motion.span
            role="status"
            className="relative text-[2rem] font-bold leading-tight text-white"
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : 0.12, duration: 0.3 }}
          >
            {wordsFor(flow.transition, flow.run).title}
          </motion.span>
          <motion.span
            className="relative text-[1.0625rem] text-white/80"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : 0.22, duration: 0.3 }}
          >
            {wordsFor(flow.transition, flow.run).detail}
          </motion.span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
