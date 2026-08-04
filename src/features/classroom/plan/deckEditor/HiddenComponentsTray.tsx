/**
 * HiddenComponentsTray — editor-only. Lists the blocks a teacher has hidden on
 * the current slide (e.g. a removed title) as chips; clicking one re-adds it
 * (text/content preserved — hide only sets a flag, it never deletes data).
 */
import { Plus } from 'lucide-react';
import { hiddenBlocks } from '../../slides/slideLayout';
import type { Slide, SlideBlockKey } from '../../slides/types';

const BLOCK_LABEL: Record<SlideBlockKey, string> = {
  title: 'Title',
  prompt: 'Prompt',
  body: 'Body',
  media: 'Media',
  sideMedia: 'Artist image',
  launchTiles: 'Content links',
  resetChecklist: 'Reset checklist',
  interaction: 'Question',
};

interface HiddenComponentsTrayProps {
  slide: Slide;
  onShow: (key: SlideBlockKey) => void;
}

export const HiddenComponentsTray = ({
  slide,
  onShow,
}: HiddenComponentsTrayProps) => {
  const hidden = hiddenBlocks(slide);
  if (hidden.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
      <span className="text-xs uppercase tracking-wider text-white/40">
        Hidden
      </span>
      {hidden.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onShow(key)}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-sm text-white/80 hover:border-white/30 hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          {BLOCK_LABEL[key]}
        </button>
      ))}
    </div>
  );
};
