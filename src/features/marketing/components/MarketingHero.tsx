import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { KineticHeadline } from '@/features/landing/motion/KineticHeadline';
import { MagneticButton } from '@/features/landing/motion/MagneticButton';
import { HeroArc } from '@/features/landing/sections/HeroArc';
import type { Cta } from '../content/types';

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Product-page hero in the landing's style: a small eyebrow over a huge
 * centered kinetic headline, the subtext and CTAs, sitting on the landing's
 * glowing planet horizon. The H1 is plain text (the LCP element); the horizon
 * is CSS/SVG only.
 */
export const MarketingHero = ({
  eyebrow,
  headline,
  subtext,
  primaryCta,
  secondaryCta,
}: {
  eyebrow?: string;
  headline: string;
  subtext: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
}) => {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: EASE },
  });

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden pt-32 md:pt-44"
    >
      <div className="relative z-10 flex flex-col items-center px-5 text-center">
        {eyebrow && (
          <motion.p {...rise(0)} className="text-base text-white/55 md:text-lg">
            {eyebrow}
          </motion.p>
        )}
        <KineticHeadline
          as="h1"
          id="hero-title"
          text={headline}
          delay={0.15}
          stagger={0.08}
          className="fs-display mt-3 text-balance font-bold text-white"
        />
        <motion.p
          {...rise(0.5)}
          className="mt-6 max-w-[46ch] text-lg text-white/55 md:text-xl"
        >
          {subtext}
        </motion.p>
        <motion.div
          {...rise(0.65)}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <MagneticButton to={primaryCta.href} size="lg">
            {primaryCta.label}
            <ArrowRight />
          </MagneticButton>
          {secondaryCta && (
            <MagneticButton to={secondaryCta.href} tone="ghost" size="lg">
              {secondaryCta.label}
            </MagneticButton>
          )}
        </motion.div>
      </div>

      <div className="mt-10 md:mt-16">
        <HeroArc />
      </div>
    </section>
  );
};
