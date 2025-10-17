import { ProfileRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { StudentDashboard } from '@/layouts/DashboardLayout/StudentDashboard';
import { HomeInlet } from '@/components/ClassroomLayout/HomeInlet';
import { StudentProfilePage } from './StudentProfilePage';


export const studentPages = () => {
  return {
    path: ProfileRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
            <StudentDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      { index: true, element: <HomeInlet /> },
      { path: ProfileRoutes.profile.definition, element: <StudentProfilePage /> },
      // { path: 'settings', element: <SettingsPage /> }, 
      // { path: 'plan', element: <PlanPage /> },
    ],
  };
};