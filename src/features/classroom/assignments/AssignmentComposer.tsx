import { X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { usePublishedDays } from '../publish/usePublishedDays';
import type { Assignment, AssignmentKind } from './assignmentsStore';
import { ASSIGNMENT_KIND_ENABLED, useAssignments } from './useAssignments';

export interface AssignmentComposerProps {
  classroomId: string;
  presetPublishedDayId?: string;
  onClose: () => void;
  onCreated?: (assignment: Assignment) => void;
}

export const AssignmentComposer = ({
  classroomId,
  presetPublishedDayId,
  onClose,
  onCreated,
}: AssignmentComposerProps) => {
  const { createAssignment } = useAssignments(classroomId);
  const { publishedDays } = usePublishedDays(classroomId);

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<AssignmentKind>(
    presetPublishedDayId ? 'day' : 'instructions',
  );
  const [publishedDayId, setPublishedDayId] = useState<string>(
    presetPublishedDayId ?? '',
  );
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (kind === 'day') return Boolean(publishedDayId);
    if (kind === 'instructions') return Boolean(instructions.trim());
    return false;
  }, [title, kind, publishedDayId, instructions]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const assignment = await createAssignment({
        classroomId,
        title,
        kind,
        publishedDayId: kind === 'day' ? publishedDayId : undefined,
        instructions: kind === 'instructions' ? instructions : undefined,
        dueAt: dueAt || undefined,
      });
      onCreated?.(assignment);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create assignment',
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create assignment"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-950 p-6 text-white"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-medium">New assignment</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-white/40">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Blues warm-up for Monday"
            className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs uppercase tracking-wide text-white/40">
            Kind
          </legend>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="radio"
              name="kind"
              checked={kind === 'day'}
              onChange={() => setKind('day')}
            />
            Published Day
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="radio"
              name="kind"
              checked={kind === 'instructions'}
              onChange={() => setKind('instructions')}
            />
            Instructions only
          </label>
          <label
            className="flex items-center gap-2 text-sm text-white/40"
            title="Atlas assignments arrive in a later sprint"
          >
            <input
              type="radio"
              name="kind"
              disabled={!ASSIGNMENT_KIND_ENABLED.atlas}
              checked={false}
              readOnly
            />
            Atlas activity (coming soon)
          </label>
        </fieldset>

        {kind === 'day' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-white/40">
              Published Day
            </span>
            <select
              value={publishedDayId}
              onChange={(e) => setPublishedDayId(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
            >
              <option value="">Select a published Day…</option>
              {publishedDays.map((pd) => (
                <option key={pd.id} value={pd.id}>
                  {pd.snapshot.label || 'Untitled Day'}
                </option>
              ))}
            </select>
            {publishedDays.length === 0 && (
              <span className="text-xs text-white/40">
                No published Days yet. Open a Day in the editor and press
                Publish.
              </span>
            )}
          </label>
        )}

        {kind === 'instructions' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-white/40">
              Instructions
            </span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="What should students do?"
              rows={4}
              className="resize-y rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-white/40">
            Due (optional)
          </span>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
          />
        </label>

        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:border-white/25 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:bg-white/40"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
};
