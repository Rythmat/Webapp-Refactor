import { Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { ProfileRoutes } from '@/constants/routes';
import { trackPaywallViewed } from '@/telemetry/hooks/useTelemetryProduct';
import { getTutorialEntry } from './tutorialCatalog';

interface UpgradeLessonDialogProps {
  /** The Premium lesson a free student tried to open; null when closed. */
  lessonId: string | null;
  onClose: () => void;
}

// The landing look: the white pill for what to do next, the outlined pill
// beside it, 36 px targets, 12 px and up.
const TARGET =
  'inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';
const PRIMARY = cn(
  TARGET,
  'bg-white text-[#101012] hover:bg-white/90 active:bg-white/80',
);
const SECONDARY = cn(
  TARGET,
  'border border-white/15 bg-white/[0.04] text-[#e8e8f0] hover:bg-white/[0.08] active:bg-white/[0.12]',
);

/**
 * Says why a Premium lesson didn't open for a free student, and where to go
 * next (owner decision 8: the four Prism lessons are Premium, and Prism is
 * not unlocked during a lesson). The Studio dashboard opens it from a
 * Premium lesson tile, and the editor from a `?tutorial=` link it turned
 * away before clearing anything, so the student's work is still open
 * behind it. Each opening counts as a paywall view.
 *
 * It lives with the lessons rather than the dashboard so the editor doesn't
 * import from the dashboard's tree, and imports only the catalog, so the
 * dashboard chunk stays free of the steps (practice-tutorial-25).
 */
export function UpgradeLessonDialog({
  lessonId,
  onClose,
}: UpgradeLessonDialogProps) {
  const navigate = useNavigate();

  // The lesson named in the copy outlives `lessonId` by the close animation,
  // so the text doesn't change while the dialog fades out.
  const [shownId, setShownId] = useState(lessonId);
  if (lessonId !== null && lessonId !== shownId) setShownId(lessonId);
  const title = getTutorialEntry(shownId)?.title;

  // Once per opening; the ref keeps a re-run effect (StrictMode) from
  // counting the same view twice.
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (lessonId === null) {
      reported.current = null;
      return;
    }
    if (reported.current === lessonId) return;
    reported.current = lessonId;
    trackPaywallViewed(window.location.pathname);
  }, [lessonId]);

  const seePlans = () => {
    onClose();
    navigate(ProfileRoutes.plan.definition);
  };

  return (
    <Dialog
      open={lessonId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          'w-[calc(100%-2rem)] max-w-[420px] gap-5 rounded-2xl border-white/[0.08] bg-[#151518] text-[#e8e8f0] sm:rounded-2xl',
          // Reduced motion: it fades, without the zoom and the drift.
          'motion-reduce:data-[state=closed]:zoom-out-100 motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:slide-out-to-top-1/2 motion-reduce:data-[state=open]:slide-in-from-top-1/2',
          // The close button: a 36 px round target.
          '[&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:flex [&>button:last-child]:size-9 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:rounded-full [&>button:last-child]:bg-transparent [&>button:last-child]:text-white/55 [&>button:last-child]:opacity-100 [&>button:last-child]:transition-colors hover:[&>button:last-child]:bg-white/[0.06] hover:[&>button:last-child]:text-[#e8e8f0]',
        )}
      >
        <DialogHeader className="gap-3 space-y-0 text-left sm:text-left">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full bg-white/10"
          >
            <Lock className="size-5 text-white/80" />
          </span>
          <DialogTitle className="pr-8 text-lg font-normal leading-snug text-white">
            This lesson uses Prism, part of Premium
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-white/60">
            {title ? `“${title}” has` : 'This lesson has'} steps in Prism, the
            Studio’s chord and harmony workshop. Lessons without the Premium tag
            are free.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={SECONDARY} onClick={onClose}>
            Not now
          </button>
          <button type="button" className={PRIMARY} onClick={seePlans}>
            See plans
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
