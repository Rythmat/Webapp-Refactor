/**
 * SlideThumbnail — a true, pixel-faithful shrink of a slide for the filmstrip,
 * rendered through the shared `SlidePresentBody` inside the `DeckPreview`
 * 1280×720 transform-scale box. Carries the phase accent, selection ring, a
 * dangling-interaction badge, and hover Duplicate / Delete controls.
 */
import { AlertTriangle, Copy, Trash2 } from 'lucide-react';
import {
  SlidePresentBody,
  slideToPresentContent,
} from '../../presentation/SlidePresentBody';
import { PHASE_ACCENT_HEX } from '../../presentation/phaseAccent';
import type { Slide } from '../../slides/types';

interface SlideThumbnailProps {
  slide: Slide;
  index: number;
  selected: boolean;
  dangling: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const SlideThumbnail = ({
  slide,
  index,
  selected,
  dangling,
  canDelete,
  onSelect,
  onDuplicate,
  onDelete,
}: SlideThumbnailProps) => {
  return (
    <div className="group relative flex w-40 shrink-0 flex-col gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Slide ${index + 1}`}
        aria-pressed={selected}
        className={`relative overflow-hidden rounded-lg border bg-[#141416] transition-colors ${
          selected
            ? 'border-white ring-2 ring-white/60'
            : 'border-white/10 hover:border-white/30'
        }`}
        style={{
          borderTopColor: slide.accent ?? PHASE_ACCENT_HEX[slide.phase],
          borderTopWidth: 3,
        }}
      >
        <div
          className="presentation-root relative aspect-[16/9] w-full overflow-hidden"
          data-age="high"
        >
          <SlidePresentBody
            slide={slideToPresentContent(slide)}
            language="en"
          />
        </div>
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-medium text-white/80 backdrop-blur">
          {index + 1}
        </span>
        {dangling && (
          <span
            className="absolute right-1 top-1 rounded-full bg-amber-500/90 p-0.5 text-black"
            title="References a missing interaction"
          >
            <AlertTriangle className="h-3 w-3" />
          </span>
        )}
      </button>

      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Duplicate slide"
          className="rounded-full p-1 text-white/50 hover:bg-white/5 hover:text-white"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label="Delete slide"
          className="rounded-full p-1 text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
