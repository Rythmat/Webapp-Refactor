import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { StepPosition } from './presentControls';

const ARROW =
  'inline-flex size-6 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30';

/**
 * Present's step and page selector (owner, 2026-11-10): small, at the
 * window's bottom right on every slide, over the slide, so nothing on it
 * moves. Sized and placed to sit inside the Studio's own bottom bar on the
 * Group Practice slide (its tabs are centred 20px above the foot).
 *
 *   ‹ ›          what the arrow keys do: the slide's own step first, then
 *                the page
 *   Step 2 / 14  the slide's step, when it has steps (the globe's places,
 *                the tutorial's steps)
 *   4 / 9        the page; opens the pages, to jump to one
 */
export const PresentSelector = ({
  index,
  count,
  step,
  onPrev,
  onNext,
  onGoTo,
  canPrev,
  canNext,
}: {
  /** The page, 0-based, of `count`. */
  index: number;
  count: number;
  step: StepPosition | null;
  onPrev: () => void;
  onNext: () => void;
  onGoTo?: ((index: number) => void) | undefined;
  canPrev: boolean;
  canNext: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);

  // The page list shuts on Esc (and only that: Present's Esc would leave)
  // and on a click anywhere else.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onDown, true);
    };
  }, [open]);

  return (
    <nav
      ref={root}
      aria-label="Lesson position"
      className="absolute bottom-[6px] right-3 z-40 flex h-7 select-none items-center rounded-full border border-white/10 bg-[#141418]/90 px-0.5 text-[0.75rem] text-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Back"
        className={ARROW}
      >
        <ChevronLeft aria-hidden className="size-3.5" />
      </button>
      {step && (
        <>
          <span className="px-1.5 tabular-nums text-white/45">
            Step {step.at + 1} / {step.total}
          </span>
          <span aria-hidden className="h-3 w-px bg-white/15" />
        </>
      )}
      <button
        type="button"
        onClick={() => onGoTo && setOpen((v) => !v)}
        aria-expanded={onGoTo ? open : undefined}
        aria-label={`Page ${index + 1} of ${count}${onGoTo ? ', choose a page' : ''}`}
        className="h-6 rounded-full px-1.5 tabular-nums transition-colors hover:bg-white/10 hover:text-white"
      >
        {index + 1} / {count}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next"
        className={ARROW}
      >
        <ChevronRight aria-hidden className="size-3.5" />
      </button>

      {open && onGoTo && (
        <div
          role="menu"
          aria-label="Pages"
          className="absolute bottom-full right-0 mb-2 grid w-max grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-[#141418]/95 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.4)]"
        >
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              aria-current={i === index ? 'page' : undefined}
              onClick={() => {
                setOpen(false);
                if (i !== index) onGoTo(i);
              }}
              className={`size-7 rounded-full tabular-nums transition-colors ${
                i === index
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};
