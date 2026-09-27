import { cn } from '@/components/utilities';
import { SpotlightCard } from '../motion/SpotlightCard';
import { TOUR_BY_ID } from '../tour/tourSteps';
import { SeeMoreLink } from './ModuleBlock';
import { LANDING_MODULES } from './modules';

/**
 * Five bento boxes under the hero horizon (Attio-style bordered row): Learn,
 * Studio, Globe, Arcade, Teach. Each cell names its module over a "See more"
 * link to the module's page, flush with the label.
 * Neutral white UI — color on this page is reserved for the music color
 * system (key centers / chords) and the rainbow brand motif.
 */
export const ModuleBentoRow = () => {
  return (
    <nav
      aria-label="Modules overview"
      className="relative z-10 grid grid-cols-1 gap-px border-y border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-5"
    >
      {LANDING_MODULES.map((m, i) => (
        <div
          key={m.id}
          className={cn(
            'group bg-[#101012]',
            // Odd count: the last cell spans the 2-col tablet row.
            i === LANDING_MODULES.length - 1 && 'sm:max-lg:col-span-2',
          )}
        >
          <SpotlightCard className="spotlight-flat flex h-full flex-col p-7 lg:min-h-56">
            <span className="transition-transform duration-300 group-hover:-translate-y-0.5">
              {m.icon}
            </span>
            <span className="mt-auto pt-8 text-lg font-semibold text-white lg:pt-16">
              {m.label}
            </span>
            <SeeMoreLink to={TOUR_BY_ID[m.id].href} className="mt-4" />
          </SpotlightCard>
        </div>
      ))}
    </nav>
  );
};
