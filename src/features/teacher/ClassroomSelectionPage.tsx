import { GraduationCap, PlusCircle, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClassroomRoutes, TeacherRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useClassrooms } from '@/hooks/data';
import { CreateClassroomDialog } from './components/CreateClassroomDialog';

export const ClassroomSelectionPage = () => {
  const navigate = useNavigate();
  const { role } = useAuthContext();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: classrooms = [], isLoading } = useClassrooms();

  // Redirect if user is not a teacher.
  if (role !== 'teacher') {
    navigate(TeacherRoutes.root());
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-8 px-6 py-6 md:gap-12 md:px-10 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-medium leading-tight text-white md:text-5xl">
            Classrooms
          </h1>
          <p className="text-base text-white/60">
            Manage your classrooms, invite students, and open the projector.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
        >
          <PlusCircle className="h-4 w-4" />
          Create Classroom
        </button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
            >
              <div className="h-6 w-3/5 rounded-md bg-white/5" />
              <div className="h-4 w-2/5 rounded-md bg-white/5" />
              <div className="mt-3 h-16 rounded-md bg-white/5" />
              <div className="mt-2 h-9 w-full rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      ) : classrooms.length === 0 ? (
        <EmptyState onCreate={() => setIsCreateDialogOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-medium text-white md:text-xl">
                  {classroom.name}
                </h2>
                <p className="line-clamp-2 text-sm text-white/60">
                  {classroom.description || 'No description provided'}
                </p>
              </div>
              <div className="text-xs uppercase tracking-wide text-white/40">
                {classroom.studentCount ?? 0} students · {classroom.year}
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <Link
                  to={ClassroomRoutes.home({ classroomId: classroom.id })}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
                >
                  Enter Classroom
                </Link>
                <Link
                  to={TeacherRoutes.students({ classroomId: classroom.id })}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
                >
                  <Users className="h-4 w-4" />
                  View students
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateClassroomDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
};

interface EmptyStateProps {
  onCreate: () => void;
}

const EmptyState = ({ onCreate }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
    <GraduationCap className="h-16 w-16 text-white/40" />
    <h2 className="text-xl font-medium text-white">No Classrooms Yet</h2>
    <p className="max-w-md text-base text-white/60">
      You haven&apos;t created any classrooms yet. Start by creating your first
      classroom to begin managing your students.
    </p>
    <button
      type="button"
      onClick={onCreate}
      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
    >
      <PlusCircle className="h-4 w-4" />
      Create Your First Classroom
    </button>
  </div>
);
