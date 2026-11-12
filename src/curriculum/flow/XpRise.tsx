import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { subscribeXpGains } from '@/lib/experience/learnXp';

// A small "+2 XP" that rises and goes, whenever the server really has granted some.

const SHOWN_MS = 1400;

export function XpRise({ muted = false }: { muted?: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const [gain, setGain] = useState<{ id: number; amount: number } | null>(null);
  const nextId = useRef(0);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeXpGains((amount) => {
      // The pass on show is saying it, bigger.
      if (mutedRef.current) return;
      nextId.current += 1;
      setGain({ id: nextId.current, amount });
      clearTimeout(timer);
      timer = setTimeout(() => setGain(null), SHOWN_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
  return (
    <AnimatePresence>
      {gain && (
        <motion.span
          key={gain.id}
          role="status"
          data-xp-rise={gain.amount}
          className="pointer-events-none fixed right-20 top-4 z-50 whitespace-nowrap text-[0.9375rem] font-bold text-white"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          +{gain.amount} XP
        </motion.span>
      )}
    </AnimatePresence>
  );
}
