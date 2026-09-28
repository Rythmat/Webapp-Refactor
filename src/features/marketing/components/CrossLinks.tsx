import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SpotlightCard } from '@/features/landing/motion/SpotlightCard';
import type { CrossLink } from '../content/types';
import { SectionHeading } from './SectionHeading';

/** Related module pages (interlinks the marketing pages) as a hairline bento. */
export const CrossLinks = ({
  heading = 'Explore more',
  links,
}: {
  heading?: string;
  links: CrossLink[];
}) => {
  return (
    <section aria-labelledby="explore-title">
      <SectionHeading id="explore-title" text={heading} />
      <div className="grid grid-cols-1 gap-px border-y border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href}
            to={l.href}
            className="group block bg-[#101012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
          >
            <SpotlightCard className="spotlight-flat flex h-full flex-col p-7 lg:min-h-48">
              <span className="flex items-start justify-between gap-4">
                <span className="transition-transform duration-300 group-hover:-translate-y-0.5">
                  {l.icon}
                </span>
                <ArrowUpRight className="size-5 shrink-0 text-white/40 transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </span>
              <span className="mt-auto pt-10 text-lg font-semibold text-white">
                {l.label}
              </span>
              <span className="mt-1 text-[15px] leading-snug text-white/50">
                {l.description}
              </span>
            </SpotlightCard>
          </Link>
        ))}
      </div>
    </section>
  );
};
