import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';
import { appHref } from '@/constants/hosts';
import { AuthRoutes } from '@/constants/routes';
import { LissajousMark } from '../motion/LissajousMark';
import { MagneticButton } from '../motion/MagneticButton';
import { END_S, MORPH_S } from '../motion/lissajous';
import { useInView } from '../motion/useInView';
import { useStepper } from '../motion/useStepper';
import { HeroArc } from './HeroArc';
import { HERO_WORDS } from './heroWords';

const EASE = [0.2, 0.8, 0.2, 1] as const;

const word = (step: number) => HERO_WORDS[step % HERO_WORDS.length];

/** How long the old word takes to fade out, then the new one to fade up. */
const WORD_OUT_S = 0.2;
const WORD_IN_S = 0.5;
/** The first word waits this long on load before it fades up. */
const FIRST_DELAY_S = 0.15;

/** How long the mark rests on each word's curve before the next move. */
const REST_MS = 1500;
/**
 * The first word has no move before it: it fades up with the page instead, and
 * skips the mark's fade after landing. Its first rest waits those out too, so
 * "Music Atlas" (and the logo) is on screen exactly as long as every other
 * word.
 */
const FIRST_REST_MS =
  REST_MS + 1000 * (FIRST_DELAY_S + WORD_IN_S + (END_S - MORPH_S));

/** The title's word: each new word fades up as the old one fades away. */
const TitleWord = ({ text, delay }: { text: string; delay: number }) => {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={text}
        aria-hidden
        className="inline-block"
        initial={reduce ? false : { opacity: 0, y: '0.3em' }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: WORD_IN_S, delay, ease: EASE },
        }}
        exit={{
          opacity: 0,
          y: '-0.15em',
          transition: { duration: WORD_OUT_S },
        }}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
};

/**
 * Hero (Attio "Universal Context" layout): the logo mark and a small
 * subheading over a huge centered title, sitting on a glowing planet horizon
 * with an "Open" pill (sign-in on the app host) in its dark body.
 *
 * The title is one word at a time, in step with the mark (SVG + one rAF
 * loop): each word has its own Lissajous curve (see heroWords), and for each
 * new word the mark turns and morphs into that curve, and the word fades up as
 * the mark lands. "Music Atlas" alone shows the logo, and every word, including
 * it, stays on screen for the same time. The next word waits until the mark has
 * come to rest, so anything that stalls it (scrolling it away, a hidden tab, a
 * slow device) holds the title too, and the two never drift apart. Hovering
 * the resting mark skips to the next word. Under reduced motion both stay
 * static on "Music Atlas".
 *
 * Near-invisible sizers hold every word in the title's grid cell, so the box
 * keeps the tallest word's height and a change never shifts the layout. They
 * also paint at load as the largest text, so a later word never registers as a
 * new LCP. The horizon is CSS/SVG only.
 */
export const HeroSection = () => {
  const reduce = useReducedMotion();
  const markRef = useRef<HTMLSpanElement>(null);
  const markInView = useInView(markRef);
  const { step, advance, rest } = useStepper(
    (s) => (s === 0 ? FIRST_REST_MS : REST_MS),
    !reduce && markInView,
  );
  // The step whose word is on show: it changes as the mark lands.
  const [shown, setShown] = useState(0);
  const { text } = word(shown);

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden pt-24 md:pt-28"
    >
      <div className="relative z-10 flex flex-col items-center px-5 text-center">
        <motion.span
          ref={markRef}
          aria-hidden
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-6"
        >
          <LissajousMark
            cue={step}
            curve={word(step).curve}
            onHover={advance}
            // Start the word change early, so the new word settles exactly as
            // the curve lands and holds.
            landLead={WORD_OUT_S + WORD_IN_S}
            onLand={() => setShown(step)}
            onRest={rest}
            className="size-14 md:size-20"
          />
        </motion.span>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-base text-white/55 md:text-lg"
        >
          Modern Music Technology
        </motion.p>
        <div className="fs-display mt-3 grid w-full font-bold text-white">
          {/* Sizers at 0.001 opacity, not hidden: Chrome skips hidden text for LCP. */}
          {HERO_WORDS.map(({ text: w }) => (
            <span
              key={w}
              aria-hidden
              className="pointer-events-none col-start-1 row-start-1 select-none opacity-[0.001]"
            >
              {w}
            </span>
          ))}
          <h1 id="hero-title" className="col-start-1 row-start-1 self-center">
            <span className="sr-only">{text}</span>
            <TitleWord text={text} delay={shown === 0 ? FIRST_DELAY_S : 0} />
          </h1>
        </div>
      </div>

      <div className="mt-8 md:mt-12">
        <HeroArc>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
            className="flex h-full items-center justify-center px-5"
          >
            <MagneticButton
              to={appHref(AuthRoutes.signIn())}
              tone="ghost"
              size="lg"
              ariaLabel="Open Music Atlas"
            >
              Open
            </MagneticButton>
          </motion.div>
        </HeroArc>
      </div>
    </section>
  );
};
