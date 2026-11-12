import { ClipboardList, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import type { Assignment } from '@/features/classroom/assignments/assignmentsStore';
import { useClassAssignmentProgress } from '@/features/classroom/assignments/useAssignmentProgress';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { useEnrollments } from '@/features/classroom/enrollments';
import { useCanEditClassroom } from '@/hooks/data';
import {
  useOfficeInspector,
  withInspect,
} from '../../frame/useOfficeInspector';
import { ProgressBar } from '../../ui/ProgressBar';
import { StatusPill } from '../../ui/StatusPill';
import { OFFICE_CARD, OFFICE_PAGE, OFFICE_PAGE_TITLE } from '../../ui/styles';
import {
  GROUP_ORDER,
  GROUP_TITLE,
  assignmentGroup,
  formatDue,
  progressCounts,
  type AssignmentGroup,
} from '../assignmentState';
import { AssignmentSheet } from './AssignmentSheet';

const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[minmax(0,1fr)_11rem_6rem]';

/**
 * A class's Assignments (owner, 2026-11-09): what's past due, due this week,
 * later, undated and closed — each with how the class stands on it. An
 * assignment opens in the Inspector; New assignment opens a sheet.
 */
export const ClassAssignmentsPage = () => {
  const { classroomId: cid = '' } = useParams<{ classroomId: string }>();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { assignments, isLoading } = useAssignments(cid);
  const { listProgress } = useClassAssignmentProgress(
    cid,
    assignments.map((a) => a.id),
  );
  const { active } = useEnrollments(cid);
  const canEdit = useCanEditClassroom(cid);
  const { target } = useOfficeInspector();
  const [sheetOpen, setSheetOpen] = useState(false);

  const roster = useMemo(() => active.map((e) => e.id), [active]);
  const groups = useMemo(() => {
    const now = Date.now();
    const by = new Map<AssignmentGroup, Assignment[]>();
    for (const a of assignments) {
      const g = assignmentGroup(a, now);
      by.set(g, [...(by.get(g) ?? []), a]);
    }
    for (const list of by.values()) {
      list.sort(
        (a, b) =>
          (a.dueAt ?? '').localeCompare(b.dueAt ?? '') ||
          a.title.localeCompare(b.title),
      );
    }
    return GROUP_ORDER.filter((g) => by.has(g)).map((g) => ({
      id: g,
      entries: by.get(g) as Assignment[],
    }));
  }, [assignments]);
  const selected =
    target?.kind === 'assignment' && target.classroomId === cid
      ? target.id
      : null;
  const openCount = assignments.filter((a) => a.status === 'open').length;

  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <MicroLabel>{openCount} open</MicroLabel>
          <h1 className={OFFICE_PAGE_TITLE}>Assignments</h1>
        </div>
        <Button
          variant="primary"
          size="lg"
          disabled={!canEdit}
          title={canEdit ? undefined : 'Viewers cannot assign work'}
          onClick={() => setSheetOpen(true)}
        >
          <Plus aria-hidden />
          New assignment
        </Button>
      </header>

      {isLoading && assignments.length === 0 ? (
        <div aria-busy className={cn(OFFICE_CARD, 'h-40 animate-pulse')} />
      ) : assignments.length === 0 ? (
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            icon={<ClipboardList />}
            title="Nothing assigned yet"
            description="Assign a published lesson for students to work through on their own, or write instructions for practice at home."
            actions={
              canEdit && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setSheetOpen(true)}
                >
                  <Plus aria-hidden />
                  New assignment
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section
              key={group.id}
              aria-label={GROUP_TITLE[group.id]}
              className={cn(OFFICE_CARD, 'p-2')}
            >
              <header className="flex items-baseline gap-2 px-3 pb-2 pt-2">
                <h2
                  className={cn(
                    'text-[1rem] font-semibold',
                    group.id === 'overdue' ? 'text-rose-200' : 'text-daw-text',
                  )}
                >
                  {GROUP_TITLE[group.id]}
                </h2>
                <span className="text-[0.8125rem] tabular-nums text-daw-text-3">
                  {group.entries.length}
                </span>
              </header>
              <ul className="flex flex-col">
                {group.entries.map((a) => {
                  const counts = progressCounts(listProgress(a.id), roster);
                  return (
                    <li
                      key={a.id}
                      className={cn(
                        ROW_GRID,
                        'relative rounded-xl px-3 py-2.5',
                        TRANSITION,
                        selected === a.id
                          ? 'bg-white/[0.07]'
                          : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <Link
                        to={`${pathname}${withInspect(search, { kind: 'assignment', classroomId: cid, id: a.id })}`}
                        aria-current={selected === a.id ? 'true' : undefined}
                        className={cn(
                          'flex min-w-0 flex-col gap-0.5 rounded-md after:absolute after:inset-0 after:content-[""]',
                          FOCUS_RING,
                        )}
                      >
                        <span className="truncate text-[0.9375rem] font-medium text-daw-text">
                          {a.title}
                        </span>
                        <span className="truncate text-[0.8125rem] text-daw-text-3">
                          {a.kind === 'day'
                            ? 'Lesson'
                            : a.kind === 'instructions'
                              ? 'Instructions'
                              : 'Activity'}
                          {a.dueAt ? ` · Due ${formatDue(a.dueAt)}` : ''}
                        </span>
                      </Link>
                      <div className="flex flex-col gap-1.5 max-md:hidden">
                        <span className="text-[0.8125rem] tabular-nums text-daw-text-2">
                          {counts.total === 0
                            ? 'No students yet'
                            : `${counts.done} of ${counts.total} done`}
                        </span>
                        <ProgressBar counts={counts} />
                      </div>
                      <span className="relative z-10 flex justify-end">
                        {a.status === 'closed' ? (
                          <StatusPill>Closed</StatusPill>
                        ) : group.id === 'overdue' ? (
                          <StatusPill tone="danger">Past due</StatusPill>
                        ) : (
                          <StatusPill tone="success">Open</StatusPill>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AssignmentSheet
        classroomId={cid}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={(a) =>
          navigate(
            `${pathname}${withInspect(search, { kind: 'assignment', classroomId: cid, id: a.id })}`,
          )
        }
      />
    </div>
  );
};
