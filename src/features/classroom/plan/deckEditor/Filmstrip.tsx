/**
 * Filmstrip — the horizontal slide rail beneath the canvas. Pixel-faithful
 * thumbnails (via SlideThumbnail), select / duplicate / delete / reorder, an
 * add-slide affordance, and a non-blocking "Sort by phase" banner when the deck
 * drifts out of IMPACT order.
 */
import { ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { PHASES } from '../../phases';
import type { DaySnapshot } from '../../publish/publishDay';
import {
  findDanglingInteractionIds,
  slideInteractionIds,
} from '../../slides/deck';
import { slidesArePhaseOrdered } from '../../slides/deckEdit';
import type { SlideTemplateId } from '../../slides/templates/slideTemplates';
import type { Slide } from '../../slides/types';
import { AddSlideMenu } from './AddSlideMenu';
import { SlideThumbnail } from './SlideThumbnail';

interface FilmstripProps {
  slides: Slide[];
  selectedIndex: number;
  /** Published snapshot for the current draft — used to flag dangling refs. */
  snapshot: DaySnapshot;
  onSelect: (index: number) => void;
  onAdd: (templateId: SlideTemplateId) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  onSortByPhase: () => void;
}

export const Filmstrip = ({
  slides,
  selectedIndex,
  snapshot,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onSortByPhase,
}: FilmstripProps) => {
  const danglingIds = new Set(findDanglingInteractionIds(snapshot));
  const ordered = slidesArePhaseOrdered(slides, PHASES);

  return (
    <div className="flex flex-col gap-2">
      {!ordered && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/30 bg-amber-500/[0.06] px-3 py-1.5 text-sm text-amber-200/90">
          <span>Slides are out of IMPACT phase order.</span>
          <button
            type="button"
            onClick={onSortByPhase}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 px-2.5 py-1 text-xs font-medium text-amber-100 hover:bg-amber-400/10"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Sort by phase
          </button>
        </div>
      )}

      <div className="flex items-start gap-3 overflow-x-auto pb-1">
        {slides.map((slide, index) => (
          <div key={slide.id} className="flex flex-col gap-1">
            <SlideThumbnail
              slide={slide}
              index={index}
              selected={index === selectedIndex}
              dangling={slideInteractionIds(slide).some((id) =>
                danglingIds.has(id),
              )}
              canDelete={slides.length > 1}
              onSelect={() => onSelect(index)}
              onDuplicate={() => onDuplicate(index)}
              onDelete={() => onDelete(index)}
            />
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                aria-label="Move slide left"
                className="rounded p-0.5 text-white/40 hover:text-white disabled:opacity-20"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onMove(index, 1)}
                disabled={index === slides.length - 1}
                aria-label="Move slide right"
                className="rounded p-0.5 text-white/40 hover:text-white disabled:opacity-20"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <AddSlideMenu onAdd={onAdd} />
      </div>
    </div>
  );
};
