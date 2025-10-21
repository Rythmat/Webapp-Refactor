import { lazy} from 'react';
import { Navigate} from 'react-router-dom';
import { ClassroomRoutes, GameRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';
import { GamePlayer } from '@/components/Games/GamePlayer';
const ClassroomCollectionPage = lazy(() =>
  import('./ClassroomCollectionPage').then(({ ClassroomCollectionPage }) => ({
    default: ClassroomCollectionPage,
  })),
);

const ClassroomLessonPage = lazy(() =>
  import('./ClassroomLessonPage').then(({ ClassroomLessonPage }) => ({
    default: ClassroomLessonPage,
  })),
);

const ClassroomPickerPage = lazy(() =>
  import('./ClassroomPickerPage').then(({ ClassroomPickerPage }) => ({
    default: ClassroomPickerPage,
  })),
);

const ClassroomHomePage = lazy(() =>
  import('./ClassroomHomePage').then(({ ClassroomHomePage }) => ({
    default: ClassroomHomePage,
  })),
);

export const classroomPages = () => {
  return {
    path: ClassroomRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        path: ClassroomRoutes.root.definition,
        element: <Navigate to={ClassroomRoutes.picker()} />,
      },
      {
        element: <ClassroomPickerPage />,
        index: true,
      },
      {
        path: ClassroomRoutes.home.definition,
        element: <ClassroomHomePage />,
      },
      {
        path: ClassroomRoutes.collection.definition,
        element: <ClassroomCollectionPage />,
      },
      {
        path: ClassroomRoutes.lesson.definition,
        element: <ClassroomLessonPage />,
      },
      {
        path: '*',
        element: <Navigate to={ClassroomRoutes.picker()} />,
      },
    ],
  };
};


export const gamesPages = () => {
  return {
    path: GameRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
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
