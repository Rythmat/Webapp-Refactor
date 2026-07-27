import type { ValueProp } from '../content/types';
import { MarketingSection } from './MarketingSection';
import { Reveal } from './Reveal';

/** Benefit grid — "outcomes, not features." */
export const ValueProps = ({
  heading,
  items,
  accent,
}: {
  heading?: string;
  items: ValueProp[];
  accent: string;
}) => {
  return (
    <MarketingSection>
      {heading && (
        <Reveal>
          <h2 className="mb-10 max-w-2xl text-3xl font-semibold text-white md:text-4xl">
            {heading}
          </h2>
        </Reveal>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.04}>
            <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              {item.icon && (
                <span
                  className="flex size-10 items-center justify-center rounded-xl [&_svg]:size-5"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  {item.icon}
                </span>
              )}
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-sm text-white/70">{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </MarketingSection>
  );
};
