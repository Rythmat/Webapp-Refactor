import { ArrowUpRight } from 'lucide-react';
import type { WorldScale } from '@/components/ClassroomLayout/globe/data/scales';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ScaleDetailDialogProps {
  /** The scale to show; `null` keeps the dialog closed. */
  scale: WorldScale | null;
  /** One-line context for the scale's tradition (from SCALE_TRADITIONS). */
  traditionBlurb?: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Read-only detail card for a World Harmony scale. Opens when `scale` is set,
 * showing its tradition context, character, and — for scales sourced from the
 * creator-wiki — a link to the video lesson that teaches it.
 */
export const ScaleDetailDialog = ({
  scale,
  traditionBlurb,
  onOpenChange,
}: ScaleDetailDialogProps) => {
  if (!scale) return null;

  return (
    <Dialog open={scale != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#101012] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{scale.name}</DialogTitle>
          <DialogDescription className="text-sm text-white/50">
            {scale.tradition} · {scale.region}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {traditionBlurb && (
            <p className="text-sm text-white/60">{traditionBlurb}</p>
          )}
          <p className="text-sm text-white/80">{scale.character}</p>
          {scale.description && (
            <p className="text-sm text-white/70">{scale.description}</p>
          )}
        </div>

        {scale.sourceVideoId && (
          <a
            href={`https://www.youtube.com/watch?v=${scale.sourceVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 self-start rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf]/50"
          >
            <span>
              Watch the lesson
              {scale.sourceCreator ? ` — ${scale.sourceCreator}` : ''}
            </span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
};
