import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router';
import { TeacherRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';

const TeacherLanding = lazy(() =>
  import('./TeacherLanding').then(({ TeacherLanding }) => ({
    default: TeacherLanding,
  })),
);

const TeacherDashboardPage = lazy(() =>
  import('./TeacherDashboardPage').then(({ TeacherDashboardPage }) => ({
    default: TeacherDashboardPage,
  })),
);

const ClassroomSelectionPage = lazy(() =>
  import('./ClassroomSelectionPage').then(({ ClassroomSelectionPage }) => ({
    default: ClassroomSelectionPage,
  })),
);

const ClassroomStudentsPage = lazy(() =>
  import('./ClassroomStudentsPage').then(({ ClassroomStudentsPage }) => ({
    default: ClassroomStudentsPage,
  })),
);

// GC-style tabbed workspace shell (hero + breadcrumb + tab bar) that wraps the
// four in-classroom tab pages. Deep pages stay siblings (chrome-free).
const ClassroomWorkspaceLayout = lazy(() =>
  import('./workspace/ClassroomWorkspaceLayout').then(
    ({ ClassroomWorkspaceLayout }) => ({ default: ClassroomWorkspaceLayout }),
  ),
);

// Slim chrome that puts the classroom tab bar above the "deep" pages (Plan Days,
// Day editor, Reports, live session, …) while each keeps its own container.
// Full-screen projected surfaces (Presentation, Projector) stay outside it.
const ClassroomDeepPageLayout = lazy(() =>
  import('./workspace/ClassroomDeepPageLayout').then(
    ({ ClassroomDeepPageLayout }) => ({ default: ClassroomDeepPageLayout }),
  ),
);

const ClassroomGradesPage = lazy(() =>
  import('@/features/classroom/grades/ClassroomGradesPage').then(
    ({ ClassroomGradesPage }) => ({ default: ClassroomGradesPage }),
  ),
);

// Teacher-facing deep pages — reused from src/features/classroom/ but
// registered under the /teacher/* prefix so URLs stay teacher-scoped.
const PresentationMode = lazy(() =>
  import('@/features/classroom/PresentationMode').then(
    ({ PresentationMode }) => ({ default: PresentationMode }),
  ),
);

const PlanPage = lazy(() =>
  import('@/features/classroom/plan/PlanPage').then(({ PlanPage }) => ({
    default: PlanPage,
  })),
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

const AnnualPlanPage = lazy(() =>
  import('@/features/classroom/annual/AnnualPlanPage').then(
    ({ AnnualPlanPage }) => ({ default: AnnualPlanPage }),
  ),
);

const AnnualUnitPage = lazy(() =>
  import('@/features/classroom/annual/UnitPage').then(({ UnitPage }) => ({
    default: UnitPage,
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
            index: true,
            element: <TeacherLanding />,
          },
          {
            path: TeacherRoutes.classrooms.definition,
            element: <ClassroomSelectionPage />,
          },
          {
            // GC-style workspace: the four tab pages nest under one layout
            // (hero + tabs). Child paths are absolute and begin with the
            // workspace path, so React Router keeps them here; the deep pages
            // below stay siblings and render chrome-free.
            path: TeacherRoutes.classroomDashboard.definition,
            element: <ClassroomWorkspaceLayout />,
            children: [
              {
                index: true,
                element: <TeacherDashboardPage />,
              },
              {
                path: TeacherRoutes.students.definition,
                element: <ClassroomStudentsPage />,
              },
              {
                // "Lessons" tab: the merged lesson-plan list (replaces the old
                // Classwork/Assignments tab). Assigning happens in the editor.
                path: TeacherRoutes.plan.definition,
                element: <PlanPage />,
              },
              {
                // Calendar tab: the Annual Plan renders inside the workspace
                // shell (hero + tab bar). Its deep Unit page stays a sibling
                // below so it renders chrome-free.
                path: TeacherRoutes.annualPlan.definition,
                element: <AnnualPlanPage />,
              },
              {
                path: TeacherRoutes.grades.definition,
                element: <ClassroomGradesPage />,
              },
            ],
          },
          {
            // Deep pages that KEEP the classroom tab bar. A pathless layout
            // renders the bar as identical, full-width chrome; each page's own
            // container renders below it. Their absolute paths are unchanged, so
            // URL matching/ranking is the same as when they were siblings.
            element: <ClassroomDeepPageLayout />,
            children: [
              {
                path: TeacherRoutes.deckWizard.definition,
                element: <DeckWizardPage />,
              },
              {
                path: TeacherRoutes.annualUnit.definition,
                element: <AnnualUnitPage />,
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
          {
            // Full-screen surfaces projected to students — no tab bar.
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
