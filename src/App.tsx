import { createBrowserRouter, RouterProvider } from 'react-router-dom';
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
  curriculumPages(),
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
