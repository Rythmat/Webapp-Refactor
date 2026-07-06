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
import { useNavigate, useParams } from 'react-router-dom';
import { ClassroomRoutes } from '@/constants/routes';
import { buildStudentView } from './buildStudentView';
import { DEMO_DAY_ID, demoDay } from './fixtures/demoDay';
import { PHASES, type PhaseKey } from './phases';
import { useLocalPlan } from './plan/useLocalPlan';
import { Board } from './presentation/Board';
import { Focus } from './presentation/Focus';
import type { AgePreset, StudentLanguage, StudentViewConfig } from './types';
import './presentation.css';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN / ES' },
];

const AGE_OPTIONS: { value: AgePreset; label: string }[] = [
  { value: 'middle', label: 'Middle' },
  { value: 'high', label: 'High' },
  { value: 'college', label: 'College' },
];

type Level = 'board' | 'focus';

export const PresentationMode = () => {
  const { classroomId, dayId } = useParams<{
    classroomId: string;
    dayId: string;
  }>();
  const navigate = useNavigate();
  const { getDay } = useLocalPlan();

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
  const [agePreset, setAgePreset] = useState<AgePreset>('high');
  const [currentPhaseKey, setCurrentPhaseKey] = useState<PhaseKey>(PHASES[0]);
  const [level, setLevel] = useState<Level>('board');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const config: StudentViewConfig = useMemo(
    () => ({ language, agePreset }),
    [language, agePreset],
  );

  const view = useMemo(() => buildStudentView(day, config), [day, config]);

  const focusedPhase = useMemo(
    () =>
      view.phases.find((p) => p.phaseKey === currentPhaseKey) ?? view.phases[0],
    [view.phases, currentPhaseKey],
  );

  const openFocus = useCallback((phaseKey: PhaseKey) => {
    setCurrentPhaseKey(phaseKey);
    setLevel('focus');
  }, []);

  const closeFocus = useCallback(() => setLevel('board'), []);

  const goPrev = useCallback(() => {
    setCurrentPhaseKey((current) => {
      const idx = PHASES.indexOf(current);
      return PHASES[Math.max(0, idx - 1)];
    });
  }, []);

  const goNext = useCallback(() => {
    setCurrentPhaseKey((current) => {
      const idx = PHASES.indexOf(current);
      return PHASES[Math.min(PHASES.length - 1, idx + 1)];
    });
  }, []);

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
      navigate(ClassroomRoutes.home({ classroomId }));
    } else {
      navigate(ClassroomRoutes.picker());
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
        agePreset={agePreset}
        onAgeChange={setAgePreset}
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

      {level === 'focus' && focusedPhase && (
        <Focus phase={focusedPhase} language={language} onClose={closeFocus} />
      )}
    </div>
  );
};

interface PresentationChromeProps {
  language: StudentLanguage;
  onLanguageChange: (v: StudentLanguage) => void;
  agePreset: AgePreset;
  onAgeChange: (v: AgePreset) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
  dayLabel: string;
}

const PresentationChrome = ({
  language,
  onLanguageChange,
  agePreset,
  onAgeChange,
  isFullscreen,
  onToggleFullscreen,
  onExit,
  dayLabel,
}: PresentationChromeProps) => {
  return (
    <header
      className="flex items-center justify-between border-b border-black/[0.08] px-8 py-4"
      style={{ background: 'var(--pres-bg-warm)' }}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit Presentation Mode"
          className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-black/5"
        >
          <X className="h-4 w-4" />
          Exit
        </button>
        <span className="text-sm text-black/60">{dayLabel}</span>
      </div>

      <div className="flex items-center gap-4 text-black/80">
        <SegmentedControl
          label="Language"
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={onLanguageChange}
        />
        <SegmentedControl
          label="Age"
          options={AGE_OPTIONS}
          value={agePreset}
          onChange={onAgeChange}
        />
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="inline-flex size-8 items-center justify-center rounded-full border border-black/15 bg-white text-black hover:bg-black/5"
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

interface SegmentedControlProps<V extends string> {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}

const SegmentedControl = <V extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<V>) => {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white p-0.5"
      role="group"
      aria-label={label}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            opt.value === value
              ? 'bg-black text-white'
              : 'text-black/70 hover:text-black'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
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
      className="sticky bottom-4 mx-auto mt-auto flex items-center gap-3 rounded-full bg-white/95 px-3 py-2 shadow-[var(--pres-shadow)] backdrop-blur"
      style={{ marginBottom: '1.5rem' }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={currentIndex <= 0}
        aria-label="Previous phase"
        className="inline-flex size-9 items-center justify-center rounded-full text-black/80 hover:bg-black/5 disabled:opacity-30"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-sm text-black/60 tabular-nums">
        {currentIndex + 1} / {PHASES.length}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentIndex >= PHASES.length - 1}
        aria-label="Next phase"
        className="inline-flex size-9 items-center justify-center rounded-full text-black/80 hover:bg-black/5 disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};
