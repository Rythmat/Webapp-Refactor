import { Users } from 'lucide-react';
import { TeacherRoutes } from '@/constants/routes';
import { useEnrollments } from '@/features/classroom/enrollments';
import { DashboardTile } from './DashboardTile';

interface RosterSnapshotTileProps {
  classroomId: string;
}

const initialsFor = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
};

export const RosterSnapshotTile = ({
  classroomId,
}: RosterSnapshotTileProps) => {
  const { active } = useEnrollments(classroomId);
  const count = active.length;
  const visible = active.slice(0, 6);
  const remaining = Math.max(0, count - visible.length);

  return (
    <DashboardTile
      title="Roster"
      icon={<Users className="h-3.5 w-3.5" />}
      footerLink={{
        to: TeacherRoutes.students({ classroomId }),
        label: 'Full roster',
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-medium text-white">{count}</span>
        <span className="text-sm text-white/50">active students</span>
      </div>
      {visible.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {visible.map((e) => (
            <span
              key={e.id}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-medium text-white/80"
              title={e.displayName}
            >
              {initialsFor(e.displayName)}
            </span>
          ))}
          {remaining > 0 && (
            <span className="ml-1 text-xs text-white/40">
              +{remaining} more
            </span>
          )}
        </div>
      )}
      {count === 0 && (
        <p className="text-xs text-white/40">No active students yet.</p>
      )}
    </DashboardTile>
  );
};
