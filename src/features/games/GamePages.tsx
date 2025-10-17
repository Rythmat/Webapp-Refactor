import { Navigate} from 'react-router-dom';
import { GameRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { GamesDashboard } from '@/layouts/DashboardLayout/GamesDashboard';
import { GamePlayer } from '@/components/Games/GamePlayer';

export const gamesPages = () => {
  return {
    path: GameRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <GamesDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        path: GameRoutes.root.definition,
        element: <Navigate to={GameRoutes.root()} />,
      },
      {
        element: <GamePlayer/>,
        index: true,
      }
    ],
  };
};
