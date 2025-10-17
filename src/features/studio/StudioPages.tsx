import { Navigate} from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import Index from '@/components/studio/Index';
import { StudioDashboard } from '@/layouts/DashboardLayout/StudioDashboard';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';


export const studioPages = () => {
  return {
    path: StudioRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <StudioDashboard fallback={<DashboardContentSkeleton />}/>
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        path: StudioRoutes.root.definition,
        element: <Navigate to={StudioRoutes.root()} />,
      },
      {
        element: <Index />,
        index: true,
      },
    ],
  };
};
