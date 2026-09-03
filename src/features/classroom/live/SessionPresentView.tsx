/**
 * SessionPresentView — the full-screen "Present" surface for a LIVE session. It
 * reuses the exact Preview slide view (`Focus` → `SlidePresentBody` at
 * `surface="present"`) so what the teacher projects matches the editor/Preview,
 * but it is driven by SESSION state: prev/next call back through `onNavigate`
 * (wired to `sendNav`) so students and the projector follow. It covers the app
 * shell (`fixed inset-0`); the fullscreen toggle then fills the physical screen
 * for the classroom projector.
 */
import { Maximize2, Minimize2, StopCircle, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Focus } from '../presentation/Focus';
import { SegmentedControl } from '../presentation/SegmentedControl';
import { slideToPresentContent } from '../presentation/SlidePresentBody';
import type { Slide } from '../slides/types';
import type { StudentLanguage } from '../types';
import '../presentation.css';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN / ES' },
];

interface SessionPresentViewProps {
  currentSlide: Slide;
  slideIndex: number;
  slideCount: number;
  dayLabel: string;
  /** Move the live session to a slide (students/projector follow). */
  onNavigate: (index: number) => void;
  onExit: () => void;
  /** End the live session for the whole class (confirmed by the caller). */
  onEnd: () => void;
}

export const SessionPresentView = ({
  currentSlide,
  slideIndex,
  slideCount,
  dayLabel,
  onNavigate,
  onExit,
  onEnd,
}: SessionPresentViewProps) => {
  const [language, setLanguage] = useState<StudentLanguage>('en');
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
      <header
        className="flex items-center justify-between border-b border-white/[0.06] px-8 py-4"
        style={{ background: 'var(--pres-bg-inset)' }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit present mode"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            <X className="h-4 w-4" />
            Exit
          </button>
          <span className="text-sm text-white/60">{dayLabel}</span>
        </div>

        <div className="flex items-center gap-4 text-white/80">
          <button
            type="button"
            onClick={onEnd}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 px-3 py-1.5 text-sm text-red-200 transition-colors hover:border-red-400 hover:text-red-100"
          >
            <StopCircle className="h-4 w-4" />
            End
          </button>
          <SegmentedControl
            label="Language"
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={setLanguage}
          />
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-transparent text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      <Focus
        slide={slideToPresentContent(currentSlide)}
        language={language}
        onExit={onExit}
        onPrev={() => onNavigate(slideIndex - 1)}
        onNext={() => onNavigate(slideIndex + 1)}
        hasPrev={slideIndex > 0}
        hasNext={slideIndex < slideCount - 1}
        position={`${slideIndex + 1} / ${slideCount}`}
      />
    </div>
  );
};
