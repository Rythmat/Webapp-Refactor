import { CalendarDays, Radio, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { useWeekGridData } from '@/features/classroom/annual/useWeekGridData';
import { useGoLive } from '@/features/classroom/live/useGoLive';
import { useLocalSessionStore } from '@/features/classroom/live/useLocalSessionStore';
import { useCanEditClassroom } from '@/hooks/data';
import { relativeDay } from '../today/todayModel';

/**
 * The class's one white pill, as Kahoot's and Pear Deck's top bars put the
 * session first: "Live now" back into a running session, or Go Live on one
 * of the next lessons, a new live deck, or any lesson from Plan.
 */
export const GoLiveMenu = ({ classroomId }: { classroomId: string }) => {
  const navigate = useNavigate();
  const canEdit = useCanEditClassroom(classroomId);
  const { getActiveSessionForClassroom } = useLocalSessionStore();
  const active = getActiveSessionForClassroom(classroomId);
  const { scheduledDays, todayIso } = useWeekGridData(classroomId);
  const goLive = useGoLive(classroomId);

  if (active) {
    return (
      <Button asChild variant="primary" size="pill">
        <Link
          to={TeacherRoutes.session({
            classroomId,
            sessionId: active.sessionId,
          })}
        >
          <span aria-hidden className="size-2 rounded-full bg-rose-500" />
          Live now
        </Link>
      </Button>
    );
  }

  const upcoming = scheduledDays
    .filter((d) => (d.scheduledDate ?? '') >= todayIso)
    .slice(0, 5);

  return (
    <Menu>
      <MenuTrigger asChild disabled={!canEdit}>
        <Button
          variant="primary"
          size="pill"
          title={canEdit ? undefined : 'Viewers cannot start a live session'}
        >
          <Radio aria-hidden />
          Go Live
        </Button>
      </MenuTrigger>
      <MenuContent align="end" sideOffset={6} className="w-72">
        {upcoming.length > 0 && (
          <>
            <MenuLabel>Next lessons</MenuLabel>
            {upcoming.map((day) => (
              <MenuItem
                key={day.id}
                icon={<Radio />}
                description={capitalize(
                  relativeDay(day.scheduledDate as string, todayIso),
                )}
                onSelect={() => void goLive(day)}
              >
                {day.label}
              </MenuItem>
            ))}
            <MenuSeparator />
          </>
        )}
        <MenuItem
          icon={<Sparkles />}
          onSelect={() => navigate(TeacherRoutes.deckWizard({ classroomId }))}
        >
          Build a live deck…
        </MenuItem>
        <MenuItem
          icon={<CalendarDays />}
          onSelect={() => navigate(TeacherRoutes.plan({ classroomId }))}
        >
          Choose from all lessons
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
