import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ModalSphereDemo from './components/ui/3d-orb-demo';
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
  learnPages,
  connectPages,
  libraryPages,
  atlasPages,
  songsPages,
} from './features/classroom/ClassroomPages';
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
  learnPages(),
  connectPages(),
  libraryPages(),
  atlasPages(),
  songsPages(),
  curriculumPages(),
  { path: '/modal-sphere', element: <ModalSphereDemo /> },
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
  return <RouterProvider router={routesArray} />;
}
