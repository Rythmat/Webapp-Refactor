import { ChevronRight } from 'lucide-react';
import { SettingsSection } from '@/curriculum/guitar/layout/settingsControls';
import { startLearnTour } from './learnTourStore';
import { isLessonPath } from './places';

/**
 * Lesson Settings' way back into the lesson tour (Peter, 2026-10-21: "this
 * option should live inside the Lesson Settings menu"). Only on the genre
 * and Theory lessons the tour knows; the sheet closes and the tour starts on
 * this lesson.
 */
export function ShowTourAgainRow({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  const { pathname, search } = window.location;
  if (!isLessonPath(pathname)) return null;
  return (
    <SettingsSection label="Help" className={className}>
      <button
        type="button"
        data-learn-tour-again
        onClick={() => {
          onClose();
          startLearnTour('lesson', { returnTo: `${pathname}${search}` });
        }}
        className="-mx-2 flex min-h-[52px] w-[calc(100%+1rem)] items-center justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm leading-5 text-[#e8e8f0]">
            Show the tutorial again
          </span>
          <span className="text-xs leading-4 text-white/55">
            A quick tour of this lesson’s buttons and its Practice Track.
          </span>
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-white/55" />
      </button>
    </SettingsSection>
  );
}
