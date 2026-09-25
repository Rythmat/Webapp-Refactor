import { motion, useReducedMotion } from 'framer-motion';
import { KineticHeadline } from '../motion/KineticHeadline';
import { HeroArc } from './HeroArc';

/**
 * Hero (Attio "Universal Context" layout): a small subheading over a huge
 * centered title, sitting on a glowing planet horizon. The H1 is plain text
 * (the LCP element); the horizon is CSS/SVG only.
 */
export const HeroSection = () => {
  const reduce = useReducedMotion();

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden pt-32 md:pt-44"
    >
      <div className="relative z-10 flex flex-col items-center px-5 text-center">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-base text-white/55 md:text-lg"
        >
          Modern Music Technology
        </motion.p>
        <KineticHeadline
          as="h1"
          id="hero-title"
          text="Education x Creation"
          delay={0.15}
          stagger={0.1}
          className="fs-display mt-3 font-bold text-white"
        />
      </div>

      <div className="mt-10 md:mt-16">
        <HeroArc />
      </div>
    </section>
  );
};
