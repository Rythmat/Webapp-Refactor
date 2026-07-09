/**
 * Live roster panel for the teacher-side dashboard. Shows N joined + a
 * per-enrollment dot indicating response status against the current phase's
 * interactions.
 *
 * Firewall: this file is only imported by TeacherSessionDashboard.tsx.
 * ProjectorPage never mounts it, so displayNames never reach the anonymized
 * overlay. buildProjectorView.test.ts continues to guard that path.
 */
import { ChevronDown, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useEnrollments, type Enrollment } from '../enrollments';
import type { Interaction, InteractionResponsePayload } from '../types';

type Status = 'none' | 'partial' | 'complete';

export interface RosterPanelProps {
  classroomId: string;
  currentInteractions: Interaction[];
  responsesByEnrollment: Record<
    string,
    Record<string, InteractionResponsePayload>
  >;
}

const statusFor = (
  responses: Record<string, InteractionResponsePayload> | undefined,
  interactions: Interaction[],
): Status => {
  if (interactions.length === 0) return 'none';
  if (!responses) return 'none';
  const answered = interactions.filter((i) => Boolean(responses[i.id])).length;
  if (answered === 0) return 'none';
  if (answered === interactions.length) return 'complete';
  return 'partial';
};

const dotColor: Record<Status, string> = {
  none: 'bg-white/20',
  partial: 'bg-amber-300',
  complete: 'bg-emerald-400',
};

export const RosterPanel = ({
  classroomId,
  currentInteractions,
  responsesByEnrollment,
}: RosterPanelProps) => {
  const { active } = useEnrollments(classroomId);
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const withStatus = active.map((e) => ({
      enrollment: e,
      status: statusFor(responsesByEnrollment[e.id], currentInteractions),
    }));
    const rank: Record<Status, number> = { complete: 0, partial: 1, none: 2 };
    withStatus.sort((a, b) => {
      const rd = rank[a.status] - rank[b.status];
      if (rd !== 0) return rd;
      return a.enrollment.displayName.localeCompare(b.enrollment.displayName);
    });
    return withStatus;
  }, [active, responsesByEnrollment, currentInteractions]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
      >
        <Users className="h-3.5 w-3.5" />
        {active.length} joined
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 flex w-72 flex-col gap-2 rounded-2xl border border-white/10 bg-neutral-950 p-3 text-white shadow-2xl">
          {rows.length === 0 ? (
            <p className="text-xs text-white/50">
              No students joined yet. Share the join code.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/[0.06]">
              {rows.map(({ enrollment, status }) => (
                <RosterRow
                  key={enrollment.id}
                  enrollment={enrollment}
                  status={status}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const RosterRow = ({
  enrollment,
  status,
}: {
  enrollment: Enrollment;
  status: Status;
}) => (
  <li className="flex items-center justify-between gap-3 py-2">
    <span className="truncate text-sm text-white/80">
      {enrollment.displayName}
    </span>
    <span
      aria-label={`Response ${status}`}
      className={`h-2 w-2 flex-shrink-0 rounded-full ${dotColor[status]}`}
    />
  </li>
);
