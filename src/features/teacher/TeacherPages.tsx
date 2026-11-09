import { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router';
import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { CalendarRedirect } from '@/features/office/class/plan/CalendarRedirect';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';
import { LegacyClassroomRedirect } from './workspace/LegacyClassroomRedirect';

const StudentsPage = lazy(() =>
  import('@/features/office/class/StudentsPage').then(({ StudentsPage }) => ({
    default: StudentsPage,
  })),
);

const ClassPlanPage = lazy(() =>
  import('@/features/office/class/plan/ClassPlanPage').then(
    ({ ClassPlanPage }) => ({ default: ClassPlanPage }),
  ),
);

const ClassAssignmentsPage = lazy(() =>
  import('@/features/office/class/assignments/ClassAssignmentsPage').then(
    ({ ClassAssignmentsPage }) => ({ default: ClassAssignmentsPage }),
  ),
);

// The Office's frame and pages (owner, 2026-11-09: the Office rebuilt as an
// LMS in the Studio's frame).
const OfficeFrame = lazy(() =>
  import('@/features/office/frame/OfficeFrame').then(({ OfficeFrame }) => ({
    default: OfficeFrame,
  })),
);

const OfficeClassLayout = lazy(() =>
  import('@/features/office/frame/OfficeClassLayout').then(
    ({ OfficeClassLayout }) => ({ default: OfficeClassLayout }),
  ),
);

const TodayPage = lazy(() =>
  import('@/features/office/today/TodayPage').then(({ TodayPage }) => ({
    default: TodayPage,
  })),
);

const ClassesPage = lazy(() =>
  import('@/features/office/classes/ClassesPage').then(({ ClassesPage }) => ({
    default: ClassesPage,
  })),
);

const LibraryPage = lazy(() =>
  import('@/features/office/library/LibraryPage').then(({ LibraryPage }) => ({
    default: LibraryPage,
  })),
);

const PlannerPage = lazy(() =>
  import('@/features/office/planner/PlannerPage').then(({ PlannerPage }) => ({
    default: PlannerPage,
  })),
);

const ReviewPage = lazy(() =>
  import('@/features/office/review/ReviewPage').then(({ ReviewPage }) => ({
    default: ReviewPage,
  })),
);

const ClassOverviewPage = lazy(() =>
  import('@/features/office/class/ClassOverviewPage').then(
    ({ ClassOverviewPage }) => ({ default: ClassOverviewPage }),
  ),
);

const ProgressPage = lazy(() =>
  import('@/features/office/class/ProgressPage').then(({ ProgressPage }) => ({
    default: ProgressPage,
  })),
);

const GradesRedirect = lazy(() =>
  import('./workspace/GradesRedirect').then(({ GradesRedirect }) => ({
    default: GradesRedirect,
  })),
);

// Teacher-facing deep pages — reused from src/features/classroom/ but
// registered under the /teacher/* prefix so URLs stay teacher-scoped.
const PresentationMode = lazy(() =>
  import('@/features/classroom/PresentationMode').then(
    ({ PresentationMode }) => ({ default: PresentationMode }),
  ),
);

const DayEditor = lazy(() =>
  import('@/features/classroom/plan/deckEditor/SlideDeckEditor').then(
    ({ SlideDeckEditor }) => ({ default: SlideDeckEditor }),
  ),
);

const DeckWizardPage = lazy(() =>
  import('@/features/classroom/slides/wizard/DeckWizardPage').then(
    ({ DeckWizardPage }) => ({ default: DeckWizardPage }),
  ),
);

const PreviewPage = lazy(() =>
  import('@/features/classroom/plan/PreviewPage').then(({ PreviewPage }) => ({
    default: PreviewPage,
  })),
);

const AssignmentProgressPage = lazy(() =>
  import('@/features/classroom/assignments/AssignmentProgressPage').then(
    ({ AssignmentProgressPage }) => ({ default: AssignmentProgressPage }),
  ),
);

const TeacherSessionDashboard = lazy(() =>
  import('@/features/classroom/live/TeacherSessionDashboard').then(
    ({ TeacherSessionDashboard }) => ({ default: TeacherSessionDashboard }),
  ),
);

const ProjectorPage = lazy(() =>
  import('@/features/classroom/live/ProjectorPage').then(
    ({ ProjectorPage }) => ({ default: ProjectorPage }),
  ),
);

const SessionReportPage = lazy(() =>
  import('@/features/classroom/live/SessionReportPage').then(
    ({ SessionReportPage }) => ({ default: SessionReportPage }),
  ),
);

const SessionReportsListPage = lazy(() =>
  import('@/features/classroom/live/SessionReportsListPage').then(
    ({ SessionReportsListPage }) => ({ default: SessionReportsListPage }),
  ),
);

export const teacherPages = () => {
  return {
    path: TeacherRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage teacherOnly>
          <Suspense>
            <Outlet />
          </Suspense>
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        path: TeacherRoutes.root.definition,
        element: <ClassroomDashboard fallback={<DashboardContentSkeleton />} />,
        children: [
          {
            // `/teacher` opens the Office on Today.
            index: true,
            element: <Navigate to={OfficeRoutes.root()} replace />,
          },
          {
            // Back-compat: the classroom picker now lives at the top-level
            // /office route (see officePages below); keep the old URL working.
            path: TeacherRoutes.classrooms.definition,
            element: <Navigate to={OfficeRoutes.root()} replace />,
          },
        ],
      },
      {
        // Back-compat: classrooms moved from /teacher/classroom/:id/* to
        // /office/:id/* (see officePages); old links land on the same page.
        path: TeacherRoutes.legacyClassroom.definition,
        element: <LegacyClassroomRedirect />,
      },
    ],
  };
};

