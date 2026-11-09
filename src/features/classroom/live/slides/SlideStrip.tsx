import {
  BarChart3,
  DoorOpen,
  Rocket,
  Smile,
  Star,
  Type,
  Users,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import type { PhaseKey } from '../../phases';
import type { DaySnapshot } from '../../publish/publishDay';
import { interactionsForSlide } from '../../slides/deck';
import {
  SECTION_LABEL,
  sectionNumber,
  sectionOf,
  type SlideSection,
} from '../../slides/sections';
import type { Slide, SlideDeck } from '../../slides/types';

interface SlideStripProps {
  deck: SlideDeck;
  snapshot: DaySnapshot;
  currentIndex: number;
  /** Total responses per slide id (for the count badge). */
  responseCountFor: (slide: Slide) => number;
  onNavigate: (index: number, phase: PhaseKey) => void;
}

const iconFor = (slide: Slide, snapshot: DaySnapshot): LucideIcon => {
  switch (slide.kind) {
    case 'content':
      return Type;
    case 'media':
      return Youtube;
    case 'interaction': {
      const interactions = interactionsForSlide(snapshot, slide);
      if (
        interactions.length > 0 &&
        interactions.every((i) => i.type === 'check-in')
      ) {
        return Smile;
      }
      if (sectionOf(slide) === 'reflect') return DoorOpen;
      return BarChart3;
    }
    case 'app-route':
      return Rocket;
    case 'studio-collab':
      return Users;
    case 'showcase':
      return Star;
  }
};

/**
 * Teacher film-strip navigation: cheap iconographic thumbnails (never live
 * iframes/canvases) under their section's name, response-count badges, arrow
 * keys, click-to-jump. Every jump sends slide-granular nav — the phase is
 * derived from the target slide.
 */
export const SlideStrip = ({
  deck,
  snapshot,
  currentIndex,
  responseCountFor,
  onNavigate,
}: SlideStripProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === 'ArrowRight' && currentIndex < deck.slides.length - 1) {
        const next = currentIndex + 1;
        onNavigate(next, deck.slides[next].phase);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        const prev = currentIndex - 1;
        onNavigate(prev, deck.slides[prev].phase);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, deck.slides, onNavigate]);

  // Consecutive slides of one section sit under that section's name.
  const runs: {
    section: SlideSection;
    items: { slide: Slide; i: number }[];
  }[] = [];
  deck.slides.forEach((slide, i) => {
    const section = sectionOf(slide);
    const last = runs[runs.length - 1];
    if (last && last.section === section) last.items.push({ slide, i });
    else runs.push({ section, items: [{ slide, i }] });
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-2" role="tablist">
      {runs.map(({ section, items }) => (
        <div
          key={`${section}-${items[0].i}`}
          className="flex shrink-0 flex-col gap-1.5"
        >
          <MicroLabel className="whitespace-nowrap">
            {sectionNumber(section)} · {SECTION_LABEL[section].en}
          </MicroLabel>
          <div className="flex gap-2">
            {items.map(({ slide, i }) => {
              const Icon = iconFor(slide, snapshot);
              const active = i === currentIndex;
              const count = responseCountFor(slide);
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onNavigate(i, slide.phase)}
                  className={cn(
                    'relative flex w-28 shrink-0 flex-col gap-1.5 rounded-[0.75rem] border p-2.5 text-left transition-colors',
                    active
                      ? 'border-white/70 bg-white/[0.08]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]',
                  )}
                >
                  <span className="flex items-center justify-between">
                    <Icon
                      className={cn(
                        'size-4',
                        active ? 'text-daw-text' : 'text-daw-text-3',
                      )}
                    />
                    {count > 0 && (
                      <span className="rounded-full bg-white/10 px-1.5 text-[0.6875rem] tabular-nums text-daw-text-2">
                        {count}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-[0.75rem] leading-tight text-daw-text-2">
                    {slide.title.en}
                  </span>
                  {active && (
                    // "On screen", not "Live": this marks which SLIDE the class
                    // is looking at, and the header already uses Live/Practice
                    // for whether the SESSION is real.
                    <span className="absolute -bottom-2 right-2 inline-flex items-center rounded-full bg-white px-1.5 text-[0.6875rem] font-bold text-black">
                      On screen
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
