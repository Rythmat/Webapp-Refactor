import type { HowItWorksStep } from '../content/types';
import { MarketingSection } from './MarketingSection';
import { Reveal } from './Reveal';

/** 3-step "how it works" spine (the narrative backbone of each product page). */
export const HowItWorks = ({
  heading = 'How it works',
  steps,
  accent,
}: {
  heading?: string;
  steps: HowItWorksStep[];
  accent: string;
}) => {
  return (
    <MarketingSection className="border-y border-white/[0.06] bg-white/[0.015]">
      <Reveal>
        <h2 className="mb-10 text-3xl font-semibold text-white md:text-4xl">
          {heading}
        </h2>
      </Reveal>
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.06}>
            <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <span
                className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-black"
                style={{ background: accent }}
              >
                {i + 1}
              </span>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="text-sm text-white/70">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </MarketingSection>
  );
};
