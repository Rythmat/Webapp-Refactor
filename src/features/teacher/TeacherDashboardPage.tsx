/**
 * TeacherDashboardPage — the Overview tab of the classroom workspace
 * (`/teacher/classroom/:classroomId`).
 *
 * A single-column stack of full-width sections mirroring the live Home
 * Dashboard: a "Quick Start" launcher, then "Due This Week" and "Recent
 * Sessions" list panels, separated by hr rules. The class header + tab bar live
 * in ClassroomWorkspaceLayout, which supplies the page gutters/scroll.
 */
import { useParams } from 'react-router-dom';
import { DueThisWeekSection } from './dashboard/DueThisWeekSection';
import { QuickStartLauncher } from './dashboard/QuickStartLauncher';
import { RecentSessionsSection } from './dashboard/RecentSessionsSection';
import { ThisWeekSection } from './dashboard/ThisWeekSection';

export const TeacherDashboardPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';

  return (
    <div className="flex w-full flex-col gap-8 md:gap-10">
      <QuickStartLauncher classroomId={cid} />
      <hr className="border-0 border-t border-white/15" role="separator" />
      <ThisWeekSection classroomId={cid} />
      <hr className="border-0 border-t border-white/15" role="separator" />
      <DueThisWeekSection classroomId={cid} />
      <hr className="border-0 border-t border-white/15" role="separator" />
      <RecentSessionsSection classroomId={cid} />
    </div>
  );
};
