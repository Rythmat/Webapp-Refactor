/**
 * RecentSessionsSection — Overview "Recent Sessions" block in the Home Dashboard
 * section style: an icon + title header with a right-aligned "All reports" pill,
 * over a list panel of the last few ended live sessions (arrow-chip rows).
 */
import { ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useLocalSessionStore } from '@/features/classroom/live/useLocalSessionStore';
import { SectionListRow } from './SectionListRow';

interface RecentSessionsSectionProps {
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

export const RecentSessionsSection = ({
  classroomId,
}: RecentSessionsSectionProps) => {
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
    <section
      aria-label="Recent Sessions"
      className="flex flex-col gap-4 md:gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <ClipboardCheck className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Recent Sessions
          </h2>
        </div>
        <Link
          to={TeacherRoutes.reports({ classroomId })}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          All reports
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        {ended.length === 0 ? (
          <p className="text-base text-white/50 md:text-lg">
            No ended sessions yet. Run a Live Session to see a report here.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.06]">
            {ended.map((s) => (
              <SectionListRow
                key={s.sessionId}
                to={TeacherRoutes.report({
                  classroomId,
                  sessionId: s.sessionId,
                })}
                title={formatWhen(s.endedAt ?? s.updatedAt)}
                meta={`${responsesForSession(s.sessionId)} responses`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
