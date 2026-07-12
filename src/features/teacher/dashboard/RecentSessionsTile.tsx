import { ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useLocalSessionStore } from '@/features/classroom/live/useLocalSessionStore';
import { DashboardTile } from './DashboardTile';

interface RecentSessionsTileProps {
  classroomId: string;
}

const formatWhen = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (sameDay) return `Today · ${time}`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

export const RecentSessionsTile = ({
  classroomId,
}: RecentSessionsTileProps) => {
  const { store } = useLocalSessionStore();

  const ended = Object.values(store.sessions)
    .filter((s) => s.classroomId === classroomId && s.status === 'ended')
    .sort((a, b) => {
      const at = new Date(a.endedAt ?? a.updatedAt).getTime();
      const bt = new Date(b.endedAt ?? b.updatedAt).getTime();
      return bt - at;
    })
    .slice(0, 3);

  const responsesForSession = (sessionId: string): number =>
    Object.keys(store.responses[sessionId] ?? {}).length;

  return (
    <DashboardTile
      title="Recent Sessions"
      icon={<ClipboardCheck className="h-3.5 w-3.5" />}
      colSpanMd={6}
      footerLink={{
        to: TeacherRoutes.reports({ classroomId }),
        label: 'All reports',
      }}
    >
      {ended.length === 0 ? (
        <p className="text-xs text-white/40">
          No ended sessions yet. Run a Live Session to see a report here.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {ended.map((s) => (
            <li key={s.sessionId}>
              <Link
                to={TeacherRoutes.report({
                  classroomId,
                  sessionId: s.sessionId,
                })}
                className="flex items-center justify-between gap-2 text-sm text-white/80 transition-colors hover:text-white"
              >
                <span>{formatWhen(s.endedAt ?? s.updatedAt)}</span>
                <span className="shrink-0 text-[11px] text-white/50">
                  {responsesForSession(s.sessionId)} responses
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardTile>
  );
};
