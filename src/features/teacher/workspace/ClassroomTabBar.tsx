import { Copy, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { useClassroom } from '@/hooks/data';
import { EditClassroomDialog } from '../components/EditClassroomDialog';
import { ClassSelector } from './ClassSelector';

interface ClassroomTabBarProps {
  classroomId: string;
  hasMany: boolean;
}

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    toast.success(`Copied join code ${code}`);
  } catch {
    toast.error('Could not copy — clipboard blocked');
  }
};

/**
 * Classroom workspace tab bar — one inline row mirroring the
 * Learn/Studio/Globe/Arcade dashboards: a ClassSelector (GraduationCap + the
 * class name as a dropdown that switches classrooms), plain-text tabs at the
 * heading's size, then a right-aligned utility cluster (join code + Customize +
 * All classrooms)
 * that replaces the removed hero. Unlike those dashboards each tab is a real
 * ROUTE, so we keep NavLink (which supplies isActive) instead of a ?tab= param.
 * Overview uses `end` so it's only active at the exact index path.
 */
export const ClassroomTabBar = ({
  classroomId,
  hasMany,
}: ClassroomTabBarProps) => {
  const { data: classroom } = useClassroom(classroomId);
  const [editOpen, setEditOpen] = useState(false);

  const tabs = [
    {
      label: 'Overview',
      to: TeacherRoutes.classroomDashboard({ classroomId }),
      end: true,
    },
    {
      label: 'Lessons',
      to: TeacherRoutes.plan({ classroomId }),
      end: true,
    },
    {
      label: 'Calendar',
      to: TeacherRoutes.annualPlan({ classroomId }),
      end: false,
    },
    {
      label: 'People',
      to: TeacherRoutes.students({ classroomId }),
      end: false,
    },
    { label: 'Grades', to: TeacherRoutes.grades({ classroomId }), end: false },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-6">
      {/* Class selector — the class name is now a switcher (reuses the Home
          InstrumentSelector's dropdown pattern), replacing the static heading. */}
      <ClassSelector classroomId={classroomId} />

      {/* Tabs — plain text links at the same size as the heading. */}
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'text-xl font-medium transition-colors md:text-2xl',
              isActive ? 'text-white' : 'text-white/55 hover:text-white',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}

      {/* Right cluster — the former hero's utilities. */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {hasMany && (
          <Link
            to={TeacherRoutes.classrooms()}
            className="inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            All classrooms
          </Link>
        )}
        {classroom?.code && (
          <button
            type="button"
            onClick={() => copyCode(classroom.code)}
            title="Copy join code"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            <span className="uppercase tracking-wider text-white/40">Code</span>
            {classroom.code}
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-white/85"
        >
          <Pencil className="h-3.5 w-3.5" />
          Customize
        </button>
      </div>

      <EditClassroomDialog
        classroom={classroom ?? null}
        isOpen={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
};
