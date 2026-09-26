import { ArrowRight } from 'lucide-react';
import { KineticHeadline } from '@/features/landing/motion/KineticHeadline';
import { MagneticButton } from '@/features/landing/motion/MagneticButton';
import { KEY_CENTERS } from '@/features/landing/music';
import type { Cta } from '../content/types';

/** The rainbow brand motif ("every key"), as a short hairline rule. */
const RAINBOW = `linear-gradient(to right, ${KEY_CENTERS.map((k) => k.color).join(', ')})`;

/** Closing call-to-action band, restating the primary conversion. */
export const CtaBand = ({
  headline,
  subtext,
  primaryCta,
  secondaryCta,
}: {
  headline: string;
  subtext?: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
}) => {
  return (
    <section
      aria-labelledby="cta-title"
      className="flex flex-col items-center px-6 py-24 text-center md:px-10 md:py-32"
    >
      <span
        aria-hidden
        className="mb-10 h-px w-24"
        style={{ backgroundImage: RAINBOW }}
      />
      <KineticHeadline
        as="h2"
        id="cta-title"
        text={headline}
        whenInView
        className="max-w-[20ch] text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-white md:text-6xl"
      />
      {subtext && (
        <p className="mt-5 max-w-[44ch] text-lg text-white/55">{subtext}</p>
      )}
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <MagneticButton to={primaryCta.href} size="lg">
          {primaryCta.label}
          <ArrowRight />
        </MagneticButton>
        {secondaryCta && (
          <MagneticButton to={secondaryCta.href} tone="ghost" size="lg">
            {secondaryCta.label}
          </MagneticButton>
        )}
      </div>
    </section>
  );
};
