import { ArrowRight } from 'lucide-react';
import type { Cta } from '../content/types';
import { MarketingButton } from './MarketingButton';
import { MarketingSection } from './MarketingSection';
import { Reveal } from './Reveal';

/** Closing call-to-action band, restating the primary conversion. */
export const CtaBand = ({
  headline,
  subtext,
  primaryCta,
  secondaryCta,
  accent,
}: {
  headline: string;
  subtext?: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
  accent: string;
}) => {
  return (
    <MarketingSection>
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-10 h-24 opacity-50 blur-2xl"
            style={{ background: accent }}
          />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-semibold text-white md:text-4xl">
            {headline}
          </h2>
          {subtext && (
            <p className="relative mx-auto mt-3 max-w-xl text-white/70">
              {subtext}
            </p>
          )}
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <MarketingButton href={primaryCta.href} className="px-8">
              {primaryCta.label}
              <ArrowRight className="size-4" />
            </MarketingButton>
            {secondaryCta && (
              <MarketingButton href={secondaryCta.href} tone="ghost">
                {secondaryCta.label}
              </MarketingButton>
            )}
          </div>
        </div>
      </Reveal>
    </MarketingSection>
  );
};
