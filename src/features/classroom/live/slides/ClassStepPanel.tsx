/**
 * The teacher's control for a Group Project the class does together (owner,
 * 2026-11-10): which step the class is on, ◀ ▶ to move everyone, and how
 * many have finished the step. "Open and lead" opens the activity in a tab
 * of the teacher's own that moves the class as the teacher moves through it.
 *
 * The step lives in the session (`state.activity`) and reaches every device;
 * who finished it is teacher-only (`activityDone`), so names stay here.
 */
import { ChevronLeft, ChevronRight, ExternalLink, Users } from 'lucide-react';
import { MicroLabel } from '@/components/kit';
import { getSong } from '@/curriculum/data/songs';
import { Button } from '@/daw/ui/Button';
import { IconButton } from '@/daw/ui/IconButton';
import { OFFICE_CARD } from '@/features/office/ui/styles';
import { appendFollowParams } from '../../follow/classFollow';
import { resolveActivityRefHref } from '../../slides/resolveContentHref';
import type { Interaction } from '../../types';
import type { ActivityDone, SessionActivity } from '../sessionsStore';

export const ClassStepPanel = ({
  sessionId,
  slideId,
  interaction,
  activity,
  done,
  rosterCount,
  onStep,
}: {
  sessionId: string;
  slideId: string;
  interaction: Interaction;
  /** The class's step, when it is on this slide's activity. */
  activity: SessionActivity | null | undefined;
  /** Who finished which step (teacher-only). */
  done: Record<string, ActivityDone>;
  rosterCount: number;
  onStep: (step: number) => void;
}) => {
  const atlas = interaction.atlas;
  if (!atlas) return null;
  const mine = activity?.slideId === slideId ? activity : undefined;
  const step = mine?.step ?? 0;
  const total = mine?.total;
  const finished = Object.values(done).filter(
    (d) => d.slideId === slideId && d.step >= step,
  ).length;
  const href = resolveActivityRefHref(atlas.module, atlas.activityRef, {
    getSong,
  });

  return (
    <section
      aria-label="The class's step"
      className={`${OFFICE_CARD} flex flex-col gap-3 p-4`}
    >
      <div className="flex items-center justify-between gap-2">
        <MicroLabel>Together · you set the pace</MicroLabel>
        <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-daw-text-3">
          <Users aria-hidden className="size-3.5" />
          {finished} of {rosterCount} done
        </span>
      </div>
      <div className="flex items-center gap-3">
        <IconButton
          label="Back a step"
          icon={<ChevronLeft aria-hidden />}
          variant="secondary"
          size="lg"
          disabled={step <= 0}
          onClick={() => onStep(step - 1)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[1.125rem] tabular-nums text-daw-text">
            Step {step + 1}
            {total ? ` of ${total}` : ''}
          </span>
          {mine?.title && (
            <span className="truncate text-[0.8125rem] text-daw-text-2">
              {mine.title}
            </span>
          )}
        </div>
        <IconButton
          label="Next step for the class"
          icon={<ChevronRight aria-hidden />}
          variant="primary"
          size="lg"
          disabled={total !== undefined && step >= total - 1}
          onClick={() => onStep(step + 1)}
        />
      </div>
      {href && (
        <Button asChild variant="secondary" className="w-fit">
          <a
            href={appendFollowParams(href, sessionId, true)}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden />
            Open and lead
          </a>
        </Button>
      )}
      <p className="text-[0.75rem] text-daw-text-3">
        Every student's tab moves to your step and can't run ahead.
      </p>
    </section>
  );
};
