import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { rainbowSweep } from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';

/** Titles settle to white (the prompt's suggestion settles to dim white). */
const TITLE_SWEEP = rainbowSweep('rgb(255, 255, 255)');

/**
 * Words written in with the rainbow and settling to white: the prompt bar's
 * suggestion write-in (Home and the Studio), for a title. It writes in when
 * it mounts and again whenever the words change (an Arcade tab's title).
 * Reduced motion: a short fade, as the suggestion does.
 */
export function RainbowWriteIn({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <AnimatePresence mode="wait" initial>
      <motion.span
        key={text}
        data-write-in
        className={cn(
          'inline-block bg-clip-text text-transparent [-webkit-background-clip:text]',
          reduce && 'text-white',
          className,
        )}
        style={
          reduce
            ? undefined
            : { backgroundImage: TITLE_SWEEP, backgroundSize: '300% 100%' }
        }
        initial={reduce ? { opacity: 0 } : { backgroundPosition: '100% 0%' }}
        animate={reduce ? { opacity: 1 } : { backgroundPosition: '0% 0%' }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{ duration: reduce ? 0.2 : 1.1, ease: [0.45, 0, 0.25, 1] }}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}
