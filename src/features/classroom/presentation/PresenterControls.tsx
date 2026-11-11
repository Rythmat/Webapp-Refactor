import { Maximize2, Minimize2, StopCircle, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Segmented, type SegmentedOption } from '@/daw/ui/Segmented';
import type { StudentLanguage } from '../types';

const LANGUAGE_OPTIONS: SegmentedOption<StudentLanguage>[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN / ES' },
];

const ICON_BUTTON =
  'inline-flex size-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white';

/**
 * The presenter's own controls (owner, 2026-11-10: no top rail while a
 * lesson is presenting, the slide fills the window): Exit, End for a live
 * class, the class's language and fullscreen, as one pill on the slide bar's
 * row (`Focus`'s `presenter` slot), at the bar's height.
 */
export const PresenterControls = ({
  onExit,
  exitLabel,
  onEnd,
  language,
  onLanguageChange,
  isFullscreen,
  onToggleFullscreen,
  children,
}: {
  onExit: () => void;
  exitLabel: string;
  /** A live class: end it for everyone (confirmed by the caller). */
  onEnd?: (() => void) | undefined;
  language: StudentLanguage;
  onLanguageChange: (next: StudentLanguage) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Anything else the teacher must see (a repaired snapshot's badge). */
  children?: ReactNode;
}) => (
  <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-daw-edge bg-daw-pill px-2 py-2">
    <button
      type="button"
      onClick={onExit}
      aria-label={exitLabel}
      title="Exit"
      className={ICON_BUTTON}
    >
      <X aria-hidden className="h-5 w-5" />
    </button>
    {onEnd && (
      <button
        type="button"
        onClick={onEnd}
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-red-200 transition-colors hover:bg-red-400/10 hover:text-red-100"
      >
        <StopCircle aria-hidden className="h-4 w-4" />
        End
      </button>
    )}
    <Segmented<StudentLanguage>
      label="Language"
      options={LANGUAGE_OPTIONS}
      value={language}
      onValueChange={onLanguageChange}
    />
    <button
      type="button"
      onClick={onToggleFullscreen}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      className={ICON_BUTTON}
    >
      {isFullscreen ? (
        <Minimize2 aria-hidden className="h-4 w-4" />
      ) : (
        <Maximize2 aria-hidden className="h-4 w-4" />
      )}
    </button>
    {children}
  </div>
);
