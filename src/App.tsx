import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardResponsiveTest } from './__qa/DashboardResponsiveTest';
import ModalSphereDemo from './components/ui/3d-orb-demo';
import { CustomCursor } from './components/ui/CustomCursor';
import { AppContext } from './contexts/AppContext';
import { curriculumPages } from './curriculum/routes';
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
import { legalPages } from './features/legal';
import { teacherPages } from './features/teacher/TeacherPages';

const routesArray = createBrowserRouter([
  authPages(),
  adminPages(),
  classroomPages(),
  teacherPages(),
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
]);

export function App() {
  return (
    <>
      <RouterProvider router={routesArray} />
      <CustomCursor />
    </>
  );
}
