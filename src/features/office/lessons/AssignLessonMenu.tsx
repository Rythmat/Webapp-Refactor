import { ChevronDown, GraduationCap, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { useAnnualPlan } from '@/features/classroom/annual/useAnnualPlan';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import type { Day } from '@/features/classroom/types';
import { useCanEditClassroom, useMyClassrooms } from '@/hooks/data';
import { inspectSearch } from '../frame/useOfficeInspector';
import { isoDay, relativeDay } from '../today/todayModel';
import { copyLessonToClass } from './builtInLessons';

/**
 * "Assign to a class" under a lesson on the Lessons page (owner,
 * 2026-11-12): the teacher's classes, each with the day the lesson would go
 * on (its next free school day). Picking one copies the lesson onto that
 * class's plan and stays here, so it can go to several classes; the toast
 * opens it there. The Inspector's Teach to a class form picks the day too.
 */
export const AssignLessonMenu = ({ day }: { day: Day }) => {
  const { classrooms } = useMyClassrooms();
  const navigate = useNavigate();
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button size="md" className="self-start">
          <GraduationCap aria-hidden />
          Assign to a class
          <ChevronDown aria-hidden />
        </Button>
      </MenuTrigger>
      <MenuContent align="start" sideOffset={6} className="w-64">
        <MenuLabel>Assign “{day.label}” to</MenuLabel>
        {classrooms.length === 0 ? (
          <MenuItem
            icon={<Plus />}
            description="Lessons are assigned to your classes"
            onSelect={() => navigate(`${OfficeRoutes.classes()}?new=1`)}
          >
            Make a class first
          </MenuItem>
        ) : (
          classrooms.map((c) => (
            <ClassChoice
              key={c.id}
              day={day}
              classroomId={c.id}
              name={c.name}
            />
          ))
        )}
      </MenuContent>
    </Menu>
  );
};

const ClassChoice = ({
  day,
  classroomId,
  name,
}: {
  day: Day;
  classroomId: string;
  name: string;
}) => {
  const navigate = useNavigate();
  const { suggestLessonDate } = useAnnualPlan(classroomId);
  const { listDays, saveDay } = useLocalPlan(classroomId);
  const canEdit = useCanEditClassroom(classroomId);
  const date = suggestLessonDate(
    listDays(classroomId)
      .map((d) => d.scheduledDate)
      .filter((d): d is string => Boolean(d)),
  );
  const when = date ? capitalize(relativeDay(date, isoDay(new Date()))) : null;

  const assign = () => {
    const lesson = copyLessonToClass(day, classroomId, date);
    saveDay(lesson);
    const open = `${TeacherRoutes.plan({ classroomId })}${inspectSearch({
      kind: 'lesson',
      classroomId,
      id: lesson.id,
    })}`;
    toast.success(`Added to ${name}${when ? ` · ${when}` : ''}`, {
      action: { label: 'Open', onClick: () => navigate(open) },
    });
  };

  return (
    <MenuItem
      icon={<GraduationCap />}
      description={
        canEdit ? (when ?? 'Not scheduled') : 'You can view this class only'
      }
      disabled={!canEdit}
      onSelect={assign}
    >
      {name}
    </MenuItem>
  );
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
