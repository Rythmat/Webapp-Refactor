/**
 * Presentation Mode — the projected board for a classroom.
 *
 * Three levels per the fresh-build brief:
 *   1. Board  — all five phases visible; current phase elevated.
 *   2. Focus  — one phase full-screen for the back row.
 *   3. Launch — Atlas modules open in a new tab, board persists behind.
 *
 * Data path: `buildStudentView(day, config)` is the ONLY source. The
 * `buildStudentView.test.ts` firewall test guarantees that no teacher-only
 * content ever reaches this file at any depth.
 */
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { buildStudentView } from './buildStudentView';
import { DEMO_DAY_ID, demoDay } from './fixtures/demoDay';
import { useSessionSync } from './live/useSessionSync';
import { PHASES, type PhaseKey } from './phases';
import { useLocalPlan } from './plan/useLocalPlan';
import { Board } from './presentation/Board';
import { Focus } from './presentation/Focus';
import { SegmentedControl } from './presentation/SegmentedControl';
import { slideToPresentContent } from './presentation/SlidePresentBody';
import { projectDeck } from './publish/publishDay';
import { slideAt } from './slides/deck';
import { deckFromCells } from './slides/deckFromCells';
import type { AgePreset, StudentLanguage, StudentViewConfig } from './types';
import './presentation.css';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN / ES' },
];

type Level = 'board' | 'focus';

export const PresentationMode = () => {
  const { classroomId, dayId } = useParams<{
    classroomId: string;
    dayId: string;
  }>();
  const cid = classroomId ?? '';
  const navigate = useNavigate();
  const { getDay } = useLocalPlan();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? '';
  const { state: sessionState, sendNav } = useSessionSync(
    sessionId,
    'teacher',
    cid,
  );

  // Resolve the Day: locally-authored Days come from `useLocalPlan`; a
  // dedicated `DEMO_DAY_ID` still shows the fresh-build demo. Anything else
  // falls back to the demo so an outdated bookmark still renders a board.
  const day = useMemo(() => {
    if (dayId && dayId !== DEMO_DAY_ID) {
      const stored = getDay(dayId);
      if (stored) return stored;
    }
    return demoDay;
  }, [dayId, getDay]);

  const [language, setLanguage] = useState<StudentLanguage>('en');
  // Age preset pinned to 'high' (the type-scale baseline); picker removed.
  const agePreset: AgePreset = 'high';
  const [currentPhaseKey, setCurrentPhaseKey] = useState<PhaseKey>(PHASES[0]);
  const [focusIndex, setFocusIndex] = useState(0);
  const [level, setLevel] = useState<Level>('board');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const config: StudentViewConfig = useMemo(
    () => ({ language, agePreset }),
    [language, agePreset],
  );

  const view = useMemo(() => buildStudentView(day, config), [day, config]);

  // Present renders the DECK (single source of truth), so "what you edit is
  // what you present." A Day that carries a persisted deck uses it; a legacy
  // deckless Day falls back to an ephemeral deck derived from its cells (the
  // same content the board used to show).
  const presentDeck = useMemo(
    () =>
      view.deck && view.deck.slides.length > 0
        ? view.deck
        : projectDeck(deckFromCells(day)),
    [view.deck, day],
  );

  const currentSlide =
    slideAt(presentDeck, focusIndex) ?? presentDeck.slides[0];

  const closeFocus = useCallback(() => setLevel('board'), []);

  const navigatePhase = useCallback(
    (phaseKey: PhaseKey) => {
      setCurrentPhaseKey(phaseKey);
      if (sessionId && sessionState) sendNav(phaseKey);
    },
    [sessionId, sessionState, sendNav],
  );

  // Open Focus at the first slide belonging to the tapped phase; the session
  // still navigates by phase (derived from the slide), so the live protocol is
  // unchanged.
  const openFocus = useCallback(
    (phaseKey: PhaseKey) => {
      const idx = presentDeck.slides.findIndex((s) => s.phase === phaseKey);
      setFocusIndex(idx >= 0 ? idx : 0);
      setCurrentPhaseKey(phaseKey);
      setLevel('focus');
      if (sessionId && sessionState) sendNav(phaseKey);
    },
    [presentDeck, sessionId, sessionState, sendNav],
  );

  // Walk the deck slide-by-slide in Focus; derive the phase from the landed
  // slide so the Board highlight + session nav stay in step.
  const goToSlide = useCallback(
    (index: number) => {
      const clamped = Math.max(
        0,
        Math.min(index, presentDeck.slides.length - 1),
      );
      setFocusIndex(clamped);
      const phase = presentDeck.slides[clamped]?.phase ?? PHASES[0];
      setCurrentPhaseKey(phase);
      if (sessionId && sessionState) sendNav(phase);
    },
    [presentDeck, sessionId, sessionState, sendNav],
  );

  const goPrevSlide = useCallback(
    () => goToSlide(focusIndex - 1),
    [goToSlide, focusIndex],
  );
  const goNextSlide = useCallback(
    () => goToSlide(focusIndex + 1),
    [goToSlide, focusIndex],
  );

  const goPrev = useCallback(() => {
    const idx = PHASES.indexOf(currentPhaseKey);
    navigatePhase(PHASES[Math.max(0, idx - 1)]);
  }, [currentPhaseKey, navigatePhase]);

  const goNext = useCallback(() => {
    const idx = PHASES.indexOf(currentPhaseKey);
    navigatePhase(PHASES[Math.min(PHASES.length - 1, idx + 1)]);
  }, [currentPhaseKey, navigatePhase]);

  useEffect(() => {
    if (sessionId && sessionState) {
      setCurrentPhaseKey(sessionState.currentPhase);
    }
  }, [sessionId, sessionState]);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }, []);

  const exitToClassroom = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
    if (classroomId) {
      navigate(TeacherRoutes.classroomDashboard({ classroomId }));
    } else {
      navigate(TeacherRoutes.root());
    }
  }, [classroomId, navigate]);

  // Track native fullscreen state so the icon toggles even if the user hits
  // Esc (which the browser handles without going through our button).
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Arrow-key navigation on the Board (Focus handles its own Esc).
  useEffect(() => {
    if (level !== 'board') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [level, goPrev, goNext]);

  return (
    <div
      ref={rootRef}
      className="presentation-root flex min-h-screen w-full flex-col"
      data-age={agePreset}
    >
      <PresentationChrome
        language={language}
        onLanguageChange={setLanguage}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onExit={exitToClassroom}
        dayLabel={day.label}
      />

      {level === 'board' && (
        <>
          <Board
            view={view}
            currentPhaseKey={currentPhaseKey}
            onSelectPhase={openFocus}
          />
          <BoardNav
            currentIndex={PHASES.indexOf(currentPhaseKey)}
            onPrev={goPrev}
            onNext={goNext}
          />
        </>
      )}

      {level === 'focus' && currentSlide && (
        <Focus
          slide={slideToPresentContent(currentSlide)}
          language={language}
          onClose={closeFocus}
          onPrev={goPrevSlide}
          onNext={goNextSlide}
          hasPrev={focusIndex > 0}
          hasNext={focusIndex < presentDeck.slides.length - 1}
          position={`${focusIndex + 1} / ${presentDeck.slides.length}`}
        />
      )}
    </div>
  );
};

