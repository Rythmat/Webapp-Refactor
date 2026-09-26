/**
 * ClassroomStudentsPage — the People tab of the classroom workspace.
 *
 * Two GC-style sections: Teachers (the classroom owner, plus an Invite Teachers
 * action that invites another Teacher User to co-teach this classroom — the
 * accepted-co-teacher membership lands once the backend contract ships) and
 * Students (the existing search + RosterTabs + invite flow). The class
 * title/header now lives in the workspace hero, so this page is header-free.
 */
import { Search, UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useCanManageClassroom,
  useClassroom,
  useClassroomRole,
} from '@/hooks/data';
import { ClassroomTeachersList } from './components/ClassroomTeachersList';
import { InviteStudentDialog } from './components/InviteStudentDialog';
import { InviteTeacherDialog } from './components/InviteTeacherDialog';
import { RosterTabs } from './components/RosterTabs';

export const ClassroomStudentsPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const { data: classroom } = useClassroom(classroomId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviteTeacherOpen, setIsInviteTeacherOpen] = useState(false);

  // Only the classroom OWNER may add or remove co-teachers — an editor can
  // change the curriculum, not the staff list.
  const { role, isResolved } = useClassroomRole(classroomId);
  // Server-backed, changes other people's access → fail CLOSED on an unknown
  // role. Only the owner may change the staff list; editors manage students.
  const isOwner = isResolved && role === 'owner';
  const canEdit = useCanManageClassroom(classroomId);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm uppercase tracking-wider text-white/60">
            Teachers
          </span>
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsInviteTeacherOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-medium text-black transition-colors hover:bg-white/85"
            >
              <Users className="h-4 w-4" />
              Invite Teachers
            </button>
          )}
        </div>
        {classroomId && (
          <ClassroomTeachersList
            classroomId={classroomId}
            canManageTeachers={isOwner}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm uppercase tracking-wider text-white/60">
            Students
          </span>
          <button
            type="button"
            onClick={() => setIsInviteDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base font-medium text-black transition-colors hover:bg-white/85"
          >
            <UserPlus className="h-4 w-4" />
            Invite Student
          </button>
        </div>

        {classroomId && (
          <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
            <div className="relative w-64 max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                className="w-full rounded-full border border-white/10 bg-white/[0.02] px-9 py-2 text-base text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
                placeholder="Search students…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <RosterTabs
              canEdit={canEdit}
              classroomId={classroomId}
              searchQuery={searchQuery}
            />
          </div>
        )}
      </section>

      {classroom?.code && classroomId && (
        <InviteStudentDialog
          classroomCode={classroom.code}
          classroomId={classroomId}
          isOpen={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
        />
      )}

      {isOwner && classroomId && (
        <InviteTeacherDialog
          classroomId={classroomId}
          classroomName={classroom?.name}
          isOpen={isInviteTeacherOpen}
          onOpenChange={setIsInviteTeacherOpen}
        />
      )}
    </div>
  );
};
