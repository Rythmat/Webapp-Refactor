import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CrossLink } from '../content/types';
import { MarketingSection } from './MarketingSection';
import { Reveal } from './Reveal';

/** Row of related-page links (interlinks the marketing pages). */
export const CrossLinks = ({
  heading = 'Explore more',
  links,
}: {
  heading?: string;
  links: CrossLink[];
}) => {
  return (
    <MarketingSection className="border-t border-white/[0.06]">
      <Reveal>
        <h2 className="mb-8 text-2xl font-semibold text-white md:text-3xl">
          {heading}
        </h2>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l, i) => (
          <Reveal key={l.href} delay={i * 0.04}>
            <Link
              to={l.href}
              className="group flex h-full items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/25"
            >
              <span>
                <span className="block font-semibold text-white">
                  {l.label}
                </span>
                <span className="mt-1 block text-sm text-white/60">
                  {l.description}
                </span>
              </span>
              <ArrowUpRight className="size-5 shrink-0 text-white/50 transition-colors group-hover:text-white" />
            </Link>
          </Reveal>
        ))}
      </div>
    </MarketingSection>
  );
};
