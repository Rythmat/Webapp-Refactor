import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClassroomRoutes } from '@/constants/routes';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useMe } from '@/hooks/data';
import { useUpdateActivityProgress } from '@/hooks/data/progress/useUpdateActivityProgress';
import { useEnrollments } from '../enrollments/useEnrollments';
import { usePublishedDays } from '../publish/usePublishedDays';
import {
  clampSlideIndex,
  deckFromSnapshot,
  findInteraction,
  slideAt,
} from '../slides/deck';
import type {
  Interaction,
  InteractionResponsePayload,
  LocalizedText,
  StudentLanguage,
} from '../types';
import { LockScreen } from './LockScreen';
import { InteractionInput } from './interactions';
import { isSlideComplete } from './slideGating';
import { buildSlideProgressPatch } from './slideProgressMirror';
import { StudentSlideView } from './slides/StudentSlideView';
import { TimerCountdown } from './slides/TimerCountdown';
import { useSessionSync } from './useSessionSync';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN + ES' },
];

// Phase 4 — per-student, per-session progress cache. `submissions` (answered-
// slide state) and `localIndex` (student-paced position) are otherwise in-
// memory only, so a mid-session refresh would reset answered slides and bounce
// a student-paced learner back to the teacher's slide (the server-side
// responses/positions stores aren't re-fetched per student on reconnect).
// sessionStorage survives a reload within the same tab and auto-clears on close.
const PROGRESS_STORAGE_PREFIX = 'ma-live:progress:v1';

interface StoredLiveProgress {
  submissions: Record<string, InteractionResponsePayload>;
  localIndex: number | null;
}

const readLiveProgress = (key: string): StoredLiveProgress | null => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLiveProgress;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Corrupt JSON or storage blocked (private mode) — fall back to in-memory.
  }
  return null;
};

const writeLiveProgress = (key: string, data: StoredLiveProgress): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota exceeded or storage blocked — non-fatal; state stays in-memory.
  }
};

