import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import { KEY_CENTERS } from '../music';
import type { TourTabId } from '../tour/tourSteps';
import { GlobeModuleBlock } from './GlobeModuleBlock';
import { ModuleBlock } from './ModuleBlock';
import { LANDING_MODULES } from './modules';

/**
 * The rainbow brand motif: all 12 key-center colors in circle-of-fifths order
 * (looping back to C so the scroll is seamless). Used deliberately as "every
 * key" — never to stand for a single key or chord.
 */
const RAINBOW_VERTICAL = `linear-gradient(to bottom, ${[
  ...KEY_CENTERS.map((k) => k.color),
  KEY_CENTERS[0].color,
].join(', ')})`;

const scrollToModule = (id: string) => (e: React.MouseEvent) => {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const reduce = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
};

/**
 * Module sections with a sticky sidebar table of contents (Attio "Build
 * pipeline" layout). The TOC highlights whichever module block crosses the
 * upper third of the viewport; below `lg` it becomes a sticky pill bar. The
 * active item's rule is a rainbow that scrolls through the key-center colors
 * as the page scrolls through the sections.
 */
export const ModuleTocSections = () => {
  const [active, setActive] = useState<TourTabId>(LANDING_MODULES[0].id);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  const rainbowPosition = useTransform(
    scrollYProgress,
    [0, 1],
    ['50% 0%', '50% 100%'],
  );

  useEffect(() => {
    const blocks = LANDING_MODULES.map((m) =>
      document.getElementById(m.id),
    ).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setActive((e.target as HTMLElement).dataset.module as TourTabId);
      },
      { rootMargin: '-33% 0px -66% 0px' },
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="lg:grid lg:grid-cols-[300px_1fr]">
      {/* Sidebar TOC (desktop) / pill bar (mobile) */}
      <div className="sticky top-16 z-20 border-b border-white/[0.08] bg-[#101012]/85 backdrop-blur-xl lg:static lg:border-b-0 lg:border-r lg:bg-transparent lg:backdrop-blur-none">
        <nav
          aria-label="Modules"
          className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] lg:sticky lg:top-28 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:py-0"
        >
          {LANDING_MODULES.map((m) => {
            const isActive = m.id === active;
            return (
              <a
                key={m.id}
                href={`#${m.id}`}
                onClick={scrollToModule(m.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'relative shrink-0 rounded-full px-3 py-1.5 text-[15px] transition-colors duration-300 lg:rounded-none lg:px-14 lg:py-2 lg:text-lg',
                  isActive
                    ? 'bg-white/10 text-white lg:bg-transparent'
                    : 'text-white/35 hover:text-white/70',
                )}
              >
                {/* Active rule on the frame's left edge (desktop). */}
                <motion.span
                  aria-hidden
                  className={cn(
                    'absolute -left-px top-1/2 hidden h-8 w-0.5 -translate-y-1/2 rounded-full transition-opacity duration-300 lg:block',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                  style={{
                    backgroundImage: RAINBOW_VERTICAL,
                    backgroundSize: '100% 400%',
                    backgroundPosition: rainbowPosition,
                  }}
                />
                {m.label}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="min-w-0">
        {LANDING_MODULES.map((m) =>
          m.id === 'globe' ? (
            <GlobeModuleBlock key={m.id} module={m} />
          ) : (
            <ModuleBlock key={m.id} module={m} />
          ),
        )}
      </div>
    </div>
  );
};
