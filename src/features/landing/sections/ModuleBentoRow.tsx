import { cn } from '@/components/utilities';
import { SpotlightCard } from '../motion/SpotlightCard';
import { LANDING_MODULES } from './modules';

/**
 * Five bento boxes under the hero horizon (Attio-style bordered row): Learn,
 * Studio, Globe, Arcade, Teach. Each cell jumps to its module's section; the
 * hover glow is tinted with the module's app accent.
 */
export const ModuleBentoRow = () => {
  return (
    <nav
      aria-label="Modules overview"
      className="relative z-10 grid grid-cols-1 gap-px border-y border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-5"
    >
      {LANDING_MODULES.map((m, i) => (
        <a
          key={m.id}
          href={`#${m.id}`}
          className={cn(
            'group block bg-[#101012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60',
            // Odd count: the last cell spans the 2-col tablet row.
            i === LANDING_MODULES.length - 1 && 'sm:max-lg:col-span-2',
          )}
        >
          <SpotlightCard
            accent={m.accent}
            className="spotlight-flat flex h-full flex-col p-7 lg:min-h-56"
          >
            <span className="transition-transform duration-300 group-hover:-translate-y-0.5">
              {m.icon}
            </span>
            <span className="mt-auto pt-8 text-lg font-semibold text-white lg:pt-16">
              {m.bento.title}
            </span>
            <span className="mt-1 text-[15px] leading-snug text-white/50">
              {m.bento.body}
            </span>
            <span
              className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] opacity-70 transition-opacity group-hover:opacity-100"
              style={{ color: m.accent }}
            >
              {m.label}
            </span>
          </SpotlightCard>
        </a>
      ))}
    </nav>
  );
};
