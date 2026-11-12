import { ClipboardList, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { SERVER_GRADEBOOK_ENABLED } from '@/constants/serverEndpoints';
import { EmptyState } from '@/daw/ui/EmptyState';
import { FOCUS_RING } from '@/daw/ui/styles';
import { useClassAssignmentProgress } from '@/features/classroom/assignments/useAssignmentProgress';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { useEnrollments } from '@/features/classroom/enrollments';
import { useLocalSessionStore } from '@/features/classroom/live/useLocalSessionStore';
import { useOfficeInspector, withInspect } from '../frame/useOfficeInspector';
import { OFFICE_CARD, OFFICE_PAGE, OFFICE_PAGE_TITLE } from '../ui/styles';
import { buildProgressGrid, type CellState } from './progressModel';

const CELL: Record<CellState, { fill: string; label: string }> = {
  done: { fill: 'bg-emerald-400/75', label: 'Done' },
  started: { fill: 'bg-amber-300/60', label: 'Started' },
  'not-yet': { fill: 'bg-white/[0.07]', label: 'Not yet' },
  missed: { fill: 'bg-rose-400/40', label: 'Missed' },
};

const LEGEND: CellState[] = ['done', 'started', 'not-yet', 'missed'];

const shortDue = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'No date';

/**
 * A class's Progress (owner, 2026-11-09): every student against every
 * assignment as one map — done, started, not yet, or missed once it closed
 * or came due — with each student's totals and live sessions joined. A
 * student or an assignment opens in the Inspector. Scores, rubrics and
 * returned feedback arrive with the gradebook, and the page says so.
 */
export const ProgressPage = () => {
  const { classroomId: cid = '' } = useParams<{ classroomId: string }>();
  const { pathname, search } = useLocation();
  const { active, isLoading: rosterLoading } = useEnrollments(cid);
  const { assignments } = useAssignments(cid);
  const { listProgress } = useClassAssignmentProgress(
    cid,
    assignments.map((a) => a.id),
  );
  const { store } = useLocalSessionStore();
  const { target } = useOfficeInspector();

  const sessions = useMemo(
    () =>
      Object.values(store.sessions)
        .filter((s) => s.classroomId === cid && s.status === 'ended')
        .map((s) => Object.keys(store.responses[s.sessionId] ?? {})),
    [store, cid],
  );
  const grid = useMemo(
    () =>
      buildProgressGrid({
        students: active,
        assignments,
        progress: listProgress,
        sessions,
        now: Date.now(),
      }),
    [active, assignments, listProgress, sessions],
  );

  const href = (kind: 'student' | 'assignment', id: string) =>
    `${pathname}${withInspect(search, { kind, classroomId: cid, id })}`;
  const isOpen = (kind: 'student' | 'assignment', id: string) =>
    target?.kind === kind && target.classroomId === cid && target.id === id;

  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <MicroLabel>
            {grid.rows.length} students · {grid.columns.length} assignments
          </MicroLabel>
          <h1 className={OFFICE_PAGE_TITLE}>Progress</h1>
          {!SERVER_GRADEBOOK_ENABLED && (
            <p className="max-w-[62ch] text-[0.875rem] text-daw-text-3">
              Who has finished what. Scores, rubrics and feedback you return to
              students arrive with the gradebook.
            </p>
          )}
        </div>
        <ul aria-label="Key" className="flex flex-wrap items-center gap-3">
          {LEGEND.map((state) => (
            <li
              key={state}
              className="flex items-center gap-1.5 text-[0.8125rem] text-daw-text-2"
            >
              <span
                aria-hidden
                className={cn('size-3 rounded-[3px]', CELL[state].fill)}
              />
              {CELL[state].label}
            </li>
          ))}
        </ul>
      </header>

      {rosterLoading && grid.rows.length === 0 ? (
        <div aria-busy className={cn(OFFICE_CARD, 'h-56 animate-pulse')} />
      ) : grid.rows.length === 0 || grid.columns.length === 0 ? (
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            icon={grid.rows.length === 0 ? <Users /> : <ClipboardList />}
            title={
              grid.rows.length === 0
                ? 'No students yet'
                : 'Nothing assigned yet'
            }
            description={
              grid.rows.length === 0
                ? 'Once students join, their progress on every assignment shows here.'
                : 'Assign work and this fills in as students finish it.'
            }
          />
        </div>
      ) : (
        <div
          className={cn(
            OFFICE_CARD,
            'overflow-x-auto p-2 [scrollbar-width:thin]',
          )}
        >
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-44 bg-[#1b1b1e] px-3 pb-2 align-bottom"
                >
                  <MicroLabel>Student</MicroLabel>
                </th>
                {grid.columns.map((c) => (
                  <th key={c.id} scope="col" className="px-1 pb-2 align-bottom">
                    <Link
                      to={href('assignment', c.id)}
                      title={`${c.title} — ${c.done} of ${grid.rows.length} done`}
                      className={cn(
                        'flex w-[4.5rem] flex-col gap-0.5 rounded-md px-1 py-1 hover:bg-white/[0.05]',
                        isOpen('assignment', c.id) && 'bg-white/[0.08]',
                        FOCUS_RING,
                      )}
                    >
                      <span className="line-clamp-2 text-[0.75rem] font-medium leading-tight text-daw-text">
                        {c.title}
                      </span>
                      <span className="text-[0.6875rem] tabular-nums text-daw-text-3">
                        {c.closed ? 'Closed' : shortDue(c.dueAt)}
                      </span>
                    </Link>
                  </th>
                ))}
                <th scope="col" className="px-3 pb-2 text-right align-bottom">
                  <MicroLabel>Done</MicroLabel>
                </th>
                <th scope="col" className="px-3 pb-2 text-right align-bottom">
                  <MicroLabel>Missed</MicroLabel>
                </th>
                <th
                  scope="col"
                  className="px-3 pb-2 text-right align-bottom"
                  title="Live sessions they answered in"
                >
                  <MicroLabel>Live</MicroLabel>
                </th>
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((r) => (
                <tr key={r.enrollmentId} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-[#1b1b1e] px-1 py-0.5 font-normal"
                  >
                    <Link
                      to={href('student', r.enrollmentId)}
                      className={cn(
                        'block truncate rounded-md px-2 py-1.5 text-[0.875rem] text-daw-text hover:bg-white/[0.05]',
                        isOpen('student', r.enrollmentId) && 'bg-white/[0.08]',
                        FOCUS_RING,
                      )}
                    >
                      {r.name}
                    </Link>
                  </th>
                  {r.cells.map((state, i) => (
                    <td key={grid.columns[i].id} className="px-1 py-0.5">
                      <span
                        role="img"
                        aria-label={`${r.name}, ${grid.columns[i].title}: ${CELL[state].label}`}
                        title={`${grid.columns[i].title}: ${CELL[state].label}`}
                        className={cn(
                          'mx-auto block h-7 w-[4.5rem] rounded-md',
                          CELL[state].fill,
                        )}
                      />
                    </td>
                  ))}
                  <td className="px-3 text-right text-[0.875rem] tabular-nums text-daw-text">
                    {r.done}/{grid.columns.length}
                  </td>
                  <td
                    className={cn(
                      'px-3 text-right text-[0.875rem] tabular-nums',
                      r.missed ? 'text-rose-200' : 'text-daw-text-3',
                    )}
                  >
                    {r.missed}
                  </td>
                  <td className="px-3 text-right text-[0.875rem] tabular-nums text-daw-text-2">
                    {grid.sessionCount
                      ? `${r.sessions}/${grid.sessionCount}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
