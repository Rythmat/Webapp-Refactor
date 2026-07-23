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
import type { PhaseKey } from '../../phases';
import type { DaySnapshot } from '../../publish/publishDay';
import { interactionsForSlide } from '../../slides/deck';
import type { Slide, SlideDeck } from '../../slides/types';

interface SlideStripProps {
  deck: SlideDeck;
  snapshot: DaySnapshot;
  currentIndex: number;
  /** Total responses per slide id (for the count badge). */
  responseCountFor: (slide: Slide) => number;
  onNavigate: (index: number, phase: PhaseKey) => void;
}

const PHASE_ACCENT: Record<PhaseKey, string> = {
  connectRegulate: 'border-t-sky-400/70',
  groupPractice: 'border-t-[#7ecfcf]',
  creativeProjects: 'border-t-violet-400/70',
  presentPerform: 'border-t-amber-400/70',
  respondReflectReset: 'border-t-emerald-400/70',
};

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
      if (slide.phase === 'respondReflectReset') return DoorOpen;
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
 * iframes/canvases), phase-colored top border, response-count badges, arrow
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

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
      {deck.slides.map((slide, i) => {
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
            className={
              `relative flex w-28 shrink-0 flex-col gap-1.5 rounded-xl border border-t-2 p-2.5 text-left transition-all ${PHASE_ACCENT[slide.phase]} ` +
              (active
                ? 'border-x-[#7ecfcf]/60 border-b-[#7ecfcf]/60 bg-[#7ecfcf]/[0.08] ring-1 ring-[#7ecfcf]/50'
                : 'border-x-white/[0.06] border-b-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]')
            }
          >
            <span className="flex items-center justify-between">
              <Icon
                className={
                  'h-4 w-4 ' + (active ? 'text-[#7ecfcf]' : 'text-white/50')
                }
              />
              {count > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums text-white/70">
                  {count}
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-[11px] leading-tight text-white/75">
              {slide.title.en}
            </span>
            {active && (
              <span className="absolute -top-1.5 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-400 px-1.5 text-[9px] font-medium uppercase text-black">
                Live
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
