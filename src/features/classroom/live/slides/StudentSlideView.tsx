import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  STUDENT_REFLOW_QUERY,
  useMediaQuery,
} from '@/hooks/useIsNarrowViewport';
import type { DaySnapshot } from '../../publish/publishDay';
import { SlideRenderer } from '../../slides/SlideRenderer';
import {
  deckFromSnapshot,
  interactionsForSlide,
  slideAt,
} from '../../slides/deck';
import type {
  Interaction,
  InteractionResponsePayload,
  StudentLanguage,
} from '../../types';
import { StudioCollabAction } from '../StudioCollabAction';
import { InteractionInput } from '../interactions';
import { AppRouteLaunch } from '../interactions/AppRouteLaunch';
import type { SessionState } from '../sessionsStore';

interface StudentSlideViewProps {
  snapshot: DaySnapshot;
  state: SessionState;
  language: StudentLanguage;
  submissions: Record<string, InteractionResponsePayload>;
  onSubmit: (
    interactionId: string,
  ) => (payload: InteractionResponsePayload) => void;
  /** Real enrollment id (so responses key per student) + session id for MSP mint. */
  enrollmentId?: string;
  sessionId?: string;
  classroomId: string;
  /** Phase 4 — student-paced: the student's local index overrides the teacher nav. */
  slideIndexOverride?: number;
  onPrev?: () => void;
  onNext?: () => void;
  /** Whether the current slide is complete enough to advance (lock-until-complete). */
  canAdvance?: boolean;
}

/**
 * The student device surface for a deck session: renders the current slide
 * at `surface='student'`, mounting the existing InteractionInput family in
 * the input slot. Teacher-paced only in Phase 1 — the slide follows the
 * `nav` echo; between-slide states (waiting / watch-the-screen / done) are
 * handled by the slide components themselves.
 */
export const StudentSlideView = ({
  snapshot,
  state,
  language,
  submissions,
  onSubmit,
  enrollmentId,
  sessionId,
  classroomId,
  slideIndexOverride,
  onPrev,
  onNext,
  canAdvance = true,
}: StudentSlideViewProps) => {
  // Rule 11's reading column, chosen by width AND pointer — a touch device
  // cannot hit the scaled canvas's controls. See the hook.
  const narrow = useMediaQuery(STUDENT_REFLOW_QUERY);
  const reducedMotion = useReducedMotion();
  const deck = deckFromSnapshot(snapshot);
  const slideIndex = slideIndexOverride ?? state.slideIndex ?? -1;
  const slide = slideAt(deck, slideIndex);
  const paced = onPrev !== undefined || onNext !== undefined;
  const total = deck?.slides.length ?? 0;

  if (!slide) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <span className="text-lg font-medium text-white">
          You're in! · ¡Ya estás dentro!
        </span>
        <span className="text-sm text-white/55">
          Waiting for your teacher to start the slides · Esperando a tu maestro
        </span>
      </div>
    );
  }

  const interactions = interactionsForSlide(snapshot, slide);

  const inputSlot = (interaction: Interaction) => (
    <InteractionInput
      interaction={interaction}
      language={language}
      onSubmit={onSubmit(interaction.id)}
      submittedPayload={submissions[interaction.id] ?? null}
      disabled={state.status === 'ended'}
    />
  );

  const launchSlot = (interaction: Interaction) => (
    <AppRouteLaunch
      interaction={interaction}
      language={language}
      onSubmit={onSubmit(interaction.id)}
      submittedPayload={submissions[interaction.id] ?? null}
      disabled={state.status === 'ended'}
      enrollmentId={enrollmentId}
      sessionId={sessionId}
    />
  );

  const pairActionSlot =
    slide.kind === 'studio-collab' ? (
      <StudioCollabAction
        grouping={slide.grouping}
        pairs={state.pairs}
        myEnrollmentId={enrollmentId}
        classroomId={classroomId}
        language={language}
        disabled={state.status === 'ended'}
      />
    ) : undefined;

  return (
    <div
      className="mx-auto w-full"
      style={
        narrow
          ? undefined
          : {
              // The canvas is scaled to fit this box, so the box's size IS the
              // student's type size. Capping it at 768px (Rule 11's
              // BREAKPOINT, which is not a max width) pinned the fit scale at
              // 0.6 on a 1440px laptop and rendered a question at 12px.
              //
              // Take the width available, bounded by what the viewport can
              // show at 16:9 so the slide never runs off the bottom. 13rem is
              // the page chrome above and below it.
              maxWidth: 'min(100%, calc((100vh - 13rem) * 16 / 9))',
            }
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slide.id}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          // A zone-mode slide is a 1280x720 canvas fitted by `useStageScale`,
          // which measures its CONTAINER. This column had width but no height,
          // so the stage measured 0 tall and the slide rendered blank. The
          // aspect box gives it one, derived from the column's own width —
          // NOT from `100vw`, which is the viewport and so reserved a
          // laptop-height gap above a column a third that wide.
          // The reflow is a reading column of unknown height; only the fitted
          // stage needs an aspect box to measure against.
          className={narrow ? 'w-full' : 'w-full [aspect-ratio:16/9]'}
        >
          <SlideRenderer
            layoutMode={narrow ? 'reflow' : 'stage'}
            slide={slide}
            surface="student"
            language={language}
            interactions={interactions}
            slots={{
              input: inputSlot,
              launch: launchSlot,
              pairAction: pairActionSlot,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {paced && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={slideIndex <= 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back · Atrás
          </button>
          <span className="text-xs text-white/40">
            {slideIndex + 1} / {total}
          </span>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={onNext}
              disabled={!canAdvance || slideIndex >= total - 1}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next · Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
            {!canAdvance && slideIndex < total - 1 && (
              <span className="text-[11px] text-amber-300/80">
                Finish this to continue · Termina para continuar
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
