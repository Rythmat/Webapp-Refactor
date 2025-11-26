import { lazy} from 'react';
import { Navigate} from 'react-router-dom';
import { ClassroomRoutes, GameRoutes, StudioRoutes, ProfileRoutes, LearnRoutes} from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';
import { LessonFlow } from '@/components/learn/LessonFlow';
import { PlayAlong } from '@/components/Games/PlayAlong';
import { NoteHold } from '@/components/Games/NoteHold';
// import { SynthTest } from '@/components/Games/SynthTest';

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

// const GamePlayer = lazy(() =>
//   import('@/components/Games/GamePlayer').then(({ GamePlayer }) => ({
//     default: GamePlayer,
//   })),
// );

const Index = lazy(() =>
  import('@/components/studio/Index').then(({ Index }) => ({
    default: Index,
  })),
);

const StudentProfilePage = lazy(() =>
  import('../student/StudentProfilePage').then(({ StudentProfilePage }) => ({
    default: StudentProfilePage,
  })),
);

const HomeInlet = lazy(() =>
  import('@/components/ClassroomLayout/HomeInlet').then(({ HomeInlet }) => ({
    default: HomeInlet,
  })),
);

const LearnHomePage = lazy(() =>
  import('./LearnHomePage').then(({ LearnHomePage }) => ({
    default: LearnHomePage,
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
        // element: <PlayAlong inTime={true} />,
        element: <NoteHold />,
        // element: <SynthTest />,
        index: true,
      }
    ],
  };
};



export const studioPages = () => {
  return {
    path: StudioRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <ClassroomDashboard fallback={<DashboardContentSkeleton />}/>
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

export const studentPages = () => {
  return {
    path: ProfileRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
            <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
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

export const learnPages = () => {
  return {
    path: LearnRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
            <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      { 
        index: true,
        element: <LearnHomePage /> 
      },
      {
        path:LearnRoutes.flow.definition,
        element:<LessonFlow flowType='grouping' nameOf=''/>
      },

    ],
  };
};