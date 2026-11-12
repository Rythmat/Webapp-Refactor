import { BarChart3, Check, ExternalLink, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { SERVER_GRADEBOOK_ENABLED } from '@/constants/serverEndpoints';
import { Button } from '@/daw/ui/Button';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useAssignmentProgress } from '@/features/classroom/assignments/useAssignmentProgress';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { PHASES } from '@/features/classroom/phases';
import { usePublishedDays } from '@/features/classroom/publish/usePublishedDays';
import type { Interaction } from '@/features/classroom/types';
import { Initial } from '../ui/StatusPill';
import { OFFICE_CARD } from '../ui/styles';
import { describeResponse } from './describeResponse';
import type { ReviewItem } from './reviewModel';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * One student's turned-in work, as SpeedGrader's middle pane: who and what,
 * then the work itself — their answers to the lesson's questions, the
 * project they made, or the instructions they marked done — and beside it
 * the review: mark it reviewed (and on to the next), with feedback to the
 * student shown as what the gradebook will add, not faked.
 */
export const SubmissionView = ({
  item,
  onMark,
  onUnmark,
  onNext,
}: {
  item: ReviewItem;
  onMark: () => void;
  onUnmark: () => void;
  /** Mark reviewed and open the next; absent at the end of the queue. */
  onNext?: () => void;
}) => {
  const { classroomId: cid, assignmentId: aid, enrollmentId: eid } = item;
  const { getAssignment } = useAssignments(cid);
  const { getResponsesByEnrollment } = useAssignmentProgress(cid, aid);
  const { getPublishedDay } = usePublishedDays(cid);
  const assignment = getAssignment(aid);

  const interactions: Interaction[] = [];
  const pd =
    assignment?.kind === 'day' && assignment.publishedDayId
      ? getPublishedDay(assignment.publishedDayId)
      : undefined;
  for (const phase of PHASES) {
    interactions.push(
      ...(pd?.snapshot.cells[phase]?.presentation?.interactions ?? []),
    );
  }
  const answers = getResponsesByEnrollment(aid)[eid] ?? {};
  const answered = interactions.filter((ix) => answers[ix.id]);
  // Answers whose question isn't in the snapshot (an older version).
  const loose = Object.entries(answers).filter(
    ([id]) => !interactions.some((ix) => ix.id === id),
  );
  const artifact = item.artifactRef;
  const previewIsImage =
    typeof artifact?.preview === 'string' &&
    /^(https?:|\/|data:image)/.test(artifact.preview);
  const nothing = !artifact && answered.length === 0 && loose.length === 0;

  return (
    <article
      aria-label={`${item.studentName}: ${item.assignmentTitle}`}
      className="flex flex-col gap-4"
    >
      <header
        className={cn(OFFICE_CARD, 'flex flex-wrap items-center gap-3 p-4')}
      >
        <Initial name={item.studentName} className="size-10 text-[1rem]" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-[1.125rem] font-semibold text-daw-text">
            {item.studentName}
          </h2>
          <MicroLabel className="truncate">
            {item.className} — {item.assignmentTitle}
          </MicroLabel>
          <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
            Turned in {when(item.turnedInAt)}
          </span>
        </div>
        <Button asChild size="lg" variant="ghost">
          <Link
            to={TeacherRoutes.assignmentProgress({
              classroomId: cid,
              assignmentId: aid,
            })}
          >
            <BarChart3 aria-hidden />
            <span className="max-sm:sr-only">Whole class</span>
          </Link>
        </Button>
      </header>

      <section
        aria-label="Their work"
        className={cn(OFFICE_CARD, 'flex flex-col gap-4 p-4')}
      >
        <MicroLabel>Their work</MicroLabel>

        {artifact && (
          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
            {previewIsImage && (
              <img
                src={artifact.preview as string}
                alt=""
                className="max-h-72 w-full rounded-lg object-contain"
              />
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.875rem] text-daw-text-2">
                Made in{' '}
                {artifact.module.charAt(0).toUpperCase() +
                  artifact.module.slice(1)}
              </span>
              <Button asChild size="lg">
                <Link to={artifact.deepLink}>
                  <ExternalLink aria-hidden />
                  Open their work
                </Link>
              </Button>
            </div>
          </div>
        )}

        {answered.length > 0 && (
          <ol className="flex flex-col gap-3">
            {answered.map((ix, i) => (
              <li key={ix.id} className="flex flex-col gap-1">
                <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
                  {i + 1}. {ix.question.en || 'Question'}
                </span>
                <span className="whitespace-pre-wrap text-[0.9375rem] text-daw-text">
                  {describeResponse(answers[ix.id], ix)}
                </span>
              </li>
            ))}
          </ol>
        )}
        {loose.map(([id, payload]) => (
          <p key={id} className="text-[0.9375rem] text-daw-text">
            {describeResponse(payload)}
          </p>
        ))}

        {assignment?.kind === 'instructions' && assignment.instructions && (
          <div className="flex flex-col gap-1">
            <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
              They were asked to
            </span>
            <p className="whitespace-pre-wrap text-[0.9375rem] text-daw-text-2">
              {assignment.instructions}
            </p>
          </div>
        )}

        {nothing && (
          <p className="text-[0.875rem] text-daw-text-3">
            They marked it done. Nothing was attached to look at here
            {assignment?.kind === 'day'
              ? ', and their answers were saved on their own device'
              : ''}
            .
          </p>
        )}
      </section>

      <section
        aria-label="Review"
        className={cn(OFFICE_CARD, 'flex flex-col gap-3 p-4')}
      >
        <MicroLabel>Feedback to {item.studentName.split(' ')[0]}</MicroLabel>
        <textarea
          disabled={!SERVER_GRADEBOOK_ENABLED}
          placeholder={
            SERVER_GRADEBOOK_ENABLED
              ? 'Write something they’ll see with their work'
              : 'Written and recorded feedback reaches students once the gradebook is on the server.'
          }
          className="min-h-20 w-full resize-y rounded-[var(--daw-radius-md)] border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.875rem] text-daw-text placeholder:text-daw-text-3 disabled:cursor-not-allowed disabled:opacity-70"
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {item.reviewed ? (
            <Button size="lg" onClick={onUnmark}>
              <RotateCcw aria-hidden />
              Back to the queue
            </Button>
          ) : (
            <>
              <Button size="lg" onClick={onMark}>
                <Check aria-hidden />
                Mark reviewed
              </Button>
              {onNext && (
                <Button variant="primary" size="lg" onClick={onNext}>
                  Reviewed — next
                </Button>
              )}
            </>
          )}
        </div>
      </section>
    </article>
  );
};
