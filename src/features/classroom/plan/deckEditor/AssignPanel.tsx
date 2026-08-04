/**
 * AssignPanel — inline "assign to students" strip inside the lesson editor
 * (replaces the old AssignmentComposer modal). Assigning auto-publishes the
 * student-safe snapshot, then creates a `kind:'day'` assignment referencing it.
 * When already assigned it shows the due date, a progress link, and Unassign.
 * Every lesson assignment flows through here — no separate Classwork surface.
 */
import { Check, Send, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useAssignments } from '../../assignments/useAssignments';
import { usePublishedDays } from '../../publish/usePublishedDays';
import type { Day } from '../../types';

interface AssignPanelProps {
  classroomId: string;
  day: Day;
  onClose: () => void;
}

const formatDue = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const AssignPanel = ({
  classroomId,
  day,
  onClose,
}: AssignPanelProps) => {
  const { publishedDays, publishDayToClassroom } =
    usePublishedDays(classroomId);
  const { assignments, createAssignment, closeAssignment } =
    useAssignments(classroomId);

  const [dueLocal, setDueLocal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const published = publishedDays.find((pd) => pd.sourceRef === day.id);
  const assignment = published
    ? assignments.find(
        (a) => a.publishedDayId === published.id && a.status === 'open',
      )
    : undefined;

  const handleAssign = async () => {
    setBusy(true);
    setError(null);
    try {
      const pd = await publishDayToClassroom({ classroomId, day });
      await createAssignment({
        classroomId,
        title: day.label,
        kind: 'day',
        publishedDayId: pd.id,
        dueAt: dueLocal ? new Date(dueLocal).toISOString() : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assign failed');
    } finally {
      setBusy(false);
    }
  };

  const handleUnassign = async () => {
    if (!assignment) return;
    setBusy(true);
    setError(null);
    try {
      await closeAssignment(assignment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unassign failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-6 py-3">
      {assignment ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-200">
            <Check className="h-4 w-4" />
            Assigned to students
            {assignment.dueAt ? ` · due ${formatDue(assignment.dueAt)}` : ''}
          </span>
          <Link
            to={TeacherRoutes.assignmentProgress({
              classroomId,
              assignmentId: assignment.id,
            })}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            View progress
          </Link>
          <button
            type="button"
            onClick={handleUnassign}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-colors hover:border-rose-400/40 hover:text-rose-200 disabled:opacity-50"
          >
            Unassign
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-white/70">Assign to students</span>
          <label className="inline-flex items-center gap-2 text-sm text-white/60">
            Due
            <input
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-sm text-white [color-scheme:dark] focus:border-white/25 focus:outline-none"
            />
            <span className="text-xs text-white/40">(optional)</span>
          </label>
          <button
            type="button"
            onClick={handleAssign}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {busy ? 'Assigning…' : 'Assign to students'}
          </button>
        </>
      )}

      {error && (
        <span className="text-xs text-rose-300" role="alert">
          {error}
        </span>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close assign panel"
        className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
