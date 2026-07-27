import type { Stat } from '../content/types';
import { MarketingSection } from './MarketingSection';
import { Reveal } from './Reveal';

/** Row of real catalog stats (no fabricated metrics). */
export const StatStrip = ({ items }: { items: Stat[] }) => {
  return (
    <MarketingSection className="!py-10">
      <Reveal className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-center">
        {items.map((s) => (
          <div key={s.label}>
            <div className="text-3xl font-semibold text-white md:text-4xl">
              {s.value}
            </div>
            <div className="text-sm text-white/50">{s.label}</div>
          </div>
        ))}
      </Reveal>
    </MarketingSection>
  );
};
