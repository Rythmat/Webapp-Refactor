/* eslint-disable import/order */
/* eslint-disable no-duplicate-imports */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ClassroomRoutes,
  GameRoutes,
  StudioRoutes,
  ProfileRoutes,
  LearnRoutes,
  ConnectRoutes,
  LibraryRoutes,
  AtlasRoutes,
  SongRoutes,
  UserRoutes,
  SettingsRoutes,
} from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';
import { LibraryInlet } from '@/components/Library/libraryInlet';
import { LearnInlet } from '@/components/learn/LearnInlet';
import { AwardsInlet } from '@/components/Awards/AwardsInlet';
import { PlanPage } from '@/features/settings/PlanPage';
import { SettingsHub } from '@/features/settings/SettingsHub';
import { AboutSection } from '@/features/settings/sections/hub/AboutSection';
import { AccountSection } from '@/features/settings/sections/hub/AccountSection';
import { AudioSection } from '@/features/settings/sections/hub/AudioSection';
import { BillingSection } from '@/features/settings/sections/hub/BillingSection';
import { HelpSection } from '@/features/settings/sections/hub/HelpSection';
import { LookAndFeelSection } from '@/features/settings/sections/hub/LookAndFeelSection';
import { MidiSection } from '@/features/settings/sections/hub/MidiSection';
import { UserPage } from '@/features/user/UserPage';
import { RequirePremium } from '@/components/ui/RequirePremium';

import { useParams, useSearchParams } from 'react-router-dom';
import { LessonContainer } from '@/components/Games/LessonContainer';
import { ArcadeInlet } from '@/components/Games/ArcadeInlet';
import Atlas from '@/components/atlas/atlas';
const SongDetailPage = lazy(() =>
  import('@/components/songLibrary/SongDetailPage').then((m) => ({
    default: m.SongDetailPage,
  })),
);
import { PrismModeSlug } from '@/hooks/data';
import { ModeOverview } from '@/components/learn/ModeOverview';
import { RelativeModesOverview } from '@/components/learn/RelativeModesOverview';
import { ParallelModesOverview } from '@/components/learn/ParallelModesOverview';

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

const PresentationMode = lazy(() =>
  import('./PresentationMode').then(({ PresentationMode }) => ({
    default: PresentationMode,
  })),
);

const ClassroomPlanPage = lazy(() =>
  import('./plan/PlanPage').then(({ PlanPage }) => ({
    default: PlanPage,
  })),
);

const DayEditor = lazy(() =>
  import('./plan/DayEditor').then(({ DayEditor }) => ({
    default: DayEditor,
  })),
);

const ChromaPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ ChromaPage }) => ({
    default: ChromaPage,
  })),
);

const BoardChoicePage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ BoardChoicePage }) => ({
    default: BoardChoicePage,
  })),
);

const ChordConnectionPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ ChordConnectionPage }) => ({
    default: ChordConnectionPage,
  })),
);

const ChordPressPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ ChordPressPage }) => ({
    default: ChordPressPage,
  })),
);

const PlayAlongPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ PlayAlongPage }) => ({
    default: PlayAlongPage,
  })),
);

const FoliPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ FoliPage }) => ({
    default: FoliPage,
  })),
);

const MajorArcanumPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ MajorArcanumPage }) => ({
    default: MajorArcanumPage,
  })),
);

const ConstellationsPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ ConstellationsPage }) => ({
    default: ConstellationsPage,
  })),
);

const GrooveLabPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ GrooveLabPage }) => ({
    default: GrooveLabPage,
  })),
);

const WaveSculptorPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ WaveSculptorPage }) => ({
    default: WaveSculptorPage,
  })),
);

const HarmonicStringsPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ HarmonicStringsPage }) => ({
    default: HarmonicStringsPage,
  })),
);

const SignalFlowPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ SignalFlowPage }) => ({
    default: SignalFlowPage,
  })),
);

const DawApp = lazy(() =>
  import('@/daw/DawApp').then(({ DawApp }) => ({
    default: DawApp,
  })),
);

const HomeInlet = lazy(() =>
  import('@/components/ClassroomLayout/HomeInlet').then(({ HomeInlet }) => ({
    default: HomeInlet,
  })),
);

const ConnectInlet = lazy(() =>
  import('@/components/Profile/connectInlet').then(({ ConnectInlet }) => ({
    default: ConnectInlet,
  })),
);

const JamLobby = lazy(() =>
  import('@/components/JamRoom').then(({ JamLobby }) => ({
    default: JamLobby,
  })),
);

const JamRoom = lazy(() =>
  import('@/components/JamRoom').then(({ JamRoom }) => ({
    default: JamRoom,
  })),
);

