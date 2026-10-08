import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Radio, Save, Waypoints } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useCanEditClassroom } from '@/hooks/data';
import { useAnnualPlan } from '../../annual/useAnnualPlan';
import { useLocalSessionStore } from '../../live/useLocalSessionStore';
import {
  confirmPracticeSession,
  useStartClassroomSession,
} from '../../live/useStartClassroomSession';
import { newBlankDay } from '../../plan/newBlankDay';
import { defaultUnitIdFor } from '../../plan/useEnsureLessonUnits';
import { useLocalPlan } from '../../plan/useLocalPlan';
import { usePublishedDays } from '../../publish/usePublishedDays';
import type { Day } from '../../types';
import { applyCortexLessonToDay, roleAvailable } from '../cortex/buildDeck';
import { loadLessonAtlas } from '../cortex/loadLessonAtlas';
import { planCortexLesson } from '../cortex/planLesson';
import { suggestFocus } from '../cortex/suggestFocus';
import {
  DEFAULT_CORTEX_CHOICES,
  GROUP_ROLES,
  type CortexLessonChoices,
  type GroupRole,
  type LessonFocus,
} from '../cortex/types';
import { CortexFocusStep } from './CortexFocusStep';
import { CortexOptions, type CortexOptionValues } from './CortexOptions';
import { CortexRoleStep } from './CortexRoleStep';
import { DeckPreview } from './DeckPreview';
import { focusContextForDay, recentFocusIds } from './cortexContext';
import { EYEBROW, OUTLINE_PILL, PANEL, PRIMARY_PILL } from './wizardStyles';

const STEPS = ['Focus', 'Group Project', 'Preview'] as const;

/** One query for the page load: the graph is several megabytes. */
export const LESSON_ATLAS_KEY = ['classroom', 'lesson-atlas'] as const;

/**
 * Generate a lesson from the Atlas — the connections the console's Cortex
 * draws. Pick the Showcase's focus (suggested from today's plan or the
 * best-connected artists and cities; accept, shuffle or search), pick the
 * Group Project role, preview, then Save to Plan or Go Live.
 *
 * `?day=<id>` generates onto an existing Day (its planned song and Globe
 * events steer the suggestion, and its deck is replaced); otherwise a new Day
 * is made and put in a Unit (`?unit=<id>`, else the current month's). The
 * Day goes through the same path as Plan's "Start session": saveDay →
 * publish → startSession → teacher dashboard.
 */
