/**
 * ClassSelector — the class switcher in the teacher tab bar. Reuses the Home
 * page InstrumentSelector's dropdown pattern (Radix DropdownMenu + a chevron
 * trigger that flips on open), wired to the teacher's classrooms: the trigger
 * shows the current class (GraduationCap + name), and the menu lists every
 * classroom they own. Selecting one jumps to that class's Overview. Replaces the
 * old static class-name heading.
 */
import { Check, ChevronDown, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TeacherRoutes } from '@/constants/routes';
import { useClassroom, useClassrooms, useMe } from '@/hooks/data';

interface ClassSelectorProps {
  classroomId: string;
}

export const ClassSelector = ({ classroomId }: ClassSelectorProps) => {
  const navigate = useNavigate();
  const { data: classroom } = useClassroom(classroomId);
  const { data: me } = useMe();
  const { data: allClassrooms = [] } = useClassrooms();

  const owned = me?.id
    ? allClassrooms.filter((c) => c.teacherId === me.id)
    : [];
  const currentName = classroom?.name ?? 'Classroom';

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
