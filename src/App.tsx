import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardResponsiveTest } from './__qa/DashboardResponsiveTest';
import ModalSphereDemo from './components/ui/3d-orb-demo';
import { CustomCursor } from './components/ui/CustomCursor';
import { isMarketingHost } from './constants/hosts';
import { AppContext } from './contexts/AppContext';
import { curriculumPages } from './curriculum/routes';
import { AppHandOff } from './features/AppHandOff';
import { WildcardPage } from './features/WildcardPage';
import { adminPages } from './features/admin';
import { authPages } from './features/authentication/AuthPages';
import {
  classroomPages,
  gamesPages,
  studioPages,
  studentPages,
  userPages,
  settingsPages,
  learnPages,
  connectPages,
  libraryPages,
  atlasPages,
  songsPages,
} from './features/classroom/ClassroomPages';
import { MockLearn } from './features/classroom/msp/__dev__/MockLearn';
import { landingPages } from './features/landing';
import { legalPages } from './features/legal';
import { marketingPages } from './features/marketing';
import { searchPages } from './features/search/routes';
import { officePages, teacherPages } from './features/teacher/TeacherPages';

// musicatlas.io only serves public pages; everything else hands off to the
// app host, where sign-in state lives (see constants/hosts.ts).
const marketingHostRoutes = () => [
  landingPages(),
  marketingPages(),
  legalPages(),
  { path: '*', element: <AppHandOff /> },
];

const appRoutes = () => [
  landingPages(),
  marketingPages(),
  authPages(),
  adminPages(),
  classroomPages(),
  teacherPages(),
  officePages(),
  legalPages(),
  studioPages(),
  gamesPages(),
  studentPages(),
  userPages(),
  settingsPages(),
  learnPages(),
  connectPages(),
  libraryPages(),
  atlasPages(),
  songsPages(),
  curriculumPages(),
  searchPages(),
  { path: '/modal-sphere', element: <ModalSphereDemo /> },
  ...(import.meta.env.DEV
    ? [
        { path: '/__dashboard-qa', element: <DashboardResponsiveTest /> },
        { path: '/dev/msp/mock-learn', element: <MockLearn /> },
      ]
    : []),
  {
    path: '*',
    element: (
      <AppContext>
        <WildcardPage />
      </AppContext>
    ),
  },
];

const routesArray = createBrowserRouter(
  isMarketingHost() ? marketingHostRoutes() : appRoutes(),
);

export function App() {
  return (
    <>
      <RouterProvider router={routesArray} />
      <CustomCursor />
    </>
  );
}
