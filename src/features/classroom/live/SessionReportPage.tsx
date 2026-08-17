import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { InteractionResponseDashboard } from '../assignments/InteractionResponseDashboard';
import { useEnrollments } from '../enrollments';
import { PHASES } from '../phases';
import { usePublishedDays } from '../publish/usePublishedDays';
import type { Interaction, InteractionResponsePayload } from '../types';
import { buildSessionCoverage } from './buildSessionCoverage';
import { buildSessionCsv, downloadCsv } from './exportCsv';
import { useLiveResponses } from './useLiveResponses';
import { useLocalSessionStore } from './useLocalSessionStore';

const formatDuration = (startedAt: string, endedAt?: string): string => {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const start = new Date(startedAt).getTime();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export const SessionReportPage = () => {
  const { classroomId, sessionId } = useParams<{
    classroomId: string;
    sessionId: string;
  }>();
  const cid = classroomId ?? '';
  const sid = sessionId ?? '';

  const { getSession } = useLocalSessionStore();
  const session = getSession(sid);
  const { responsesByEnrollment, aggregate } = useLiveResponses(sid);
  const { getPublishedDay } = usePublishedDays(cid);
  const { active, getEnrollment } = useEnrollments(cid);

  const publishedDay = session?.publishedDayId
    ? getPublishedDay(session.publishedDayId)
    : undefined;

  const interactions = useMemo<Interaction[]>(() => {
    if (!publishedDay) return [];
    const flat: Interaction[] = [];
    for (const p of PHASES) {
      const cell = publishedDay.snapshot.cells[p];
      const ix = cell?.presentation?.interactions;
      if (Array.isArray(ix)) flat.push(...ix);
    }
    return flat;
  }, [publishedDay]);

  const aggregateRows = useMemo(
    () => aggregate(interactions, (id) => getEnrollment(id)?.displayName),
    [aggregate, interactions, getEnrollment],
  );

  const participants = useMemo(() => {
    const respondents = new Set(Object.keys(responsesByEnrollment));
    for (const e of active) respondents.add(e.id);
    return Array.from(respondents).sort();
  }, [responsesByEnrollment, active]);

  const artifacts = useMemo(() => {
    const out: Array<{
      enrollmentId: string;
      displayName: string;
      interactionId: string;
      activityRef: string;
      deepLink?: string;
      raw: unknown;
    }> = [];
    for (const [enrollmentId, bag] of Object.entries(responsesByEnrollment)) {
      for (const [interactionId, payload] of Object.entries(bag)) {
        if (payload.kind !== 'atlas') continue;
        const result = payload.result as {
          artifactRef?: { deepLink?: string };
        };
        out.push({
          enrollmentId,
          displayName: getEnrollment(enrollmentId)?.displayName ?? enrollmentId,
          interactionId,
          activityRef: payload.activityRef,
          deepLink: result?.artifactRef?.deepLink,
          raw: payload.result,
        });
      }
    }
    return out;
  }, [responsesByEnrollment, getEnrollment]);

  const coverage = useMemo(
    () =>
      buildSessionCoverage({
        deck: publishedDay?.snapshot.deck,
        interactions,
        responsesByEnrollment,
        participantCount: participants.length,
      }),
    [publishedDay, interactions, responsesByEnrollment, participants.length],
  );

  const publishedDayTitle = publishedDay?.snapshot.label ?? 'Untitled Day';

  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10 text-white">
        <p className="text-sm text-white/60">Session not found.</p>
        <Link
          to={TeacherRoutes.plan({ classroomId: cid })}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lessons
        </Link>
      </div>
    );
  }

  const handleDownload = () => {
    const csv = buildSessionCsv({
      session,
      publishedDayTitle,
      interactions,
      responsesByEnrollment,
      getDisplayName: (id) => getEnrollment(id)?.displayName,
    });
    downloadCsv(`session-${sid}.csv`, csv);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={TeacherRoutes.reports({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All reports
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={TeacherRoutes.projector({
              classroomId: cid,
              sessionId: sid,
            })}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Projector
          </Link>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-white/40">
          Session report
        </span>
        <h1 className="text-2xl font-medium md:text-3xl">
          {publishedDayTitle}
        </h1>
        <p className="text-xs text-white/50">
          {new Date(session.startedAt).toLocaleString()}
          {session.endedAt
            ? ` → ${new Date(session.endedAt).toLocaleString()}`
            : ' · still open'}
          {' · '}
          {formatDuration(session.startedAt, session.endedAt)}
          {' · '}
          {participants.length} participant(s)
        </p>
      </div>

      {coverage.items.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="text-base font-medium">Curriculum covered</h2>
          <div className="flex flex-wrap gap-2">
            {coverage.items.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80"
              >
                {item.label}
                {item.countable && (
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-[11px] ' +
                      (item.completedCount >= item.totalCount &&
                      item.totalCount > 0
                        ? 'bg-[#7ecfcf]/20 text-[#7ecfcf]'
                        : 'bg-white/[0.06] text-white/60')
                    }
                  >
                    {item.completedCount}/{item.totalCount}
                  </span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}

      <ParticipationMatrix
        participants={participants}
        interactions={interactions}
        responsesByEnrollment={responsesByEnrollment}
        getDisplayName={(id) => getEnrollment(id)?.displayName}
      />

      {artifacts.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="text-base font-medium">Atlas artifacts</h2>
          <ul className="flex flex-col divide-y divide-white/[0.06]">
            {artifacts.map((a) => (
              <li
                key={`${a.enrollmentId}-${a.interactionId}`}
                className="flex flex-wrap items-center justify-between gap-2 px-1 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="text-white/80">{a.displayName}</span>
                  <span className="text-xs text-white/50">{a.activityRef}</span>
                </div>
                {a.deepLink ? (
                  <a
                    href={a.deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-200 hover:text-emerald-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open artifact
                  </a>
                ) : (
                  <span className="text-xs text-white/40">no deep-link</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <InteractionResponseDashboard aggregate={aggregateRows} />
    </div>
  );
};

interface ParticipationMatrixProps {
  participants: string[];
  interactions: Interaction[];
  responsesByEnrollment: Record<
    string,
    Record<string, InteractionResponsePayload>
  >;
  getDisplayName: (id: string) => string | undefined;
}

const ParticipationMatrix = ({
  participants,
  interactions,
  responsesByEnrollment,
  getDisplayName,
}: ParticipationMatrixProps) => {
  if (participants.length === 0 || interactions.length === 0) {
    return (
      <p className="text-sm text-white/50">No participation to report yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <table className="min-w-full text-sm">
        <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/40">
          <tr>
            <th className="px-3 py-2 text-left">Student</th>
            {interactions.map((ix) => (
              <th key={ix.id} className="px-2 py-2 text-center">
                {ix.question.en}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((enrollmentId) => {
            const bag = responsesByEnrollment[enrollmentId] ?? {};
            return (
              <tr
                key={enrollmentId}
                className="border-t border-white/[0.06] text-white/80"
              >
                <td className="px-3 py-2">
                  {getDisplayName(enrollmentId) ?? enrollmentId}
                </td>
                {interactions.map((ix) => (
                  <td key={ix.id} className="px-2 py-2 text-center">
                    {bag[ix.id] ? (
                      <span className="text-emerald-300">✓</span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
