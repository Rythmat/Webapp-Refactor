/**
 * ClassSelector — the class switcher + creator in the teacher tab bar. Reuses
 * the Home page InstrumentSelector's dropdown pattern (Radix DropdownMenu + a
 * chevron trigger that flips on open): the trigger shows the current class
 * (GraduationCap + name), the menu lists every classroom the teacher owns
 * (selecting one jumps to its Overview), and a "Create new class" action opens
 * the shared CreateClassroomDialog and navigates to the new class on success.
 */
import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  GraduationCap,
  LayoutGrid,
  PlusCircle,
} from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';
import { useClassroom, useClassrooms, useMyClassrooms } from '@/hooks/data';
import { CreateClassroomDialog } from '../components/CreateClassroomDialog';

interface ClassSelectorProps {
  classroomId: string;
}

export const ClassSelector = ({ classroomId }: ClassSelectorProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: classroom } = useClassroom(classroomId);
  const { data: allClassrooms = [] } = useClassrooms();
  const [createOpen, setCreateOpen] = useState(false);

  // Seed the classrooms cache with a freshly-created class, then navigate to it.
  // useCreateClassroom invalidates ['classrooms'], but that refetch is async —
  // without this optimistic add the new class's ownership guard runs against the
  // stale list and bounces back to the classroom picker.
  const handleCreated = (
    created: Parameters<
      NonNullable<ComponentProps<typeof CreateClassroomDialog>['onCreated']>
    >[0],
  ) => {
    // `['classrooms']` is a PREFIX match, and two different shapes live under
    // it: `useClassrooms` caches an ARRAY at ['classrooms', params] while
    // `useClassroom` caches a single OBJECT at ['classrooms', classroomId].
    // Spreading the object threw "old is not iterable", so creating a class
    // while any classroom detail was cached crashed this handler. Only the
    // list shape is updated.
    queryClient.setQueriesData<typeof allClassrooms>(
      { queryKey: ['classrooms'] },
      (old) =>
        Array.isArray(old)
          ? [
              ...old,
              {
                ...created,
                studentCount: 0,
                closedAt: null,
              } as (typeof allClassrooms)[number],
            ]
          : old,
    );
    navigate(TeacherRoutes.classroomDashboard({ classroomId: created.id }));
  };

  // `allClassrooms` above is still needed for the optimistic cache write; only
  // the ownership filter moves to the role hook.
  const { classrooms: owned } = useMyClassrooms();
  const currentName = classroom?.name ?? 'Classroom';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Select classroom"
          className="group -ml-2 flex items-center gap-2 rounded-lg px-2 py-1 text-white/85 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40 md:gap-3"
        >
          <GraduationCap
            className="h-8 w-8 text-white/85 md:h-10 md:w-10"
            strokeWidth={1.5}
          />
          <span className="text-xl font-medium text-white md:text-2xl">
            {currentName}
          </span>
          <ChevronDown className="h-5 w-5 text-white/60 transition-transform group-data-[state=open]:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[220px]">
          {owned.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onSelect={() => {
                if (c.id !== classroomId) {
                  navigate(
                    TeacherRoutes.classroomDashboard({ classroomId: c.id }),
                  );
                }
              }}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-white/50" />
                {c.name}
              </span>
              {c.id === classroomId && <Check className="h-4 w-4 opacity-70" />}
            </DropdownMenuItem>
          ))}

          {owned.length > 0 && <DropdownMenuSeparator />}

          <DropdownMenuItem
            onSelect={() => navigate(OfficeRoutes.root())}
            className="flex items-center gap-2 text-white/80"
          >
            <LayoutGrid className="h-4 w-4 text-white/50" />
            View All Classes
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setCreateOpen(true)}
            className="flex items-center gap-2 text-white/80"
          >
            <PlusCircle className="h-4 w-4 text-white/50" />
            Create new class
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateClassroomDialog
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </>
  );
};
