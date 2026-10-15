import { useEffect } from 'react';
import { useStore } from '@/daw/store';
import { writeStudioCurrentProject } from '@/lib/studioCurrentProject';

/**
 * Keeps the "current Studio project" note up to date (see
 * `lib/studioCurrentProject.ts`): the classroom tab that opened this Studio in
 * a new tab reads it when the student offers their project to the class.
 * Written whenever the project's id, room or name changes, once the student
 * (`userId`, the editor's auth user) is known.
 */
export function useStudioCurrentProjectNote(userId: string | null): void {
  const projectId = useStore((s) => s.projectId);
  const roomId = useStore((s) => s.roomId);
  const name = useStore((s) => s.projectName);

  useEffect(() => {
    if (!userId) return;
    writeStudioCurrentProject(userId, { projectId, roomId, name });
  }, [userId, projectId, roomId, name]);
}
