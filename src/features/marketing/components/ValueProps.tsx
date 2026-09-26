import { ArrowDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { SpotlightCard } from '@/features/landing/motion/SpotlightCard';
import type { ValueProp } from '../content/types';
import { SectionHeading } from './SectionHeading';

/**
 * Feature bento, set like the landing's module row: hairline cells with an
 * icon, title and body. A cell with `href` jumps to its live demo on the page.
 * Neutral white UI — color is reserved for the music color system.
 */
export const ValueProps = ({
  heading,
  items,
}: {
  heading?: string;
  items: ValueProp[];
}) => {
  const cell = (item: ValueProp): ReactNode => (
    <SpotlightCard className="spotlight-flat flex h-full flex-col p-7 lg:min-h-56">
      {item.icon && (
        <span className="text-white/80 transition-transform duration-300 group-hover:-translate-y-0.5 [&_svg]:size-8">
          {item.icon}
        </span>
      )}
      <span className="mt-auto pt-8 text-lg font-semibold text-white lg:pt-16">
        {item.title}
      </span>
      <span className="mt-1 text-[15px] leading-snug text-white/50">
        {item.body}
      </span>
      {item.href && (
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
          Try it
          <ArrowDown className="size-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
        </span>
      )}
    </SpotlightCard>
  );

  return (
    <section
      aria-labelledby={heading ? 'features-title' : undefined}
      aria-label={heading ? undefined : 'Features'}
    >
      {heading && <SectionHeading id="features-title" text={heading} />}
      <div className="grid grid-cols-1 gap-px border-y border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const cls = cn(
            'group block bg-[#101012]',
            // Odd count: the last cell spans the 2-col tablet row.
            items.length % 2 === 1 &&
              i === items.length - 1 &&
              'sm:max-lg:col-span-2',
          );
          return item.href ? (
            <a
              key={item.title}
              href={item.href}
              className={cn(
                cls,
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60',
              )}
            >
              {cell(item)}
            </a>
          ) : (
            <div key={item.title} className={cls}>
              {cell(item)}
            </div>
          );
        })}
      </div>
    </section>
  );
};
