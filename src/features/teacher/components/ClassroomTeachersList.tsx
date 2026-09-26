/**
 * The real Teachers list for the People tab: the owner plus every co-teacher,
 * each with a role badge, and — for the owner — controls to change a role or
 * remove someone.
 *
 * Replaces a single card synthesized from `useMe`, which showed the signed-in
 * teacher as "Owner" whether or not they were, and could never show a
 * co-teacher at all because nothing in the app had ever called
 * `GET /classrooms/:id/teachers`.
 */
import { Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useClassroomTeachers,
  useRemoveClassroomTeacher,
  useUpdateClassroomTeacherRole,
  type ClassroomTeacherRole,
} from '@/hooks/data';

interface ClassroomTeachersListProps {
  classroomId: string;
  /** Only the owner may change roles or remove co-teachers. */
  canManageTeachers: boolean;
}

const initialOf = (name?: string | null, email?: string | null): string =>
  (name?.trim()?.[0] ?? email?.trim()?.[0] ?? '?').toUpperCase();

const displayName = (t: {
  fullName?: string | null;
  nickname?: string | null;
  email?: string | null;
}): string => t.fullName?.trim() || t.nickname?.trim() || t.email || 'Teacher';

export const ClassroomTeachersList = ({
  classroomId,
  canManageTeachers,
}: ClassroomTeachersListProps) => {
  const { data, isLoading, isError } = useClassroomTeachers(classroomId);
  const updateRole = useUpdateClassroomTeacherRole();
  const removeTeacher = useRemoveClassroomTeacher();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/50 md:p-5">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading teachers…
      </div>
    );
  }

  // NO SILENT MOCKS: an unreadable list says so rather than rendering an empty
  // one that looks like "this class has no co-teachers".
  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-sm text-amber-200 md:p-5">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        Co-teachers could not be loaded, so this list may be incomplete.
      </div>
    );
  }

  const { owner, teachers } = data;

  return (
    <ul className="flex flex-col gap-2">
      <li className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 md:p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-base font-medium text-white">
          {initialOf(owner.fullName ?? owner.nickname, owner.email)}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-medium text-white">
            {displayName(owner)}
          </span>
          <span className="text-sm text-white/40">Owner</span>
        </div>
      </li>

      {teachers.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 md:p-5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-base font-medium text-white">
            {initialOf(t.fullName ?? t.nickname, t.email)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-medium text-white">
              {displayName(t)}
            </span>
            {t.email && (
              <span className="truncate text-sm text-white/40">{t.email}</span>
            )}
          </div>

          {canManageTeachers ? (
            <>
              <Select
                value={t.role}
                onValueChange={(role) =>
                  updateRole.mutate({
                    classroomId,
                    teacherId: t.teacherId,
                    role: role as ClassroomTeacherRole,
                  })
                }
              >
                <SelectTrigger
                  aria-label={`Role for ${displayName(t)}`}
                  className="w-[120px] shrink-0 border-white/10 bg-white/[0.02] text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                aria-label={`Remove ${displayName(t)}`}
                disabled={removeTeacher.isPending}
                onClick={() =>
                  removeTeacher.mutate({ classroomId, teacherId: t.teacherId })
                }
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-red-400/50 hover:text-red-200 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-white/60">
              {t.role}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};
