import { ArrowLeft, Download } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useEnrollments } from '../enrollments';
import { buildSessionCsv, downloadCsv } from '../live/exportCsv';
import { PHASES } from '../phases';
import { usePublishedDays } from '../publish/usePublishedDays';
import type { Interaction } from '../types';
import { InteractionResponseDashboard } from './InteractionResponseDashboard';
import { buildResponseAggregate } from './buildResponseAggregate';
import { useAssignmentProgress } from './useAssignmentProgress';
import { useAssignments } from './useAssignments';

const LOCAL_ENROLLMENT_ID = 'local-preview';

export const AssignmentProgressPage = () => {
  const { classroomId, assignmentId } = useParams<{
    classroomId: string;
    assignmentId: string;
  }>();
  const cid = classroomId ?? '';
  const aid = assignmentId ?? '';
  const navigate = useNavigate();

  const { getAssignment } = useAssignments(cid);
  const { listProgress, countResponses, getResponsesByEnrollment } =
    useAssignmentProgress(cid, aid);
  const { getPublishedDay } = usePublishedDays(cid);
  const { getEnrollment } = useEnrollments(cid);

  const assignment = getAssignment(aid);
  const rows = listProgress(aid);
  const responseCount = countResponses(aid);

  const interactions = useMemo<Interaction[]>(() => {
    if (
      !assignment ||
      assignment.kind !== 'day' ||
      !assignment.publishedDayId
    ) {
      return [];
    }
    const pd = getPublishedDay(assignment.publishedDayId);
    if (!pd) return [];
    const flat: Interaction[] = [];
    for (const phase of PHASES) {
      const cell = pd.snapshot.cells[phase];
      const ix = cell?.presentation?.interactions;
      if (Array.isArray(ix)) flat.push(...ix);
    }
    return flat;
  }, [assignment, getPublishedDay]);

  const responseMap = getResponsesByEnrollment(aid);
  const aggregate = useMemo(
    () =>
      buildResponseAggregate({
        responsesByEnrollment: responseMap,
        interactions,
        getDisplayName: (id) => getEnrollment(id)?.displayName,
      }),
    [responseMap, interactions, getEnrollment],
  );

  const handleDownload = () => {
    if (!assignment) return;
    const nowIso = new Date().toISOString();
    const csv = buildSessionCsv({
      session: {
        sessionId: `assignment-${assignment.id}`,
        classroomId: cid,
        startedAt: assignment.createdAt,
        endedAt: assignment.updatedAt ?? nowIso,
      },
      publishedDayTitle: assignment.title,
      interactions,
      responsesByEnrollment: responseMap,
      getDisplayName: (id) => getEnrollment(id)?.displayName,
    });
    downloadCsv(`assignment-${assignment.id}.csv`, csv);
  };

  if (!assignment) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10">
        <p className="text-sm text-white/60">Assignment not available.</p>
        <button
          type="button"
          onClick={() =>
            navigate(TeacherRoutes.assignments({ classroomId: cid }))
          }
          className="w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          Back to Assignments
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={TeacherRoutes.assignments({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignments
        </Link>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV
        </button>
      </header>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-white/40">
          Progress
        </span>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-medium text-white md:text-3xl">
            {assignment.title}
          </h1>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs uppercase tracking-wide text-white/60">
            {assignment.kind}
          </span>
        </div>
        <p className="text-xs text-white/40">
          {responseCount} interaction response(s)
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] text-left text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Artifact</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                  No student activity yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.enrollmentId}
                  className="border-t border-white/[0.06] text-white/80"
                >
                  <td className="px-4 py-3">
                    {row.enrollmentId === LOCAL_ENROLLMENT_ID
                      ? 'You (preview)'
                      : row.enrollmentId}
                  </td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {new Date(row.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/70">
                    {row.artifactRef ? (
                      <a
                        href={row.artifactRef.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white"
                      >
                        {row.artifactRef.module}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InteractionResponseDashboard aggregate={aggregate} />
    </div>
  );
};
