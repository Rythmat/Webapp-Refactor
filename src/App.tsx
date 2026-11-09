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
  globePages,
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

// DEV only: the redesign's art contact sheet (src/components/art): every
// cover kind and palette, the kit and the Arcade's games. Lazy behind a
// literal import.meta.env.DEV, as the gallery above.
const ArtContactSheet = import.meta.env.DEV
  ? lazy(() =>
      import('./components/art/__gallery__/ArtContactSheet').then(
        ({ ArtContactSheet }) => ({ default: ArtContactSheet }),
      ),
    )
  : null;

// DEV only: Echo's Make Your Song on a page of its own, with a stand-in
// input, while the play screens leading to it are built. Lazy behind a
// literal import.meta.env.DEV, as the gallery above.
const MakeYourSongHarness = import.meta.env.DEV
  ? lazy(() =>
      import(
        './components/Games/Echo/makeYourSong/dev/MakeYourSongHarness'
      ).then(({ MakeYourSongHarness }) => ({ default: MakeYourSongHarness })),
    )
  : null;

// DEV only: Echo in the classroom on one page: the teacher's panel, the
// projector, a student and a pretend class on an in-memory bus. Lazy behind
// a literal import.meta.env.DEV, as the gallery above.
const EchoClassroomHarness = import.meta.env.DEV
  ? lazy(() =>
      import('./features/classroom/echo/dev/EchoClassroomHarness').then(
        ({ EchoClassroomHarness }) => ({ default: EchoClassroomHarness }),
      ),
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
  globePages(),
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
        ...(MakeYourSongHarness
          ? [
              {
                path: '/dev/echo/make-your-song',
                element: (
                  <Suspense fallback={null}>
                    <MakeYourSongHarness />
                  </Suspense>
                ),
              },
            ]
          : []),
        ...(EchoClassroomHarness
          ? [
              {
                path: '/dev/echo/classroom',
                element: (
                  <Suspense fallback={null}>
                    <EchoClassroomHarness />
                  </Suspense>
                ),
              },
            ]
          : []),
        ...(ArtContactSheet
          ? [
              {
                path: '/dev/art/contact-sheet',
                element: (
                  <Suspense fallback={null}>
                    <ArtContactSheet />
                  </Suspense>
                ),
              },
            ]
          : []),
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
