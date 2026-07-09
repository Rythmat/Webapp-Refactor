import {
  Copy,
  GraduationCap,
  Pencil,
  PlusCircle,
  Share2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ClassroomRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useClassrooms, useMe } from '@/hooks/data';
import { CreateClassroomDialog } from './components/CreateClassroomDialog';
import { DeleteClassroomDialog } from './components/DeleteClassroomDialog';
import { EditClassroomDialog } from './components/EditClassroomDialog';
import { InviteStudentDialog } from './components/InviteStudentDialog';

interface ShareTarget {
  classroomId: string;
  classroomCode: string;
}

interface EditTarget {
  id: string;
  name: string;
  description?: string | null;
}

interface DeleteTarget {
  id: string;
  name: string;
}

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.success(`Copied join code ${code}`);
  } catch {
    toast.error('Could not copy — clipboard blocked');
  }
};

export const ClassroomSelectionPage = () => {
  const navigate = useNavigate();
  const { role } = useAuthContext();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const { data: allClassrooms = [], isLoading } = useClassrooms();
  const { data: me } = useMe();
  const ownedClassrooms = me?.id
    ? allClassrooms.filter((c) => c.teacherId === me.id)
    : allClassrooms;

  // Bounce non-teachers to the student picker rather than back to /teacher.
  if (role !== 'teacher' && role !== 'admin') {
    navigate(ClassroomRoutes.picker());
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
      ) : ownedClassrooms.length === 0 ? (
        <EmptyState onCreate={() => setIsCreateDialogOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ownedClassrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 className="truncate text-lg font-medium text-white md:text-xl">
                    {classroom.name}
                  </h2>
                  <p className="line-clamp-2 text-sm text-white/60">
                    {classroom.description || 'No description provided'}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditTarget({
                        id: classroom.id,
                        name: classroom.name,
                        description: classroom.description,
                      })
                    }
                    aria-label={`Edit ${classroom.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        id: classroom.id,
                        name: classroom.name,
                      })
                    }
                    aria-label={`Delete ${classroom.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs uppercase tracking-wide text-white/40">
                {classroom.studentCount ?? 0} students · {classroom.year}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-white/40">
                  Code
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(classroom.code)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 font-mono text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
                  title="Copy join code"
                >
                  {classroom.code}
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <Link
                  to={ClassroomRoutes.home({ classroomId: classroom.id })}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
                >
                  Enter Classroom
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    setShareTarget({
                      classroomId: classroom.id,
                      classroomCode: classroom.code,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateClassroomDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(created) =>
          setShareTarget({
            classroomId: created.id,
            classroomCode: created.code,
          })
        }
      />

      {shareTarget && (
        <InviteStudentDialog
          classroomId={shareTarget.classroomId}
          classroomCode={shareTarget.classroomCode}
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) setShareTarget(null);
          }}
        />
      )}

      <EditClassroomDialog
        classroom={editTarget}
        isOpen={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      <DeleteClassroomDialog
        classroom={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
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
    <h2 className="text-xl font-medium text-white">
      You don&apos;t own any classrooms yet
    </h2>
    <p className="max-w-md text-base text-white/60">
      Create your first classroom to invite students and start managing.
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
