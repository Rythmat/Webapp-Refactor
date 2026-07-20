import { Eye, GraduationCap, PlusCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { ClassroomRoutes } from '@/constants/routes';
import { useClassrooms, useMe } from '@/hooks/data';
import { JoinClassroomDialog } from './JoinClassroomDialog';

export const ClassroomPickerPage = () => {
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const {
    data: classrooms,
    isLoading: isClassroomsLoading,
    error: classroomsError,
  } = useClassrooms();
  const { data: me } = useMe();
  const isTeacherLike = me?.role === 'teacher' || me?.role === 'admin';

  const isLoading = isClassroomsLoading;
  const isError = classroomsError;
  const hasClassrooms = classrooms && classrooms.length > 0;
  const showEmptyState = !isLoading && !isError && !hasClassrooms;

  return (
    <>
      <ClassroomLayout
        isEmpty={false}
        isLoading={isLoading}
        isNotFound={!!isError}
      >
        {showEmptyState ? (
          <EmptyState
            onJoin={() => setIsJoinDialogOpen(true)}
            isTeacherLike={isTeacherLike}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classrooms?.map((classroom) => {
              const isOwner = Boolean(me?.id && classroom.teacherId === me.id);
              const to = isOwner
                ? `${ClassroomRoutes.home({ classroomId: classroom.id })}?viewAs=student`
                : ClassroomRoutes.home({ classroomId: classroom.id });
              return (
                <Link
                  key={classroom.id}
                  to={to}
                  className="group flex min-h-[200px] flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-medium text-white md:text-xl">
                      {classroom.name}
                    </h2>
                    {isOwner && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-emerald-400/40 bg-emerald-400/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
                        <Sparkles className="h-3 w-3" />
                        You manage this
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-3 flex-1 text-sm text-white/60">
                    {classroom.description || 'No description provided.'}
                  </p>
                  <span className="mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors group-hover:border-white/25 group-hover:text-white">
                    {isOwner && <Eye className="h-4 w-4" />}
                    {isOwner ? 'Preview as student' : 'View Classroom'}
                  </span>
                </Link>
              );
            })}

            {hasClassrooms && (
              <button
                type="button"
                onClick={() => setIsJoinDialogOpen(true)}
                className="group flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-transparent p-6 text-center transition-colors hover:border-white/40 hover:bg-white/[0.02]"
              >
                <PlusCircle className="h-6 w-6 text-white/50 group-hover:text-white/85" />
                <span className="text-base font-medium text-white/60 group-hover:text-white">
                  Join New Classroom
                </span>
              </button>
            )}
          </div>
        )}
      </ClassroomLayout>

      <JoinClassroomDialog
        open={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
      />
    </>
  );
};

interface EmptyStateProps {
  onJoin: () => void;
  isTeacherLike: boolean;
}

const EmptyState = ({ onJoin, isTeacherLike }: EmptyStateProps) => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
    <GraduationCap className="h-16 w-16 text-white/40" />
    <h2 className="text-xl font-medium text-white">No classrooms yet</h2>
    <p className="text-base text-white/60">
      {isTeacherLike
        ? "You haven't joined any classrooms yet. Use a colleague's join code to preview — or create your own classroom from Manage."
        : 'Join your first classroom using the code from your teacher.'}
    </p>
    <button
      type="button"
      onClick={onJoin}
      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
    >
      <PlusCircle className="h-4 w-4" />
      Join Classroom
    </button>
  </div>
);
