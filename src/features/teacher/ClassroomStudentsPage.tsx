import { Search, UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useClassroom } from '@/hooks/data';
import { InviteStudentDialog } from './components/InviteStudentDialog';
import { RosterTabs } from './components/RosterTabs';

export const ClassroomStudentsPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();

  const { data: classroom } = useClassroom(classroomId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 px-6 py-6 md:gap-10 md:px-10 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Users className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
            <h1 className="text-xl font-medium text-white md:text-2xl">
              Students
            </h1>
          </div>
          <p className="text-sm text-white/60">
            {classroom?.name
              ? `Roster for ${classroom.name}`
              : 'Manage students in your classroom'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsInviteDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
        >
          <UserPlus className="h-4 w-4" />
          Invite Student
        </button>
      </header>

      {classroomId && (
        <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium text-white">Class Roster</h2>
              <p className="text-xs text-white/50">
                {classroom?.name ? `Roster for ${classroom.name}` : ''}
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                className="w-full rounded-full border border-white/10 bg-white/[0.02] px-9 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
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
          </div>

          <RosterTabs classroomId={classroomId} searchQuery={searchQuery} />
        </div>
      )}

      {classroom?.code && classroomId && (
        <InviteStudentDialog
          classroomCode={classroom.code}
          classroomId={classroomId}
          isOpen={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
        />
      )}
    </div>
  );
};
