import {
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { IconButton } from '@/daw/ui/IconButton';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { FOCUS_RING } from '@/daw/ui/styles';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import { CreateClassroomDialog } from '@/features/teacher/components/CreateClassroomDialog';
import { DeleteClassroomDialog } from '@/features/teacher/components/DeleteClassroomDialog';
import { EditClassroomDialog } from '@/features/teacher/components/EditClassroomDialog';
import { InviteStudentDialog } from '@/features/teacher/components/InviteStudentDialog';
import { useMyClassrooms } from '@/hooks/data';
import { isoDay, relativeDay } from '../today/todayModel';
import { ClassCover } from '../ui/ClassCover';
import { OFFICE_PAGE, OFFICE_PAGE_TITLE } from '../ui/styles';
import { useOnClassCreated } from './useOnClassCreated';

type Classroom = ReturnType<typeof useMyClassrooms>['classrooms'][number];

const GRID =
  'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))]';

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.success(`Copied join code ${code}`);
  } catch {
    toast.error('Could not copy — clipboard blocked');
  }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The class's next dated lesson, read from the plan on this device. */
const useNextLesson = (classroomId: string) => {
  const { listDays } = useLocalPlan(classroomId);
  const todayIso = isoDay(new Date());
  const next = listDays(classroomId)
    .filter((d) => (d.scheduledDate ?? '') >= todayIso)
    .sort((a, b) =>
      (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''),
    )[0];
  return next
    ? `Next: ${capitalize(relativeDay(next.scheduledDate as string, todayIso))}`
    : 'Nothing scheduled';
};

const ClassCard = ({
  classroom,
  onEdit,
  onShare,
  onDelete,
}: {
  classroom: Classroom;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}) => {
  const next = useNextLesson(classroom.id);
  const to = TeacherRoutes.classroomDashboard({ classroomId: classroom.id });
  const students = classroom.studentCount ?? 0;
  return (
    <li className="group relative flex flex-col gap-2.5">
      <Link
        to={to}
        className={cn('rounded-2xl', FOCUS_RING)}
        aria-label={classroom.name}
      >
        <div className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
          <ClassCover
            classroomId={classroom.id}
            className="w-full rounded-2xl"
          />
        </div>
      </Link>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <Menu>
          <MenuTrigger asChild>
            <IconButton
              label={`${classroom.name}: more`}
              icon={<MoreHorizontal />}
              variant="secondary"
              className="bg-black/45 backdrop-blur-md"
            />
          </MenuTrigger>
          <MenuContent align="end" sideOffset={6} className="w-52">
            <MenuItem icon={<Share2 />} onSelect={onShare}>
              Invite students
            </MenuItem>
            <MenuItem
              icon={<Copy />}
              onSelect={() => void copyCode(classroom.code)}
            >
              Copy join code
            </MenuItem>
            <MenuItem icon={<Pencil />} onSelect={onEdit}>
              Edit details
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash2 />} danger onSelect={onDelete}>
              Delete class
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <Link to={to} className="flex min-w-0 flex-col gap-0.5 px-0.5">
        <span className="truncate text-[0.9375rem] font-medium text-daw-text">
          {classroom.name}
        </span>
        <span className="truncate text-[0.8125rem] text-daw-text-3">
          {students} {students === 1 ? 'student' : 'students'} · {next}
        </span>
      </Link>
    </li>
  );
};

/**
 * Classes — every class the teacher runs, as covers on a grid (owner,
 * 2026-11-09). New class comes first; each card's ⋯ invites, copies the
 * join code, edits or deletes. `?new=1` opens New class (from ⌘K and Today).
 */
export const ClassesPage = () => {
  const { classrooms, isLoading, coTaughtAvailable } = useMyClassrooms();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [share, setShare] = useState<Classroom | null>(null);
  const [edit, setEdit] = useState<Classroom | null>(null);
  const [remove, setRemove] = useState<Classroom | null>(null);
  const onCreated = useOnClassCreated();

  useEffect(() => {
    if (params.get('new') !== '1') return;
    setCreateOpen(true);
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const sorted = useMemo(
    () => [...classrooms].sort((a, b) => a.name.localeCompare(b.name)),
    [classrooms],
  );

  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-col gap-1.5">
        <MicroLabel>
          {isLoading
            ? 'Loading'
            : `${classrooms.length} ${classrooms.length === 1 ? 'class' : 'classes'}`}
        </MicroLabel>
        <h1 className={OFFICE_PAGE_TITLE}>Classes</h1>
      </header>

      <ul className={GRID}>
        <li className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={cn(
              'flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-daw-text-2 transition-colors hover:border-white/30 hover:bg-white/[0.03] hover:text-daw-text',
              FOCUS_RING,
            )}
          >
            <Plus aria-hidden className="size-7" strokeWidth={1.5} />
            <span className="text-[0.875rem] font-medium">New class</span>
          </button>
        </li>
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} aria-hidden className="flex flex-col gap-2.5">
                <div className="aspect-square animate-pulse rounded-2xl bg-white/[0.04]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.04]" />
              </li>
            ))
          : sorted.map((c) => (
              <ClassCard
                key={c.id}
                classroom={c}
                onEdit={() => setEdit(c)}
                onShare={() => setShare(c)}
                onDelete={() => setRemove(c)}
              />
            ))}
      </ul>

      {!coTaughtAvailable && !isLoading && (
        <p className="text-[0.8125rem] text-daw-text-3">
          Classes you co-teach will appear here once co-teaching sync arrives.
        </p>
      )}

      <CreateClassroomDialog
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onCreated}
      />
      {share && (
        <InviteStudentDialog
          classroomId={share.id}
          classroomCode={share.code}
          isOpen
          onOpenChange={(open) => {
            if (!open) setShare(null);
          }}
        />
      )}
      <EditClassroomDialog
        classroom={edit}
        isOpen={Boolean(edit)}
        onOpenChange={(open) => {
          if (!open) setEdit(null);
        }}
      />
      <DeleteClassroomDialog
        classroom={remove}
        isOpen={Boolean(remove)}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
      />
    </div>
  );
};
