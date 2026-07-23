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
  import('@/features/classroom/plan/DayEditor').then(({ DayEditor }) => ({
    default: DayEditor,
  })),
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

const AssignmentsPage = lazy(() =>
  import('@/features/classroom/assignments/AssignmentsPage').then(
    ({ AssignmentsPage }) => ({ default: AssignmentsPage }),
  ),
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
            path: TeacherRoutes.classroomDashboard.definition,
            element: <TeacherDashboardPage />,
          },
          {
            path: TeacherRoutes.students.definition,
            element: <ClassroomStudentsPage />,
          },
          {
            path: TeacherRoutes.plan.definition,
            element: <PlanPage />,
          },
          {
            path: TeacherRoutes.deckWizard.definition,
            element: <DeckWizardPage />,
          },
          {
            path: TeacherRoutes.annualPlan.definition,
            element: <AnnualPlanPage />,
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
            path: TeacherRoutes.present.definition,
            element: <PresentationMode />,
          },
          {
            path: TeacherRoutes.assignments.definition,
            element: <AssignmentsPage />,
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
            path: TeacherRoutes.projector.definition,
            element: <ProjectorPage />,
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
  };
};
