/**
 * SessionPresentView — the full-screen "Present" surface for a LIVE session. It
 * reuses the exact Preview slide view (`Focus` → `SlideRenderer` at
 * `surface="present"`) so what the teacher projects matches the editor/Preview,
 * but it is driven by SESSION state: prev/next call back through `onNavigate`
 * (wired to `sendNav`) so students and the projector follow. It covers the app
 * shell (`fixed inset-0`); the fullscreen toggle then fills the physical screen
 * for the classroom projector.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Focus } from '../presentation/Focus';
import { PresenterControls } from '../presentation/PresenterControls';
import { useTeacherConfig } from '../settings/useTeacherConfig';
import type { SlideSlots } from '../slides/SlideRenderer';
import type { Slide } from '../slides/types';
import type { Interaction, StudentLanguage } from '../types';
import '../presentation.css';

interface SessionPresentViewProps {
  /** Whose language setting the slides follow (and the switch writes). */
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
  /** Move the live session to a slide (students/projector follow). */
  onNavigate: (index: number) => void;
  onExit: () => void;
  /** End the live session for the whole class (confirmed by the caller). */
  onEnd: () => void;
}

export const SessionPresentView = ({
  classroomId,
  currentSlide,
  interactions,
  slideIndex,
  slideCount,
  onNavigate,
  onExit,
  onEnd,
  slots,
}: SessionPresentViewProps) => {
  // One language per class (owner, 2026-11-10). The switch writes the class
  // setting, so the room's screen (another tab) follows it.
  const { config, setClassroomConfig } = useTeacherConfig(classroomId);
  const language = config.language;
  const setLanguage = (next: StudentLanguage) =>
    setClassroomConfig({ language: next });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }, []);

  // Keep the icon in sync even when the user leaves fullscreen via Esc.
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return (
    <div
      ref={rootRef}
      className="presentation-root fixed inset-0 z-50 flex flex-col"
      data-age="high"
    >
      <Focus
        slide={currentSlide}
        interactions={interactions}
        language={language}
        onExit={onExit}
        onPrev={() => onNavigate(slideIndex - 1)}
        onNext={() => onNavigate(slideIndex + 1)}
        hasPrev={slideIndex > 0}
        hasNext={slideIndex < slideCount - 1}
        position={`${slideIndex + 1} / ${slideCount}`}
        slots={slots}
        presenter={
          <PresenterControls
            onExit={onExit}
            exitLabel="Exit present mode"
            onEnd={onEnd}
            language={language}
            onLanguageChange={setLanguage}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        }
      />
    </div>
  );
};
