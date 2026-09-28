import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { appHref } from '@/constants/hosts';
import { AuthRoutes } from '@/constants/routes';
import { LissajousMark } from '../motion/LissajousMark';
import { MagneticButton } from '../motion/MagneticButton';
import { LOGO } from '../motion/lissajous';
import { KEY_CENTERS } from '../music';
import { PRODUCTION_CURVE } from './heroWords';

const EASE = [0.2, 0.8, 0.2, 1] as const;

/** The hero rim's rainbow (the 12 key-center colors), left to right. */
const RAINBOW = `linear-gradient(to right, ${KEY_CENTERS.map((k) => k.color).join(', ')})`;

/** The hero horizon's light streaks: 1px lines 7px apart, fading off the rim. */
const STREAKS = {
  backgroundImage:
    'repeating-linear-gradient(to right, rgba(255,255,255,0.09) 0 1px, transparent 1px 7px)',
  maskImage: 'linear-gradient(to bottom, #000, transparent)',
  WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent)',
};

/** Fades a piece up the first time the section scrolls into view. */
const reveal = (reduce: boolean, delay = 0) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '0px 0px -10% 0px' },
        transition: { duration: 0.6, delay, ease: EASE },
      };

/**
 * Closing "Try for free" section, the hero turned upside down: the hero's
 * horizon straightened into a rainbow line along the section's top edge (its
 * bloom and light streaks falling from it), then the big "Music Atlas" title
 * and a line of subtext, the hero's mark, and an "Open" pill (as the hero's).
 * The mark fades up on "Production"'s circle, then morphs into the logo, once.
 */
export const TryFreeSection = () => {
  const reduce = !!useReducedMotion();
  /** 1 once the mark has faded up: its one move, from the circle to the logo. */
  const [cue, setCue] = useState(0);

  return (
    <section
      aria-labelledby="try-free-title"
      className="relative isolate overflow-hidden pb-24 pt-24 md:pb-28 md:pt-32"
    >
      {/* The straightened horizon: streaks, bloom (half clipped by the top
          edge, as the arc's is by the frame), then the crisp rim. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
      >
        <div className="absolute inset-0" style={STREAKS} />
        <div
          className="absolute inset-x-0 -top-6 h-12 opacity-55 blur-2xl"
          style={{ backgroundImage: RAINBOW }}
        />
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ backgroundImage: RAINBOW }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center px-5 text-center">
        <motion.h2
          id="try-free-title"
          {...reveal(reduce)}
          className="fs-display text-white"
        >
          Music Atlas
        </motion.h2>
        <motion.p
          {...reveal(reduce, 0.1)}
          className="mt-3 text-base text-white/55 md:text-lg"
        >
          Free to start — right in your browser, no download needed.
        </motion.p>
        <motion.span
          aria-hidden
          {...reveal(reduce, 0.2)}
          onAnimationComplete={() => setCue(1)}
          className="mt-6"
        >
          {/* Under reduced motion the mark is the static logo. */}
          <LissajousMark
            curve={cue ? LOGO : PRODUCTION_CURVE}
            cue={cue}
            className="size-14 md:size-20"
          />
        </motion.span>
        <motion.div {...reveal(reduce, 0.3)} className="mt-8 md:mt-10">
          <MagneticButton
            to={appHref(AuthRoutes.signIn())}
            tone="ghost"
            size="lg"
            strength={0}
            ariaLabel="Open Music Atlas"
          >
            Open
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
};
