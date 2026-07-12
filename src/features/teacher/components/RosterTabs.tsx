import { useMemo, useState } from 'react';
import {
  useEnrollments,
  type Enrollment,
  type EnrollmentStatus,
} from '@/features/classroom/enrollments';

export interface RosterTabsProps {
  classroomId: string;
  searchQuery: string;
}

type TabKey = EnrollmentStatus;

const TAB_ORDER: TabKey[] = ['pending', 'active', 'removed'];
const TAB_LABEL: Record<TabKey, string> = {
  pending: 'Pending',
  active: 'Active',
  removed: 'Removed',
};

const EMPTY_COPY: Record<TabKey, string> = {
  pending: 'No pending requests.',
  active: 'No students yet — share the join code to get started.',
  removed: 'No removed students.',
};

export const RosterTabs = ({ classroomId, searchQuery }: RosterTabsProps) => {
  const [tab, setTab] = useState<TabKey>('pending');
  const { enrollments, approve, deny, kick, reactivate, isLoading } =
    useEnrollments(classroomId);

  const counts = useMemo(
    () => ({
      pending: enrollments.filter((e) => e.status === 'pending').length,
      active: enrollments.filter((e) => e.status === 'active').length,
      removed: enrollments.filter((e) => e.status === 'removed').length,
    }),
    [enrollments],
  );

  const q = searchQuery.trim().toLowerCase();
  const forTab = enrollments.filter((e) => e.status === tab);
  const rows = q
    ? forTab.filter((e) => e.displayName.toLowerCase().includes(q))
    : forTab;

  const emptyMessage =
    forTab.length === 0
      ? EMPTY_COPY[tab]
      : q
        ? `No ${tab} students match "${searchQuery}" — clear search or try another tab.`
        : EMPTY_COPY[tab];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
        {TAB_ORDER.map((key) => {
          const isCurrent = key === tab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                isCurrent
                  ? 'inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black'
                  : 'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-white/70 hover:text-white'
              }
            >
              <span>{TAB_LABEL[key]}</span>
              <span
                className={
                  isCurrent
                    ? 'rounded-full bg-black/10 px-2 py-0.5 text-xs'
                    : 'rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/60'
                }
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-10 text-center text-sm text-white/60">
          {emptyMessage}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          {rows.map((row) => (
            <RosterRow
              key={row.id}
              enrollment={row}
              onApprove={() => approve(row.id).catch(() => {})}
              onDeny={() => deny(row.id).catch(() => {})}
              onKick={() => kick(row.id).catch(() => {})}
              onReactivate={() => reactivate(row.id).catch(() => {})}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

interface RosterRowProps {
  enrollment: Enrollment;
  onApprove: () => void;
  onDeny: () => void;
  onKick: () => void;
  onReactivate: () => void;
}

const RosterRow = ({
  enrollment,
  onApprove,
  onDeny,
  onKick,
  onReactivate,
}: RosterRowProps) => {
  const initial = enrollment.displayName.charAt(0).toUpperCase() || '·';
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm font-medium text-white/80">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">
          {enrollment.displayName}
        </div>
      </div>
      <span className="inline-flex flex-shrink-0 items-center rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-xs uppercase tracking-wide text-white/60">
        {enrollment.status}
      </span>
      <div className="flex flex-shrink-0 items-center gap-2">
        {enrollment.status === 'pending' && (
          <>
            <button
              type="button"
              onClick={onApprove}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-white/85"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={onDeny}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
            >
              Deny
            </button>
          </>
        )}
        {enrollment.status === 'active' && (
          <button
            type="button"
            onClick={onKick}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            Remove
          </button>
        )}
        {enrollment.status === 'removed' && (
          <button
            type="button"
            onClick={onReactivate}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-white/85"
          >
            Reactivate
          </button>
        )}
      </div>
    </li>
  );
};
