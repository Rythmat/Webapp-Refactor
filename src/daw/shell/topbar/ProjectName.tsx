import { memo, useCallback, useEffect, useState } from 'react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';

/**
 * The project's name, edited in place: Enter or a click away keeps it, an
 * empty name goes back to what it was. In a collab session only the host
 * renames the shared project. 140 px wide, 96 px when the top bar folds.
 */
export const ProjectName = memo(function ProjectName({
  narrow = false,
}: {
  narrow?: boolean;
}) {
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const canEdit = useStore(
    (s) => !s.isCollabActive || s.collabRole === 'owner',
  );
  // Local text, so the student can clear and type without the stored name
  // snapping back on every keystroke.
  const [text, setText] = useState(projectName);
  useEffect(() => setText(projectName), [projectName]);
  const commit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed) setProjectName(trimmed);
    setText(useStore.getState().projectName);
  }, [text, setProjectName]);

  return (
    <Tooltip
      content={canEdit ? 'Rename the project' : 'Only the host can rename it'}
      side="bottom"
    >
      <input
        type="text"
        aria-label="Project name"
        data-testid="project-name"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setText(useStore.getState().projectName);
            e.currentTarget.blur();
          }
        }}
        readOnly={!canEdit}
        spellCheck={false}
        className={cn(
          'h-8 shrink-0 truncate rounded-[var(--daw-radius-md)] border border-transparent bg-transparent px-2 text-daw-text',
          narrow ? 'w-24' : 'w-[140px]',
          canEdit
            ? 'hover:bg-daw-chip focus:border-daw-outline'
            : 'cursor-default',
          TYPE_CLASS.body,
          TRANSITION,
          FOCUS_RING,
        )}
      />
    </Tooltip>
  );
});
