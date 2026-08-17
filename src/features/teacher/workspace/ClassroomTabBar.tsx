import { NavLink } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { ClassSelector } from './ClassSelector';

interface ClassroomTabBarProps {
  classroomId: string;
}

/**
 * Classroom workspace tab bar — one inline row mirroring the
 * Learn/Studio/Globe/Arcade dashboards: a ClassSelector (GraduationCap + the
 * class name as a dropdown that switches classrooms) followed by plain-text
 * tabs at the heading's size. Unlike those dashboards each tab is a real ROUTE,
 * so we keep NavLink (which supplies isActive) instead of a ?tab= param.
 * Overview uses `end` so it's only active at the exact index path.
 */
export const ClassroomTabBar = ({ classroomId }: ClassroomTabBarProps) => {
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
    </div>
  );
};
