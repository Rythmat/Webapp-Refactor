import type { HowItWorksStep } from '../content/types';
import { SectionHeading } from './SectionHeading';

/**
 * 3-step "how it works" spine (the narrative backbone of each product page):
 * hairline cells, each numbered like the demos' step pills.
 */
export const HowItWorks = ({
  heading = 'How it works',
  steps,
}: {
  heading?: string;
  steps: HowItWorksStep[];
}) => {
  return (
    <section aria-labelledby="how-title">
      <SectionHeading id="how-title" text={heading} />
      <ol className="grid grid-cols-1 gap-px border-y border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="bg-[#101012] px-6 py-10 md:px-10">
            <span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold text-[#101012]">
              {i + 1}
            </span>
            <h3 className="mt-6 text-lg font-semibold text-white">
              {step.title}
            </h3>
            <p className="mt-1 max-w-[36ch] text-[15px] text-white/50">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
};
