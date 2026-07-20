/**
 * QuickActionsTile — five one-click affordances for the teacher's most
 * common intents. Each links into an existing surface; nothing new to
 * build behind them.
 */
import {
  CalendarDays,
  ClipboardList,
  Play,
  Send,
  UserPlus,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { InviteStudentDialog } from '../components/InviteStudentDialog';
import { DashboardTile } from './DashboardTile';

interface QuickActionsTileProps {
  classroomId: string;
  classroomCode: string | undefined;
}

export const QuickActionsTile = ({
  classroomId,
  classroomCode,
}: QuickActionsTileProps) => {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <DashboardTile
      title="Quick Actions"
      icon={<Zap className="h-3.5 w-3.5" />}
      colSpanMd={6}
    >
      <div className="flex flex-wrap gap-2">
        <Link
          to={TeacherRoutes.plan({ classroomId })}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/85"
        >
          <Play className="h-3.5 w-3.5" />
          Start Presentation
        </Link>
        <Link
          to={TeacherRoutes.plan({ classroomId })}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Plan Days
        </Link>
        <Link
          to={TeacherRoutes.assignments({ classroomId })}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Assignments
        </Link>
        {classroomCode && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite Student
          </button>
        )}
        <Link
          to={TeacherRoutes.students({ classroomId })}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          <Send className="h-3.5 w-3.5" />
          Manage Students
        </Link>
      </div>
      {classroomCode && (
        <InviteStudentDialog
          classroomId={classroomId}
          classroomCode={classroomCode}
          isOpen={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      )}
    </DashboardTile>
  );
};
