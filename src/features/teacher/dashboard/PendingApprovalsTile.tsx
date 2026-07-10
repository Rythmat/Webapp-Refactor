import { UserPlus } from 'lucide-react';
import { TeacherRoutes } from '@/constants/routes';
import { useEnrollments } from '@/features/classroom/enrollments';
import { DashboardTile } from './DashboardTile';

interface PendingApprovalsTileProps {
  classroomId: string;
}

export const PendingApprovalsTile = ({
  classroomId,
}: PendingApprovalsTileProps) => {
  const { pending } = useEnrollments(classroomId);
  const count = pending.length;
  const accent = count > 0 ? 'amber' : 'default';

  return (
    <DashboardTile
      title="Pending Approvals"
      icon={<UserPlus className="h-3.5 w-3.5" />}
      accent={accent}
      footerLink={{
        to: TeacherRoutes.students({ classroomId }),
        label: 'Review roster',
      }}
    >
      <div className="flex items-baseline gap-2">
        <span
          className={`text-4xl font-medium ${
            count > 0 ? 'text-amber-100' : 'text-white/60'
          }`}
        >
          {count}
        </span>
        <span className="text-sm text-white/50">
          {count === 1 ? 'student waiting' : 'students waiting'}
        </span>
      </div>
      {count === 0 && (
        <p className="text-xs text-white/40">Everyone is approved.</p>
      )}
    </DashboardTile>
  );
};