interface PresentationChromeProps {
  language: StudentLanguage;
  onLanguageChange: (v: StudentLanguage) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
  dayLabel: string;
}

const PresentationChrome = ({
  language,
  onLanguageChange,
  isFullscreen,
  onToggleFullscreen,
  onExit,
  dayLabel,
}: PresentationChromeProps) => {
  return (
    <header
      className="flex items-center justify-between border-b border-white/[0.06] px-8 py-4"
      style={{ background: 'var(--pres-bg-inset)' }}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit Presentation Mode"
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          <X className="h-4 w-4" />
          Exit
        </button>
        <span className="text-sm text-white/60">{dayLabel}</span>
      </div>

      <div className="flex items-center gap-4 text-white/80">
        <SegmentedControl
          label="Language"
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={onLanguageChange}
        />
        <button
          type="button"
          onClick={onToggleFullscreen}
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
  );
};

interface BoardNavProps {
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

const BoardNav = ({ currentIndex, onPrev, onNext }: BoardNavProps) => {
  return (
    <div
      className="sticky bottom-4 mx-auto mt-auto flex items-center gap-3 rounded-full border border-white/[0.06] bg-[#141416]/90 px-3 py-2 backdrop-blur"
      style={{ marginBottom: '1.5rem' }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={currentIndex <= 0}
        aria-label="Previous phase"
        className="inline-flex size-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-sm text-white/50 tabular-nums">
        {currentIndex + 1} / {PHASES.length}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentIndex >= PHASES.length - 1}
        aria-label="Next phase"
        className="inline-flex size-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};
