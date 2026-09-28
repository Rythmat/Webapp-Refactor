import { AnimatePresence, motion } from 'framer-motion';

export interface Point {
  x: number;
  y: number;
}

/**
 * The tour's animated cursor: springs to the current step's target and plays
 * a click ripple on arrival for steps that "click". Purely decorative.
 */
export const TourCursor = ({
  point,
  clickKey,
}: {
  point: Point | null;
  /** Changes whenever a click should play (e.g. the step id), or null. */
  clickKey: string | null;
}) => {
  if (!point) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-30"
      initial={false}
      animate={{ x: point.x, y: point.y }}
      transition={{ type: 'spring', stiffness: 90, damping: 18, mass: 0.9 }}
    >
      <AnimatePresence>
        {clickKey && (
          <motion.span
            key={clickKey}
            className="absolute -left-4 -top-4 size-8 rounded-full border-2 border-white/80"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 0.2, 1.6], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.3, times: [0, 0.55, 1] }}
          />
        )}
      </AnimatePresence>
      <motion.svg
        key={clickKey ?? 'idle'}
        width="22"
        height="22"
        viewBox="0 0 24 24"
        className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
        animate={clickKey ? { scale: [1, 1, 0.82, 1] } : { scale: 1 }}
        transition={{ duration: 1.1, times: [0, 0.6, 0.72, 0.9] }}
      >
        <path
          d="M4 2.5 L19 12 L12.2 13.4 L9 20.5 Z"
          fill="#fff"
          stroke="#101012"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
};

/**
 * Glass callout bubble anchored beside a point inside the stage; flips to the
 * left/top near the stage's right/bottom edges.
 */
export const TourCallout = ({
  point,
  stage,
  text,
  id,
}: {
  point: Point | null;
  stage: { w: number; h: number };
  text: string;
  id: string;
}) => {
  if (!point) return null;
  const flipX = point.x > stage.w * 0.6;
  const flipY = point.y > stage.h * 0.62;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        aria-hidden
        initial={{ opacity: 0, scale: 0.92, y: flipY ? 6 : -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        // The last step's callout leaves at once; the next one waits for
        // the cursor to arrive.
        exit={{
          opacity: 0,
          scale: 0.96,
          transition: { duration: 0.12, delay: 0 },
        }}
        transition={{ duration: 0.35, delay: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className="pointer-events-none absolute z-20 w-max max-w-[280px] rounded-xl border border-white/15 bg-[#18181b]/85 px-3.5 py-2.5 text-[13px] leading-snug text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        style={{
          left: point.x + (flipX ? -22 : 22),
          top: point.y + (flipY ? -18 : 22),
          translate: `${flipX ? '-100%' : '0'} ${flipY ? '-100%' : '0'}`,
          transformOrigin: `${flipX ? 'right' : 'left'} ${flipY ? 'bottom' : 'top'}`,
        }}
      >
        <span className="mr-2 inline-block size-1.5 rounded-full bg-white align-middle" />
        {text}
      </motion.div>
    </AnimatePresence>
  );
};
