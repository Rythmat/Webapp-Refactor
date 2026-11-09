import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { usePublishedDays } from '../publish/usePublishedDays';
import { useLocalSessionStore } from './useLocalSessionStore';

export const SessionReportsListPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const { store } = useLocalSessionStore();
  const { getPublishedDay } = usePublishedDays(cid);

  const rows = useMemo(() => {
    const ended = Object.values(store.sessions).filter(
      (s) => s.classroomId === cid && s.status === 'ended',
    );
    ended.sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''));
    return ended.map((s) => ({
      session: s,
      title: getPublishedDay(s.publishedDayId)?.snapshot.label ?? 'Untitled',
      participants: Object.keys(store.responses[s.sessionId] ?? {}).length,
    }));
  }, [store.sessions, store.responses, cid, getPublishedDay]);

  return (
    <div className="mx-auto flex w-full max-w-[86rem] flex-col gap-8 px-4 py-6 md:px-8 md:py-8 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={TeacherRoutes.classroomDashboard({ classroomId: cid })}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] text-daw-text-3 hover:text-daw-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Overview
        </Link>
      </header>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[clamp(1.75rem,3.2vw,2.5rem)] font-normal leading-tight tracking-[-0.02em] text-daw-text">
            Session reports
          </h1>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/60">
            {rows.length}
          </span>
        </div>
        <p className="text-sm text-white/60">
          Ended sessions in this classroom. Click a row to see responses and
          download CSV.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-sm text-white/60">
            No ended sessions yet — start a session from Plan Days.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          {rows.map(({ session, title, participants }) => (
            <li
              key={session.sessionId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{title}</span>
                <span className="text-xs text-white/50">
                  Ended{' '}
                  {session.endedAt
                    ? new Date(session.endedAt).toLocaleString()
                    : 'unknown'}
                  {' · '}
                  {participants} participant(s)
                </span>
              </div>
              <Link
                to={TeacherRoutes.report({
                  classroomId: cid,
                  sessionId: session.sessionId,
                })}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
              >
                Open report
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
