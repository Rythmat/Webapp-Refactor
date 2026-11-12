import { useMemo, useState } from 'react';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { Button } from '@/daw/ui/Button';
import { Sheet } from '@/daw/ui/DawDialog';
import { Segmented } from '@/daw/ui/Segmented';
import { Select } from '@/daw/ui/Select';
import { TYPE_CLASS } from '@/daw/ui/styles';
import type {
  Assignment,
  AssignmentKind,
} from '@/features/classroom/assignments/assignmentsStore';
import {
  ASSIGNMENT_KIND_ENABLED,
  useAssignments,
} from '@/features/classroom/assignments/useAssignments';
import { usePublishedDays } from '@/features/classroom/publish/usePublishedDays';

const FIELD =
  'w-full rounded-[var(--daw-radius-md)] border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.875rem] text-daw-text placeholder:text-daw-text-3 focus:border-white/25 focus:outline-none';

type Kind = Extract<AssignmentKind, 'day' | 'instructions'>;

/**
 * New assignment, in a sheet from the right (owner, 2026-11-09): a title,
 * then either a published lesson for students to work through on their own
 * or written instructions, and an optional due date. Atlas activities wait
 * on their backend and aren't offered.
 */
export const AssignmentSheet = ({
  classroomId,
  open,
  onOpenChange,
  onCreated,
}: {
  classroomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (assignment: Assignment) => void;
}) => {
  const { createAssignment } = useAssignments(classroomId);
  const { publishedDays } = usePublishedDays(classroomId);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Kind>(
    publishedDays.length > 0 ? 'day' : 'instructions',
  );
  const [publishedDayId, setPublishedDayId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    if (!title.trim() || busy) return false;
    return kind === 'day'
      ? Boolean(publishedDayId)
      : Boolean(instructions.trim());
  }, [title, kind, publishedDayId, instructions, busy]);

  const reset = () => {
    setTitle('');
    setPublishedDayId('');
    setInstructions('');
    setDueAt('');
    setError(null);
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const assignment = await createAssignment({
        classroomId,
        title: title.trim(),
        kind,
        publishedDayId: kind === 'day' ? publishedDayId : undefined,
        instructions: kind === 'instructions' ? instructions : undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });
      reset();
      onOpenChange(false);
      onCreated?.(assignment);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not create the assignment',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="New assignment"
      description="Students see it in their class and work through it on their own."
      footer={
        <>
          <Button size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            Assign
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void submit();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <MicroLabel>Title</MicroLabel>
          <input
            className={FIELD}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Blues warm-up for Monday"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <MicroLabel>What students do</MicroLabel>
          <Segmented<Kind>
            label="Assignment kind"
            options={[
              { value: 'day', label: 'A lesson' },
              { value: 'instructions', label: 'Instructions' },
            ]}
            value={kind}
            onValueChange={setKind}
          />
          {!ASSIGNMENT_KIND_ENABLED.atlas && (
            <p className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
              Atlas activities (a Globe stop, a Learn lesson) arrive later.
            </p>
          )}
        </div>

        {kind === 'day' ? (
          <div className="flex flex-col gap-1.5">
            <MicroLabel>Lesson</MicroLabel>
            {publishedDays.length === 0 ? (
              <p className={cn(TYPE_CLASS.body, 'text-daw-text-3')}>
                No published lessons yet. Go Live on a lesson, or publish it
                from the editor, and it can be assigned here.
              </p>
            ) : (
              <Select
                label="Lesson"
                placeholder="Choose a published lesson"
                value={publishedDayId || undefined}
                onValueChange={setPublishedDayId}
                options={publishedDays.map((pd) => ({
                  value: pd.id,
                  label: pd.snapshot.label || 'Untitled lesson',
                }))}
              />
            )}
          </div>
        ) : (
          <label className="flex flex-col gap-1.5">
            <MicroLabel>Instructions</MicroLabel>
            <textarea
              className={cn(FIELD, 'min-h-28 resize-y')}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="What should students do?"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <MicroLabel>Due (optional)</MicroLabel>
          <input
            type="datetime-local"
            className={cn(FIELD, '[color-scheme:dark]')}
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </label>

        {error && (
          <p role="alert" className="text-[0.875rem] text-rose-300">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
};
