/**
 * QuickStartLauncher — the teacher Overview's "Quick Start" section, mirroring
 * the Home Dashboard's QuickStartSection: a section header over a HexWave
 * honeycomb panel holding a 4-tile launcher grid. The four teacher tiles are
 * Live Session · Browse · Create · Review. Unlike Home's pure-link tiles, some
 * carry behavior (a conditional route, a "create a new Day" handler), so the
 * shared tile shell accepts either `to` (Link) or `onClick` (button).
 */
import {
  CalendarDays,
  GraduationCap,
  PlusCircle,
  Radio,
  type LucideIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { useLocalSessionStore } from '@/features/classroom/live/useLocalSessionStore';
import { newBlankDay } from '@/features/classroom/plan/newBlankDay';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';

interface QuickStartLauncherProps {
  classroomId: string;
}

const TILE_SHELL =
  'group relative flex aspect-square flex-col overflow-hidden rounded-2xl border bg-white/15 transition-transform hover:-translate-y-px';

interface TileProps {
  icon: LucideIcon;
  label: string;
  to?: string;
  onClick?: () => void;
  accent?: boolean;
}

const Tile = ({ icon: Icon, label, to, onClick, accent }: TileProps) => {
  const shell = cn(
    TILE_SHELL,
    accent
      ? 'border-emerald-400/40 hover:border-emerald-400/70'
      : 'border-white/10 hover:border-white/25',
  );

  const inner = (
    <>
      <div className="pointer-events-none flex flex-1 items-center justify-center pt-8 md:pt-12">
        <Icon
          className={cn(
            'h-14 w-14 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all group-hover:scale-105 md:h-16 md:w-16',
            accent
              ? 'text-emerald-300'
              : 'text-white/80 group-hover:text-white',
          )}
          strokeWidth={1.5}
        />
      </div>
      <div className="m-3 rounded-lg bg-black/70 px-4 py-3 backdrop-blur-sm md:m-4 md:rounded-xl">
        <div className="text-center text-lg font-normal text-white md:text-xl">
          {label}
        </div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} aria-label={label} className={shell}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={shell}
    >
      {inner}
    </button>
  );
};

export const QuickStartLauncher = ({
  classroomId,
}: QuickStartLauncherProps) => {
  const navigate = useNavigate();
  const { saveDay } = useLocalPlan();
  const { getActiveSessionForClassroom } = useLocalSessionStore();
  const active = getActiveSessionForClassroom(classroomId);

  const handleCreate = () => {
    const day = newBlankDay();
    saveDay(day);
    navigate(TeacherRoutes.dayEditor({ classroomId, dayId: day.id }));
  };

  return (
    <section aria-label="Quick Actions" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center gap-2 text-white/85 md:gap-3">
        <img
          src="/icons/quick-start-icon.svg"
          alt=""
          draggable={false}
          className="h-8 w-8 md:h-10 md:w-10"
        />
        <h2 className="text-xl font-medium text-white md:text-2xl">
          Quick Actions
        </h2>
      </div>

      <div className="relative isolate overflow-hidden rounded-2xl">
        {/* Teacher-scoped honeycomb (Studio-bg palette). Its own asset so the
            recolor doesn't touch the shared Home/Learn `learn-bg.svg`. The
            threshold is low enough that every jewel tone (green, periwinkle,
            gold, coral, crimson, tan) is interactive, leaving only the cream +
            mauve tiles as the calm static base. */}
        <HexWaveBackground
          src="/backgrounds/teacher-bg.svg"
          drain={false}
          ambient
          className="pointer-events-none absolute inset-0 z-0"
          backgroundColor="#0D0B08"
          colorThreshold={0.22}
          brushRadius={90}
        />
        <div className="relative z-10 grid grid-cols-2 gap-4 p-4 md:grid-cols-4 md:gap-5 md:p-5">
          <Tile
            icon={Radio}
            label={active ? 'Live now' : 'Live Session'}
            accent={Boolean(active)}
            to={
              active
                ? TeacherRoutes.session({
                    classroomId,
                    sessionId: active.sessionId,
                  })
                : TeacherRoutes.deckWizard({ classroomId })
            }
          />
          <Tile
            icon={CalendarDays}
            label="Browse"
            to={TeacherRoutes.plan({ classroomId })}
          />
          <Tile icon={PlusCircle} label="Create" onClick={handleCreate} />
          <Tile
            icon={GraduationCap}
            label="Review"
            to={TeacherRoutes.grades({ classroomId })}
          />
        </div>
      </div>
    </section>
  );
};
