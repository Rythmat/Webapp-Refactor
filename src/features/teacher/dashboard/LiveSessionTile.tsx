/**
 * LiveSessionTile — glows emerald when a session is in flight so the
 * teacher can jump back in from anywhere; goes neutral otherwise.
 */
import { Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useLocalSessionStore } from '@/features/classroom/live/useLocalSessionStore';
import { DashboardTile } from './DashboardTile';

interface LiveSessionTileProps {
  classroomId: string;
}

const relativeMinutesSince = (iso: string): string => {
  const started = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(0, Math.floor((now - started) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
};

export const LiveSessionTile = ({ classroomId }: LiveSessionTileProps) => {
  const { getActiveSessionForClassroom } = useLocalSessionStore();
  const active = getActiveSessionForClassroom(classroomId);

  if (active) {
    return (
      <DashboardTile
        title="Live Session"
        icon={<Radio className="h-3.5 w-3.5 text-emerald-300" />}
        accent="emerald"
      >
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-2xl font-medium text-emerald-100">Live now</p>
            <p className="text-xs text-emerald-200/70">
              Started {relativeMinutesSince(active.startedAt)}
            </p>
          </div>
          <Link
            to={TeacherRoutes.session({
              classroomId,
              sessionId: active.sessionId,
            })}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/[0.10] px-3 py-1.5 text-sm text-emerald-100 transition-colors hover:border-emerald-400 hover:text-emerald-50"
          >
            Join teacher dashboard
          </Link>
        </div>
      </DashboardTile>
    );
  }

  return (
    <DashboardTile
      title="Live Session"
      icon={<Radio className="h-3.5 w-3.5" />}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-white/60">
          No session running. Start one from Plan Days to project a Day and
          collect responses in real time.
        </p>
        <Link
          to={TeacherRoutes.plan({ classroomId })}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          Go to Plan Days
        </Link>
      </div>
    </DashboardTile>
  );
};
