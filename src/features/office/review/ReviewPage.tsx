import { Inbox } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { EmptyState } from '@/daw/ui/EmptyState';
import { Segmented } from '@/daw/ui/Segmented';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { useClassAssignmentProgress } from '@/features/classroom/assignments/useAssignmentProgress';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { useEnrollments } from '@/features/classroom/enrollments';
import { useMyClassrooms } from '@/hooks/data';
import { ClassCover } from '../ui/ClassCover';
import { OFFICE_CARD, OFFICE_PAGE, OFFICE_PAGE_TITLE } from '../ui/styles';
import { SubmissionView } from './SubmissionView';
import {
  buildReviewQueue,
  type ReviewItem,
  type ReviewSource,
} from './reviewModel';
import { useReviewedMarks } from './useReviewedMarks';

type Show = 'todo' | 'done' | 'all';

/** Reads one class's turned-in work through its own hooks. */
const ReviewProbe = memo(function ReviewProbe({
  classroomId,
  className,
  onSource,
}: {
  classroomId: string;
  className: string;
  onSource: (source: ReviewSource) => void;
}) {
  const { assignments } = useAssignments(classroomId);
  const { listProgress } = useClassAssignmentProgress(
    classroomId,
    assignments.map((a) => a.id),
  );
  const { enrollments } = useEnrollments(classroomId);
  const names = useMemo(
    () => Object.fromEntries(enrollments.map((e) => [e.id, e.displayName])),
    [enrollments],
  );
  useEffect(
    () =>
      onSource({
        classroomId,
        className,
        assignments: assignments.map(({ id, title, kind }) => ({
          id,
          title,
          kind,
        })),
        progress: listProgress,
        names,
      }),
    [classroomId, className, assignments, listProgress, names, onSource],
  );
  return null;
});

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
};

/**
 * Review (owner, 2026-11-09): every class's turned-in work in one queue, as
 * Canvas's SpeedGrader and Flat's Reviews tab do — the queue on the left,
 * the selected work on the right, "Reviewed — next" to move through it.
 * `?item=<cid>/<aid>/<eid>` holds the selection; reviewed marks are kept in
 * this browser until the gradebook is on the server.
 */
export const ReviewPage = () => {
  const { classrooms, isLoading } = useMyClassrooms();
  const [params, setParams] = useSearchParams();
  const { marks, mark, unmark } = useReviewedMarks();
  const [sources, setSources] = useState<Record<string, ReviewSource>>({});
  const [show, setShow] = useState<Show>('todo');
  const [classFilter, setClassFilter] = useState('all');

  const onSource = useCallback(
    (s: ReviewSource) =>
      setSources((prev) => ({ ...prev, [s.classroomId]: s })),
    [],
  );
  const queue = useMemo(
    () =>
      buildReviewQueue(
        classrooms.flatMap((c) => (sources[c.id] ? [sources[c.id]] : [])),
        marks,
      ),
    [classrooms, sources, marks],
  );
  const toReview = queue.filter((i) => !i.reviewed).length;
  const visible = queue.filter(
    (i) =>
      (classFilter === 'all' || i.classroomId === classFilter) &&
      (show === 'all' || (show === 'todo' ? !i.reviewed : i.reviewed)),
  );
  const selectedKey = params.get('item');
  const selected: ReviewItem | undefined =
    visible.find((i) => i.key === selectedKey) ??
    queue.find((i) => i.key === selectedKey) ??
    visible[0];

  const select = (key: string, reveal = false) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('item', key);
        return p;
      },
      { replace: true },
    );
    // Below `lg` the work sits under the queue: bring it into view.
    if (reveal && window.matchMedia?.('(max-width: 1023.98px)').matches) {
      requestAnimationFrame(() =>
        document.getElementById('review-work')?.scrollIntoView({
          block: 'start',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'auto'
            : 'smooth',
        }),
      );
    }
  };
  const nextAfter = (item: ReviewItem) => {
    const todo = visible.filter((i) => !i.reviewed && i.key !== item.key);
    const at = visible.findIndex((i) => i.key === item.key);
    return todo.find((i) => visible.indexOf(i) > at) ?? todo[0];
  };

  return (
    <div className={OFFICE_PAGE}>
      {classrooms.map((c) => (
        <ReviewProbe
          key={c.id}
          classroomId={c.id}
          className={c.name}
          onSource={onSource}
        />
      ))}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <MicroLabel>{toReview} to review</MicroLabel>
          <h1 className={OFFICE_PAGE_TITLE}>Review</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Show>
            label="Show"
            options={[
              { value: 'todo', label: 'To review' },
              { value: 'done', label: 'Reviewed' },
              { value: 'all', label: 'All' },
            ]}
            value={show}
            onValueChange={setShow}
          />
          {classrooms.length > 1 && (
            <Select
              label="Class"
              size="sm"
              value={classFilter}
              onValueChange={setClassFilter}
              options={[
                { value: 'all', label: 'All classes' },
                ...classrooms.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          )}
        </div>
      </header>

      {isLoading ? (
        <div aria-busy className={cn(OFFICE_CARD, 'h-64 animate-pulse')} />
      ) : visible.length === 0 ? (
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            icon={<Inbox />}
            title={
              show === 'done'
                ? 'Nothing reviewed yet'
                : queue.length === 0
                  ? 'No work turned in yet'
                  : 'You’re all caught up'
            }
            description={
              queue.length === 0
                ? 'When students finish an assignment, it lands here for you to look over.'
                : show === 'todo'
                  ? 'Everything turned in has been reviewed.'
                  : undefined
            }
          />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <nav
            aria-label="Work to review"
            className={cn(
              OFFICE_CARD,
              'flex flex-col p-1.5 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto',
            )}
          >
            <ul className="flex flex-col">
              {visible.map((item) => {
                const on = item.key === selected?.key;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      aria-current={on ? 'true' : undefined}
                      onClick={() => select(item.key, true)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left',
                        TRANSITION,
                        FOCUS_RING,
                        on ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <ClassCover
                        classroomId={item.classroomId}
                        className="size-8 rounded-lg"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[0.875rem] font-medium text-daw-text">
                          {item.studentName}
                        </span>
                        <span className="truncate text-[0.75rem] text-daw-text-3">
                          {item.assignmentTitle} · {item.className}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.75rem] tabular-nums text-daw-text-3">
                        {item.reviewed ? '✓' : ago(item.turnedInAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {selected && (
            <div id="review-work" className="scroll-mt-4">
              <SubmissionView
                key={selected.key}
                item={selected}
                onMark={() => mark(selected.key)}
                onUnmark={() => unmark(selected.key)}
                onNext={(() => {
                  const next = nextAfter(selected);
                  return next
                    ? () => {
                        mark(selected.key);
                        select(next.key);
                      }
                    : undefined;
                })()}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