/**
 * The teacher's Office (owner, 2026-11-09): an LMS in the Studio's frame.
 * Its own pages (Today, Classes, Planner, Library, Review) and every class
 * under it at `/office/:classroomId/...` draw in `OfficeFrame` — top rail,
 * stage, Inspector, bottom rail — inside the app's shell, which keeps its
 * left rail. The projected surfaces (Present, Projector) leave the frame.
 * It reproduces the guard `/teacher` has (AppContext → ProtectedPage
 * teacherOnly → ClassroomDashboard), since React Router can't nest an
 * absolute `/office` child under the `/teacher` parent.
 */
export const officePages = () => {
  return {
    path: OfficeRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage teacherOnly>
          <Suspense>
            <Outlet />
          </Suspense>
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        element: <ClassroomDashboard fallback={<DashboardContentSkeleton />} />,
        children: [
          {
            element: <OfficeFrame />,
            children: [
              { index: true, element: <TodayPage /> },
              {
                path: OfficeRoutes.classes.definition,
                element: <ClassesPage />,
              },
              {
                path: OfficeRoutes.planner.definition,
                element: <PlannerPage />,
              },
              {
                path: OfficeRoutes.library.definition,
                element: <LibraryPage />,
              },
              {
                path: OfficeRoutes.review.definition,
                element: <ReviewPage />,
              },
              {
                // Every page of one class, behind its role guard. Child paths
                // are absolute and begin with the class's path.
                path: TeacherRoutes.classroomDashboard.definition,
                element: <OfficeClassLayout />,
                children: [
                  { index: true, element: <ClassOverviewPage /> },
                  {
                    path: TeacherRoutes.plan.definition,
                    element: <ClassPlanPage />,
                  },
                  {
                    // The calendar is one of Plan's views now; its old tab
                    // opens Plan on Month.
                    path: TeacherRoutes.annualPlan.definition,
                    element: <CalendarRedirect />,
                  },
                  {
                    path: TeacherRoutes.assignments.definition,
                    element: <ClassAssignmentsPage />,
                  },
                  {
                    path: TeacherRoutes.students.definition,
                    element: <StudentsPage />,
                  },
                  {
                    path: TeacherRoutes.progress.definition,
                    element: <ProgressPage />,
                  },
                  {
                    // The retired Grades tab lands on Progress.
                    path: TeacherRoutes.grades.definition,
                    element: <GradesRedirect />,
                  },
                  // Deep pages: each brings its own column.
                  {
                    path: TeacherRoutes.deckWizard.definition,
                    element: <DeckWizardPage />,
                  },
                  {
                    path: TeacherRoutes.dayEditor.definition,
                    element: <DayEditor />,
                  },
                  {
                    path: TeacherRoutes.dayPreview.definition,
                    element: <PreviewPage />,
                  },
                  {
                    path: TeacherRoutes.assignmentProgress.definition,
                    element: <AssignmentProgressPage />,
                  },
                  {
                    path: TeacherRoutes.session.definition,
                    element: <TeacherSessionDashboard />,
                  },
                  {
                    path: TeacherRoutes.report.definition,
                    element: <SessionReportPage />,
                  },
                  {
                    path: TeacherRoutes.reports.definition,
                    element: <SessionReportsListPage />,
                  },
                ],
              },
            ],
          },
          {
            // Projected to a class: the whole screen, no frame.
            path: TeacherRoutes.present.definition,
            element: <PresentationMode />,
          },
          {
            path: TeacherRoutes.projector.definition,
            element: <ProjectorPage />,
          },
        ],
      },
    ],
  };
};
