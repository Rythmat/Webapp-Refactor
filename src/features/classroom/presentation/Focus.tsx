import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import type { StudentPhaseView } from '../buildStudentView';
import type { StudentLanguage } from '../types';
import { PresentSlide } from './PresentSlide';

interface FocusProps {
  phase: StudentPhaseView;
  language: StudentLanguage;
  onClose: () => void;
}

/**
 * Level 2 — Focus. One phase, full-bleed, rendered through the shared deck
 * shell (`PresentSlide` → `SlideFrame`) so Presentation Mode matches the deck
 * surfaces. The frame fills the area below the chrome (no more top-hugging
 * empty canvas); "Back to Board" floats top-right so it clears the frame's
 * top-left phase chip. Esc also closes Focus.
 */
export const Focus = ({ phase, language, onClose }: FocusProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
        aria-label="Back to Board"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Board
      </button>
      <PresentSlide phase={phase} language={language} />
    </div>
  );
};