const JamLocalRoom = lazy(() =>
  import('@/components/JamRoom').then(({ JamLocalRoom }) => ({
    default: JamLocalRoom,
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
        path: ClassroomRoutes.present.definition,
        element: <PresentationMode />,
      },
      {
        path: ClassroomRoutes.plan.definition,
        element: <ClassroomPlanPage />,
      },
      {
        path: ClassroomRoutes.dayEditor.definition,
        element: <DayEditor />,
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
        element: <ArcadeInlet />,
        index: true,
      },
      {
        path: GameRoutes.chroma.definition,
        element: <ChromaPage />,
      },
      {
        path: GameRoutes.boardChoice.definition,
        element: <BoardChoicePage />,
      },
      {
        path: GameRoutes.chordConnection.definition,
        element: <ChordConnectionPage />,
      },
      {
        path: GameRoutes.chordPress.definition,
        element: <ChordPressPage />,
      },
      {
        path: GameRoutes.playAlong.definition,
        element: (
          <RequirePremium>
            <PlayAlongPage />
          </RequirePremium>
        ),
      },
      {
        path: GameRoutes.foli.definition,
        element: (
          <RequirePremium>
            <FoliPage />
          </RequirePremium>
        ),
      },
      {
        path: GameRoutes.majorArcanum.definition,
        element: (
          <RequirePremium>
            <MajorArcanumPage />
          </RequirePremium>
        ),
      },
      {
        path: GameRoutes.constellations.definition,
        element: (
          <RequirePremium>
            <ConstellationsPage />
          </RequirePremium>
        ),
      },
      {
        path: GameRoutes.grooveLab.definition,
        element: (
          <RequirePremium>
            <GrooveLabPage />
          </RequirePremium>
        ),
      },
      {
        path: GameRoutes.waveSculptor.definition,
        element: (
          <RequirePremium>
            <WaveSculptorPage />
          </RequirePremium>
        ),
      },
      {
        path: GameRoutes.harmonicStrings.definition,
        element: <HarmonicStringsPage />,
      },
      {
        path: GameRoutes.signalFlow.definition,
        element: (
          <RequirePremium>
            <SignalFlowPage />
          </RequirePremium>
        ),
      },
      {
        path: GameRoutes.jamLobby.definition,
        element: (
          <RequirePremium>
            <JamLobby />
          </RequirePremium>
        ),
      },
      {
        path: GameRoutes.jamLocal.definition,
        element: (
          <RequirePremium>
            <JamLocalRoom />
          </RequirePremium>
        ),
      },
      {
        path: GameRoutes.jamRoom.definition,
        element: (
          <RequirePremium>
            <JamRoom />
          </RequirePremium>
        ),
      },
    ],
  };
};

export const studioPages = () => {
  return {
    path: StudioRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        element: <DawApp />,
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
      {
        path: ProfileRoutes.profile.definition,
        element: <Navigate to={UserRoutes.root()} replace />,
      },
      { path: ProfileRoutes.awards.definition, element: <AwardsInlet /> },
      { path: ProfileRoutes.plan.definition, element: <PlanPage /> },
      {
        path: ProfileRoutes.settings.definition,
        element: <Navigate to={SettingsRoutes.root()} replace />,
      },
    ],
  };
};

export const userPages = () => {
  return {
    path: UserRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [{ index: true, element: <UserPage /> }],
  };
};

export const settingsPages = () => {
  return {
    path: SettingsRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        element: <SettingsHub />,
        children: [
          { index: true, element: <Navigate to="account" replace /> },
          {
            path: 'profile',
            element: <Navigate to={UserRoutes.root()} replace />,
          },
          { path: 'account', element: <AccountSection /> },
          { path: 'billing', element: <BillingSection /> },
          { path: 'audio', element: <AudioSection /> },
          { path: 'look-and-feel', element: <LookAndFeelSection /> },
          { path: 'midi', element: <MidiSection /> },
          { path: 'help', element: <HelpSection /> },
          { path: 'about', element: <AboutSection /> },
        ],
      },
    ],
  };
};

const LessonRoute = () => {
  const { mode, key: keyParam } = useParams<{
    mode: PrismModeSlug;
    key: string;
  }>();
  const [searchParams] = useSearchParams();
  const startActivity = searchParams.get('activity') ?? undefined;

  // Free users can access C Ionian only
  const isFreeLesson = mode === 'ionian' && keyParam?.toLowerCase() === 'c';
  const inner = (
    <LessonContainer
      modeSlug={mode ?? 'ionian'}
      rootKey={keyParam}
      startAtActivityKey={startActivity}
    />
  );

  return isFreeLesson ? inner : <RequirePremium>{inner}</RequirePremium>;
};

const OverviewRoute = () => {
  const { mode } = useParams<{
    mode: PrismModeSlug;
  }>();

  // Free users can access Ionian overview only
  const inner = <ModeOverview mode={mode ?? 'ionian'} />;
  return mode === 'ionian' ? inner : <RequirePremium>{inner}</RequirePremium>;
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
        element: <LearnInlet />,
      },
      {
        path: LearnRoutes.overview.definition,
        element: <OverviewRoute />,
      },
      {
        path: LearnRoutes.lesson.definition,
        element: <LessonRoute />,
      },
      {
        path: LearnRoutes.relativeOverview.definition,
        element: (
          <RequirePremium>
            <RelativeModesOverview />
          </RequirePremium>
        ),
      },
      {
        path: LearnRoutes.parallelOverview.definition,
        element: (
          <RequirePremium>
            <ParallelModesOverview />
          </RequirePremium>
        ),
      },
    ],
  };
};

export const connectPages = () => {
  return {
    path: ConnectRoutes.root.definition,
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
        element: <ConnectInlet />,
      },
    ],
  };
};

export const libraryPages = () => {
  return {
    path: LibraryRoutes.root.definition,
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
        element: <LibraryInlet />,
      },
    ],
  };
};

export const atlasPages = () => {
  return {
    path: AtlasRoutes.root.definition,
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
        element: <Atlas />,
      },
    ],
  };
};

export const songsPages = () => {
  return {
    path: SongRoutes.root.definition,
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
        element: <Navigate to={LearnRoutes.root()} replace />,
      },
      {
        path: ':songId',
        element: <SongDetailPage />,
      },
    ],
  };
};