export const LiveSessionPage = () => {
  const { classroomId, sessionId } = useParams<{
    classroomId: string;
    sessionId: string;
  }>();
  const cid = classroomId ?? '';
  const sid = sessionId ?? '';

  const { myEnrollment, isSuccess: enrollmentsSuccess } = useEnrollments(cid);
  // `progressKey` (below) needs `myEnrollment.id`, which resolves from TWO
  // independent async sources: the enrollments query AND the `me` query
  // (myEnrollment = accountId && data.find(...); accountId = me.id). Hydration
  // must not commit until BOTH have SUCCEEDED, or progressKey could still flip
  // null→non-null afterwards and lose the cache (see below). We key on success,
  // not merely "not loading": an errored `me` is `!isLoading` yet still yields
  // no accountId, so a later refetch-success could resurrect progressKey — and
  // gating on success lets that refetch restore the cache instead of stranding.
  const { isSuccess: meSuccess } = useMe();
  const { state, connectionStatus, sendResponse, sendPosition } =
    useSessionSync(sid, 'student', cid, myEnrollment?.id);
  const { getPublishedDay } = usePublishedDays(cid);
  const token = useAuthToken();
  const updateProgress = useUpdateActivityProgress();

  const [language, setLanguage] = useState<StudentLanguage>('en');
  const [submissions, setSubmissions] = useState<
    Record<string, InteractionResponsePayload>
  >({});
  // Phase 4 — student-paced local slide position (null until seeded).
  const [localIndex, setLocalIndex] = useState<number | null>(null);
  // Gate for the sessionStorage cache below — persist only AFTER rehydration so
  // the initial empty state can't clobber a refresh-recovered cache.
  const [progressHydrated, setProgressHydrated] = useState(false);
  const progressKey =
    sid && myEnrollment?.id
      ? `${PROGRESS_STORAGE_PREFIX}:${sid}:${myEnrollment.id}`
      : null;

  const publishedDay = state?.publishedDayId
    ? getPublishedDay(state.publishedDayId)
    : undefined;

  const currentInteractions: Interaction[] = useMemo(() => {
    if (!state || !publishedDay) return [];
    const cell = publishedDay.snapshot.cells[state.currentPhase];
    return cell?.presentation?.interactions ?? [];
  }, [state, publishedDay]);

  // Phase 4 — student-paced navigation. The student walks slides locally with
  // prev/next; interaction slides lock until answered (Kajabi pattern). Their
  // position is broadcast to the teacher (never the projector — Rule 2).
  const deck = deckFromSnapshot(publishedDay?.snapshot);
  const isStudentPaced = state?.mode === 'student_paced';
  const teacherIndex = state?.slideIndex ?? -1;
  const effectiveIndex =
    isStudentPaced && deck
      ? clampSlideIndex(deck, localIndex ?? Math.max(0, teacherIndex))
      : teacherIndex;
  const pacedSlide = deck ? slideAt(deck, effectiveIndex) : null;
  const canAdvance = pacedSlide
    ? isSlideComplete(pacedSlide, submissions)
    : true;

  // Rehydrate answered-slide + position state from sessionStorage once the
  // per-student key is settled. Merge so any answer made before the identity
  // resolved wins over the cache; only restore a position when none is set yet.
  //
  // Timing is load-bearing: `state` + `deck` load synchronously from the
  // localStorage mirror, but `progressKey` needs `myEnrollment.id`, which
  // resolves from BOTH the `me` and enrollments queries and settles LATER.
  // `identityReady` holds once the key is present (restore now) OR both
  // identity queries have SUCCEEDED without producing one (no enrollment for
  // this student — flip so seeding can proceed). Flipping any earlier would let
  // the seed effect set localIndex = teacherIndex during the pending window;
  // the `prev === null` restore guard would then discard the cached position —
  // and, worse, the persist effect would overwrite the good cache. If `me`
  // errors, neither disjunct holds, so we stay gated (nav still works via the
  // teacherIndex fallback in effectiveIndex/goNext) until a refetch succeeds.
  const identityReady =
    Boolean(progressKey) || (meSuccess && enrollmentsSuccess);
  useEffect(() => {
    if (progressHydrated || !identityReady) return;
    if (progressKey) {
      const stored = readLiveProgress(progressKey);
      if (stored?.submissions) {
        setSubmissions((prev) => ({ ...stored.submissions, ...prev }));
      }
      if (stored && typeof stored.localIndex === 'number') {
        const storedIdx = stored.localIndex;
        setLocalIndex((prev) => (prev === null ? storedIdx : prev));
      }
    }
    setProgressHydrated(true);
  }, [progressKey, progressHydrated, identityReady]);

  // Persist after hydration (never before — see progressHydrated gate).
  useEffect(() => {
    if (!progressKey || !progressHydrated) return;
    writeLiveProgress(progressKey, { submissions, localIndex });
  }, [progressKey, progressHydrated, submissions, localIndex]);

  // Seed the student-paced position from the teacher's slide — but only AFTER
  // hydration, so a refresh-restored localIndex is never pre-empted (the
  // restore only applies while localIndex is still null).
  useEffect(() => {
    if (!progressHydrated) return;
    if (isStudentPaced && deck && localIndex === null && teacherIndex >= 0) {
      setLocalIndex(teacherIndex);
    }
  }, [progressHydrated, isStudentPaced, deck, localIndex, teacherIndex]);

  useEffect(() => {
    if (!isStudentPaced || !deck || localIndex === null) return;
    sendPosition(clampSlideIndex(deck, localIndex));
  }, [isStudentPaced, deck, localIndex, sendPosition]);

  if (!state) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10 text-white">
        <p className="text-sm text-white/60">Session not found.</p>
        <Link
          to={ClassroomRoutes.home({ classroomId: cid })}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to classroom
        </Link>
      </div>
    );
  }

  if (state.locked) {
    return (
      <LockScreen
        classroom={{ id: cid, name: 'Classroom' }}
        teacherLabel="your teacher"
      />
    );
  }

  const cell = publishedDay?.snapshot.cells[state.currentPhase];
  const title = cell?.presentation?.title;
  const prompt = cell?.presentation?.prompt;

  const handleSubmit =
    (interactionId: string) => (payload: InteractionResponsePayload) => {
      setSubmissions((prev) => ({ ...prev, [interactionId]: payload }));
      sendResponse(interactionId, payload);

      // Phase 2 — mirror an app-route COMPLETION to the student's progress
      // ledger (fire-and-forget; token-gated so dev-bypass adds no noise). The
      // buildSlideProgressPatch gate returns null for the launch marker.
      const snapshotDeck = publishedDay?.snapshot.deck;
      if (snapshotDeck && token) {
        const interaction = findInteraction(
          publishedDay.snapshot,
          interactionId,
        );
        if (interaction) {
          const patch = buildSlideProgressPatch(
            snapshotDeck.id,
            interaction,
            payload,
          );
          if (patch) updateProgress.mutate(patch);
        }
      }
    };

  const goPrev = () =>
    setLocalIndex((i) => Math.max(0, (i ?? Math.max(0, teacherIndex)) - 1));
  const goNext = () => {
    if (!canAdvance || !deck) return;
    setLocalIndex((i) =>
      clampSlideIndex(deck, (i ?? Math.max(0, teacherIndex)) + 1),
    );
  };

  // Interactive-slides sessions render the deck surface; legacy Days keep
  // the phase-interaction list below unchanged. Guard on slides.length so an
  // empty deck (should never persist — publishDay drops it — but defensive
  // against a hand-crafted snapshot) falls through to the legacy surface
  // instead of stranding the student on the "waiting for slides" screen.
  if (
    publishedDay?.snapshot.deck &&
    publishedDay.snapshot.deck.slides.length > 0
  ) {
    return (
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 py-4 text-white md:gap-8 md:px-10 md:py-8">
        <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 bg-black/40 px-4 py-2 backdrop-blur md:mx-0 md:px-0">
          <Link
            to={ClassroomRoutes.home({ classroomId: cid })}
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            {state.timer && state.timer.slideId === pacedSlide?.id && (
              <TimerCountdown endsAt={state.timer.endsAt} />
            )}
            <ConnectionPill status={connectionStatus} />
            <SegmentedToggle
              label="Language"
              value={language}
              options={LANGUAGE_OPTIONS}
              onChange={setLanguage}
            />
          </div>
        </header>
        {state.status === 'ended' ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <span className="text-lg font-medium">
              Session ended — nice work! 🎶
            </span>
            <span className="text-sm text-white/55">
              Sesión terminada — ¡buen trabajo!
            </span>
          </div>
        ) : (
          <StudentSlideView
            snapshot={publishedDay.snapshot}
            state={state}
            language={language}
            submissions={submissions}
            onSubmit={handleSubmit}
            enrollmentId={myEnrollment?.id}
            sessionId={sid}
            classroomId={cid}
            slideIndexOverride={isStudentPaced ? effectiveIndex : undefined}
            onPrev={isStudentPaced ? goPrev : undefined}
            onNext={isStudentPaced ? goNext : undefined}
            canAdvance={canAdvance}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={ClassroomRoutes.home({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to classroom
        </Link>
        <div className="flex items-center gap-2">
          <ConnectionPill status={connectionStatus} />
          <SegmentedToggle
            label="Language"
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={setLanguage}
          />
        </div>
      </header>

      {state.status === 'ended' && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-white/70">
          Session ended.
        </div>
      )}

      {title && (
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-white/40">
            {state.currentPhase}
          </span>
          <h1 className="text-2xl font-medium md:text-3xl">
            <LocalizedRender text={title} language={language} />
          </h1>
          {prompt && (
            <p className="text-sm text-white/70">
              <LocalizedRender text={prompt} language={language} />
            </p>
          )}
        </div>
      )}

      {currentInteractions.length === 0 ? (
        <p className="text-sm text-white/50">
          No interactions on this phase yet. Follow along with your teacher.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {currentInteractions.map((interaction) => (
            <InteractionInput
              key={interaction.id}
              interaction={interaction}
              language={language}
              onSubmit={handleSubmit(interaction.id)}
              submittedPayload={submissions[interaction.id] ?? null}
              disabled={state.status === 'ended'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ConnectionPill = ({ status }: { status: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/60">
    <span
      className={
        'h-1.5 w-1.5 rounded-full ' +
        (status === 'connected'
          ? 'bg-emerald-400'
          : status === 'disconnected'
            ? 'bg-white/40'
            : 'bg-amber-400')
      }
    />
    {status}
  </span>
);

const LocalizedRender = ({
  text,
  language,
}: {
  text: LocalizedText;
  language: StudentLanguage;
}) => {
  if (language === 'both') {
    return (
      <>
        <span>{text.en}</span>
        {text.es ? <span className="text-white/60"> · {text.es}</span> : null}
      </>
    );
  }
  if (language === 'es') return <>{text.es ?? text.en}</>;
  return <>{text.en}</>;
};

interface SegmentedToggleProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

const SegmentedToggle = <T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedToggleProps<T>) => (
  <div
    role="group"
    aria-label={label}
    className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.02] p-0.5 text-xs"
  >
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={active}
          className={
            'rounded-full px-3 py-1 transition-colors ' +
            (active ? 'bg-white text-black' : 'text-white/60 hover:text-white')
          }
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
