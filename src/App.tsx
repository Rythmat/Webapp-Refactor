import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardResponsiveTest } from './__qa/DashboardResponsiveTest';
import { HipHopGrooveAudition } from './__qa/hipHopAudition/HipHopGrooveAudition';
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

// DEV only: every Studio UI primitive in every state (src/daw/ui). Lazy behind
// a literal import.meta.env.DEV, so a production build folds the import away
// and never emits the gallery's chunk (verify:prod:scan checks).
const DawUiGallery = import.meta.env.DEV
  ? lazy(() =>
      import('./daw/ui/__gallery__/DawUiGallery').then(({ DawUiGallery }) => ({
        default: DawUiGallery,
      })),
    )
  : null;

// musicatlas.io only serves public pages; everything else hands off to the
// app host, where sign-in state lives (see constants/hosts.ts).
// The Modal Sphere loads with its own page, not with the app.
const ModalSphereDemo = lazy(() => import('./components/ui/3d-orb-demo'));

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
  {
    path: '/modal-sphere',
    element: (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[hsl(var(--ui-background))]" />
        }
      >
        <ModalSphereDemo />
      </Suspense>
    ),
  },
  ...(import.meta.env.DEV
    ? [
        { path: '/__dashboard-qa', element: <DashboardResponsiveTest /> },
        { path: '/__hiphop-grooves', element: <HipHopGrooveAudition /> },
        { path: '/dev/msp/mock-learn', element: <MockLearn /> },
        ...(DawUiGallery
          ? [
              {
                path: '/dev/studio/ui-gallery',
                element: (
                  <Suspense fallback={null}>
                    <DawUiGallery />
                  </Suspense>
                ),
              },
            ]
          : []),
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
