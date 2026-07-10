/**
 * Hero tile: what am I teaching today?
 *
 * Resolves the Unit(s) covering today's date via `useTodaysUnit`. Shows
 * the theme title, focus, and two CTAs — Start Presentation (if there's a
 * demo Day / any Day to project) and Open Unit.
 */
import { BookOpen, CalendarDays, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useThemeBank } from '@/features/classroom/content/hooks';
import { DEMO_DAY_ID } from '@/features/classroom/fixtures/demoDay';
import { useTodaysUnit } from '../hooks/useTodaysUnit';
import { DashboardTile } from './DashboardTile';

interface TodaysLessonTileProps {
  classroomId: string;
}

export const TodaysLessonTile = ({ classroomId }: TodaysLessonTileProps) => {
  const { primary } = useTodaysUnit(classroomId);
  const { byId } = useThemeBank();
  const theme = primary?.theme ? byId(primary.theme.themeId) : undefined;

  if (!primary) {
    return (
      <DashboardTile
        title="Today's Lesson"
        icon={<CalendarDays className="h-3.5 w-3.5" />}
        colSpanMd={8}
        footerLink={{
          to: TeacherRoutes.annualPlan({ classroomId }),
          label: 'Open Annual Plan',
        }}
      >
        <p className="text-sm text-white/60">
          No unit scheduled for today. Open the Annual Plan to see the year at a
          glance.
        </p>
      </DashboardTile>
    );
  }

  const title = theme?.title.en ?? primary.label;
  const focus = theme?.focus;
  const firstDayId = primary.dayIds?.[0];
  const presentTarget = firstDayId ?? DEMO_DAY_ID;

  return (
    <DashboardTile
      title="Today's Lesson"
      icon={<CalendarDays className="h-3.5 w-3.5" />}
      colSpanMd={8}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-medium leading-tight text-white md:text-3xl">
            {title}
          </h2>
          {theme?.title.es && (
            <p className="text-sm italic text-white/40">{theme.title.es}</p>
          )}
        </div>
        {focus && <p className="line-clamp-3 text-sm text-white/70">{focus}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to={TeacherRoutes.present({
              classroomId,
              dayId: presentTarget,
            })}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
          >
            <Play className="h-4 w-4" />
            Start Presentation
          </Link>
          <Link
            to={TeacherRoutes.annualUnit({
              classroomId,
              unitId: primary.id,
            })}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            <BookOpen className="h-4 w-4" />
            Open Unit
          </Link>
        </div>
      </div>
    </DashboardTile>
  );
};
