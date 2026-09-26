/**
 * Presentation Mode — the projected deck for a classroom.
 *
 * Present renders the DECK slide-by-slide (single source of truth, so "what you
 * edit is what you present"): one full-bleed slide via `Focus`, with a prev/next
 * pager and the shared chrome (Exit / language / fullscreen). Launch tiles on a
 * slide open Atlas modules in a new tab. The legacy 5-phase board is gone — Present
 * opens straight on the slides.
 *
 * Data path: `buildStudentView(day, config)` is the ONLY source. The
 * `buildStudentView.test.ts` firewall test guarantees that no teacher-only
 * content ever reaches this file at any depth, and `useSanitizedStudentView`
 * is the read-path backstop: if a projection ever regresses, the offending key
 * is stripped and reported rather than blanking the lesson mid-class.
 */
import { Maximize2, Minimize2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useCanEditClassroom } from '@/hooks/data';
import { buildStudentView } from './buildStudentView';
import { DEMO_DAY_ID, demoDay } from './fixtures/demoDay';
import { useSessionSync } from './live/useSessionSync';
import { PHASES } from './phases';
import { useLocalPlan } from './plan/useLocalPlan';
import { Focus } from './presentation/Focus';
import { SegmentedControl } from './presentation/SegmentedControl';
import { SnapshotRepairBadge } from './publish/SnapshotRepairBadge';
import { publishDay } from './publish/publishDay';
import { useSanitizedStudentView } from './publish/useRuleOneReadGuard';
import { useTeacherConfig } from './settings/useTeacherConfig';
import { slideAt, slideInteractionIds } from './slides/deck';
import { emptyDeck } from './slides/deckEdit';
import type {
  AgePreset,
  Interaction,
  StudentLanguage,
  StudentViewConfig,
} from './types';
import './presentation.css';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN / ES' },
];

export const PresentationMode = () => {
  const { classroomId, dayId } = useParams<{
    classroomId: string;
    dayId: string;
  }>();
  const cid = classroomId ?? '';
  const navigate = useNavigate();
  const { getDay } = useLocalPlan();
  const canEdit = useCanEditClassroom(cid);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? '';
  const { state: sessionState, sendNav } = useSessionSync(
    sessionId,
    'teacher',
    cid,
  );

  // Resolve the Day: locally-authored Days come from `useLocalPlan`; a
  // dedicated `DEMO_DAY_ID` still shows the fresh-build demo. Anything else
  // falls back to the demo so an outdated bookmark still renders.
  const day = useMemo(() => {
    if (dayId && dayId !== DEMO_DAY_ID) {
      const stored = getDay(dayId);
      if (stored) return stored;
    }
    return demoDay;
  }, [dayId, getDay]);

  const [language, setLanguage] = useState<StudentLanguage>('en');
  // Per-section age preset. This used to be hard-coded 'high' while
  // `agePresetDefault` sat in settings with ZERO readers — a picker teachers
  // could set that changed nothing. It now resolves per classroom.
  const { config: teacherConfig } = useTeacherConfig(cid);
  const agePreset: AgePreset = teacherConfig.agePresetDefault;
  const [focusIndex, setFocusIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const config: StudentViewConfig = useMemo(
    () => ({ language, agePreset }),
    [language, agePreset],
  );

  const builtView = useMemo(() => buildStudentView(day, config), [day, config]);
  // Rule 1, read path: strip rather than blank (see the module doc block).
  const { view, stripped: repairedPaths } = useSanitizedStudentView(
    builtView,
    'presentation-mode',
    { classroomId: cid },
  );

  // Present renders the DECK (single source of truth), so "what you edit is
  // what you present." A Day that carries a persisted deck uses it; a deckless
  // Day derives one.
  //
  // The fallback goes through `publishDay` — the SAME firewall the live
  // surfaces publish through — rather than calling `deckFromCells` on the raw
  // Day. It used to do the latter, which walked straight past the Rule 1 read
  // guard two lines above and put whatever the guard had just stripped back
  // onto a projected screen. `publishDay` whitelist-copies every field and
  // derives the deck itself when the Day has none.
  const presentDeck = useMemo(() => {
    if (view.deck && view.deck.slides.length > 0) return view.deck;
    return publishDay(day).deck ?? emptyDeck(day);
  }, [view.deck, day]);

  const currentSlide =
    slideAt(presentDeck, focusIndex) ?? presentDeck.slides[0];

  /**
   * Presentation Mode has no live session, so there are no responses and no
   * reveal — but an interaction slide still has to SHOW its question, or the
   * whole slide is blank.
   *
   * These come from the sanitized `view`, not from the raw Day: the view's
   * interactions are already whitelist-projected
   * (`projectInteractionForStudent`), which is the same shape `publishDay`
   * hands the live surfaces. Reading `day.cells` directly here would put a
   * teacher-side object on a projected surface.
   */
  const currentSlideInteractions = useMemo(() => {
    if (!currentSlide) return [];
    const wanted = slideInteractionIds(currentSlide);
    if (wanted.length === 0) return [];
    const available = view.phases.flatMap((phase) => phase.interactions ?? []);
    return wanted
      .map((id) => available.find((i) => i.id === id))
      .filter((i): i is Interaction => i !== undefined);
  }, [view, currentSlide]);

  // Walk the deck slide-by-slide; derive the phase from the landed slide so a
  // live session's currentPhase stays in step (outgoing nav only).
  const goToSlide = useCallback(
    (index: number) => {
      const clamped = Math.max(
        0,
        Math.min(index, presentDeck.slides.length - 1),
      );
      setFocusIndex(clamped);
      const phase = presentDeck.slides[clamped]?.phase ?? PHASES[0];
      // Rule: only someone who can edit this classroom may drive the class
      // screen. PresentationMode sits OUTSIDE ClassroomDeepPageLayout, so it
      // inherited no ownership guard — a viewer (or anyone with the URL) could
      // navigate every connected student device.
      if (sessionId && sessionState && canEdit) sendNav(phase);
    },
    [presentDeck, sessionId, sessionState, sendNav, canEdit],
  );

  const goPrevSlide = useCallback(
    () => goToSlide(focusIndex - 1),
    [goToSlide, focusIndex],
  );
  const goNextSlide = useCallback(
    () => goToSlide(focusIndex + 1),
    [goToSlide, focusIndex],
  );

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

  return (
    <div
      ref={rootRef}
      className="presentation-root flex h-full min-h-0 w-full flex-col"
      data-age={agePreset}
    >
      <PresentationChrome
        language={language}
        onLanguageChange={setLanguage}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onExit={exitToClassroom}
        dayLabel={day.label}
        repairedPaths={repairedPaths}
      />

      {currentSlide && (
        <Focus
          slide={currentSlide}
          interactions={currentSlideInteractions}
          language={language}
          onExit={exitToClassroom}
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
  /** Rule 1 read-path repairs; renders the amber badge when non-empty. */
  repairedPaths: string[];
}

const PresentationChrome = ({
  language,
  onLanguageChange,
  isFullscreen,
  onToggleFullscreen,
  onExit,
  dayLabel,
  repairedPaths,
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
        <SnapshotRepairBadge stripped={repairedPaths} />
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
