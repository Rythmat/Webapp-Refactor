/**
 * SessionPresentView — the full-screen "Present" surface for a LIVE session. It
 * reuses the exact Preview slide view (`Focus` → `SlideRenderer` at
 * `surface="present"`) so what the teacher projects matches the editor/Preview,
 * but it is driven by SESSION state: prev/next call back through `onNavigate`
 * (wired to `sendNav`) so students and the projector follow. It covers the app
 * shell (`fixed inset-0`).
 *
 * Only the slide (owner, 2026-11-10) and its small step and page selector,
 * bottom right. The teacher's arrow keys move it too (`Focus`), Esc goes back to the class's dashboard, where the
 * session is ended; the slides speak the class's language setting.
 */
import { Focus } from '../presentation/Focus';
import { useTeacherConfig } from '../settings/useTeacherConfig';
import type { SlideSlots } from '../slides/SlideRenderer';
import type { Slide } from '../slides/types';
import type { Interaction } from '../types';
import '../presentation.css';

interface SessionPresentViewProps {
  /** Whose language setting the slides follow. */
  classroomId: string;
  /**
   * Pre-gated slots, built exactly as the projector builds them. Present IS
   * the projected surface in a single-screen room, so it must never show
   * identified responses — and `SlideRenderer` only calls `reveal` for the
   * interactions `interactionPolicy` permits on a projected surface.
   */
  slots?: SlideSlots;
  currentSlide: Slide;
  /** Interactions resolved for the current slide. */
  interactions: Interaction[];
  slideIndex: number;
  slideCount: number;
  /**
   * Where Prev and Next go: a step, except around the class's vote, which
   * leads to one Group Project and past the others (`slides/branches.ts`).
   * Itself when there is none.
   */
  prevIndex?: number;
  nextIndex?: number;
  /** Move the live session to a slide (students/projector follow). */
  onNavigate: (index: number) => void;
  onExit: () => void;
}

export const SessionPresentView = ({
  classroomId,
  currentSlide,
  interactions,
  slideIndex,
  slideCount,
  prevIndex = slideIndex - 1,
  nextIndex = slideIndex + 1,
  onNavigate,
  onExit,
  slots,
}: SessionPresentViewProps) => {
  // One language per class (owner, 2026-11-10), from the class's setting.
  const { config } = useTeacherConfig(classroomId);

  return (
    <div
      className="presentation-root fixed inset-0 z-50 flex flex-col"
      data-age="high"
    >
      <Focus
        slide={currentSlide}
        interactions={interactions}
        language={config.language}
        onExit={onExit}
        onPrev={() => onNavigate(prevIndex)}
        onNext={() => onNavigate(nextIndex)}
        hasPrev={prevIndex >= 0 && prevIndex !== slideIndex}
        hasNext={nextIndex < slideCount && nextIndex !== slideIndex}
        index={slideIndex}
        count={slideCount}
        onGoTo={onNavigate}
        slots={slots}
      />
    </div>
  );
};