export const DeckWizardPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dayParam = searchParams.get('day');
  const preUnit = searchParams.get('unit');

  const { listDays, saveDay } = useLocalPlan(cid);
  const { publishDayToClassroom } = usePublishedDays(cid);
  const startClassroomSession = useStartClassroomSession();
  const { endSession } = useLocalSessionStore();
  // Viewers may browse the generator but cannot publish or start a session.
  const canEdit = useCanEditClassroom(cid);
  const {
    plan: annualPlan,
    seedFromTemplate,
    addDayToUnit,
    suggestDayScheduleInUnit,
  } = useAnnualPlan(cid);

  const days = listDays(cid);
  const plannedDay = dayParam
    ? (days.find((d) => d.id === dayParam) ?? null)
    : null;
  // Keyed by value, so a re-render with equal Days doesn't re-plan.
  const recentKey = recentFocusIds(days, plannedDay?.id).join('|');
  const context = useMemo(
    () => focusContextForDay(plannedDay, recentKey ? recentKey.split('|') : []),
    [plannedDay, recentKey],
  );

  const atlas = useQuery({
    queryKey: LESSON_ATLAS_KEY,
    queryFn: loadLessonAtlas,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  const [step, setStep] = useState(0);
  const [seed, setSeed] = useState(0);
  const [picked, setPicked] = useState<LessonFocus | null>(null);
  const [role, setRole] = useState<GroupRole | null>(null);
  const [tutorialId, setTutorialId] = useState<string>();
  const [performerRef, setPerformerRef] = useState<string>();
  const [options, setOptions] = useState<CortexOptionValues>({
    checkInStyle: DEFAULT_CORTEX_CHOICES.checkInStyle,
    vibePoll: DEFAULT_CORTEX_CHOICES.vibePoll,
    projectMinutes: DEFAULT_CORTEX_CHOICES.projectMinutes,
  });
  const [busy, setBusy] = useState(false);
  // A new Day's id, made once, so the preview's ids hold still.
  const [draft] = useState(() => newBlankDay());
  const [token] = useState(() =>
    Math.floor(Math.random() * 36 ** 4)
      .toString(36)
      .padStart(4, '0'),
  );

  const lessonAtlas = atlas.data;
  const focus = useMemo(
    () =>
      lessonAtlas
        ? (picked ??
          suggestFocus(lessonAtlas.graph, lessonAtlas.catalog, context, seed))
        : null,
    [lessonAtlas, picked, context, seed],
  );
  const plan = useMemo(
    () =>
      lessonAtlas && focus
        ? planCortexLesson(lessonAtlas.graph, lessonAtlas.catalog, focus)
        : null,
    [lessonAtlas, focus],
  );
  // The chosen role while the focus supports it, else the first it does.
  const activeRole: GroupRole | null = plan
    ? role && roleAvailable(plan, role)
      ? role
      : (GROUP_ROLES.find((r) => roleAvailable(plan, r)) ?? null)
    : null;

  const builtDay = useMemo<Day | null>(() => {
    if (!plan || !focus || !activeRole) return null;
    const choices: CortexLessonChoices = {
      ...DEFAULT_CORTEX_CHOICES,
      ...options,
      role: activeRole,
      seed,
      ...(tutorialId ? { tutorialId } : {}),
      ...(performerRef ? { performerRef } : {}),
    };
    const base = plannedDay ?? { ...draft, label: focus.label };
    return applyCortexLessonToDay(base, plan, choices, token);
  }, [
    plan,
    focus,
    activeRole,
    options,
    seed,
    tutorialId,
    performerRef,
    plannedDay,
    draft,
    token,
  ]);

  const shuffle = () => {
    setPicked(null);
    setSeed((s) => s + 1);
    setTutorialId(undefined);
    setPerformerRef(undefined);
  };
  const pick = (next: LessonFocus) => {
    setPicked(next);
    setTutorialId(undefined);
    setPerformerRef(undefined);
  };

  // A new Lesson belongs to a Unit (from ?unit, else the current month's),
  // seeding the canonical Units first if this classroom has none. A Day being
  // regenerated keeps the Unit and date it has.
  const assignToUnit = (day: Day) => {
    const activePlan = annualPlan ?? seedFromTemplate();
    const units = [
      ...activePlan.year.semesters.autumn,
      ...activePlan.year.semesters.spring,
    ];
    if (units.some((u) => u.dayIds?.includes(day.id))) return;
    const uid =
      preUnit && units.some((u) => u.id === preUnit)
        ? preUnit
        : (defaultUnitIdFor(units) ?? units[0]?.id);
    if (!uid) return;
    addDayToUnit(uid, day.id);
    const unit = units.find((u) => u.id === uid);
    const existing = (unit?.dayIds ?? [])
      .map((id) => days.find((d) => d.id === id)?.scheduledDate)
      .filter((d): d is string => Boolean(d));
    const date = suggestDayScheduleInUnit(uid, existing, existing.length);
    if (date) saveDay({ ...day, scheduledDate: date });
  };

  const launch = async (mode: 'save' | 'live') => {
    if (!builtDay || busy) return;
    setBusy(true);
    try {
      saveDay(builtDay);
      assignToUnit(builtDay);
      if (mode === 'save') {
        navigate(TeacherRoutes.plan({ classroomId: cid }));
        return;
      }
      const pd = await publishDayToClassroom({
        classroomId: cid,
        day: builtDay,
      });
      const started = await startClassroomSession({
        classroomId: cid,
        publishedDayId: pd.id,
        initialPhase: builtDay.deck?.slides[0]?.phase ?? 'connectRegulate',
        initialSlideIndex: 0,
      });
      // NO SILENT MOCKS: a local session is never presented as a real one.
      if (started.transport === 'local') {
        if (!confirmPracticeSession(started.reason)) {
          endSession(started.sessionId);
          return;
        }
      }
      navigate(
        TeacherRoutes.session({
          classroomId: cid,
          sessionId: started.sessionId,
        }),
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not start');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-6 text-[#e8e8f0] md:gap-8 md:px-10 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={TeacherRoutes.plan({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-[#e8e8f0]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lessons
        </Link>
        <div className="flex flex-col items-end">
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-[-0.01em]">
            <Waypoints className="h-5 w-5" />
            {plannedDay ? 'Generate this lesson' : 'Generate a lesson'}
          </h1>
          <span className="text-sm text-white/55">
            {plannedDay
              ? plannedDay.label
              : 'From the connections in the Atlas'}
          </span>
        </div>
      </header>

      <Stepper step={step} onStep={setStep} ready={Boolean(builtDay)} />

      {atlas.isPending && (
        <p className={`${PANEL} p-5 text-sm text-white/55`} role="status">
          Loading the Atlas…
        </p>
      )}
      {atlas.isError && (
        <div className={`${PANEL} flex flex-col gap-3 p-5`} role="alert">
          <p className="text-sm">The Atlas could not be loaded.</p>
          <button
            type="button"
            className={`${OUTLINE_PILL} w-fit`}
            onClick={() => void atlas.refetch()}
          >
            Try again
          </button>
        </div>
      )}
      {lessonAtlas && !focus && (
        <p className={`${PANEL} p-5 text-sm text-white/55`}>
          The Atlas has no artist or city to suggest yet.
        </p>
      )}

      {lessonAtlas && focus && plan && (
        <>
          {step === 0 && (
            <CortexFocusStep
              graph={lessonAtlas.graph}
              catalog={lessonAtlas.catalog}
              focus={focus}
              plan={plan}
              onShuffle={shuffle}
              onPick={pick}
              onAccept={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <CortexRoleStep
                plan={plan}
                role={activeRole}
                tutorialId={tutorialId}
                performerRef={performerRef}
                onRole={setRole}
                onTutorial={setTutorialId}
                onPerformer={setPerformerRef}
              />
              <button
                type="button"
                className={`${PRIMARY_PILL} self-end`}
                disabled={!activeRole}
                onClick={() => setStep(2)}
              >
                Next: Preview
              </button>
            </div>
          )}

          {step === 2 && builtDay && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex flex-col gap-2">
                  <span className={EYEBROW}>
                    {builtDay.deck?.slides.length} slides
                  </span>
                  <DeckPreview day={builtDay} />
                </div>
                <CortexOptions
                  value={options}
                  onChange={setOptions}
                  vibes={plan.vibes}
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => launch('save')}
                  className={OUTLINE_PILL}
                >
                  <Save className="h-4 w-4" />
                  Save to Plan
                </button>
                <button
                  type="button"
                  disabled={busy || !canEdit}
                  title={
                    canEdit ? undefined : 'Viewers cannot start a live session'
                  }
                  onClick={() => launch('live')}
                  className={PRIMARY_PILL}
                >
                  <Radio className="h-4 w-4" />
                  {busy ? 'Starting…' : 'Go Live'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Stepper = ({
  step,
  onStep,
  ready,
}: {
  step: number;
  onStep: (s: number) => void;
  ready: boolean;
}) => (
  <ol className="flex flex-wrap items-center gap-2">
    {STEPS.map((label, i) => {
      const reachable = ready && i <= step + 1;
      return (
        <li key={label} className="flex items-center gap-2">
          {i > 0 && <span className="h-px w-4 bg-white/15" />}
          <button
            type="button"
            disabled={!reachable && i !== step}
            aria-current={i === step ? 'step' : undefined}
            onClick={() => onStep(i)}
            className={`h-8 rounded-full px-3 text-sm transition-colors ${
              i === step
                ? 'bg-white text-[#101012]'
                : reachable
                  ? 'border border-white/15 bg-white/[0.04] text-[#e8e8f0] hover:bg-white/[0.08]'
                  : 'border border-white/[0.08] text-white/45'
            }`}
          >
            {i + 1}. {label}
          </button>
        </li>
      );
    })}
  </ol>
);
