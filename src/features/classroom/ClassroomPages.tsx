/* eslint-disable import/order */
/* eslint-disable no-duplicate-imports */
import { lazy, useLayoutEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  ClassroomRoutes,
  GameRoutes,
  StudioRoutes,
  ProfileRoutes,
  LearnRoutes,
  ConnectRoutes,
  LibraryRoutes,
  GlobeRoutes,
  SongRoutes,
  UserRoutes,
  SettingsRoutes,
} from '@/constants/routes';
import { ContentGate } from '@/content/ContentGate';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { isEditorPath, preloadDaw } from '@/daw/preload';
import { EditorRouteBoundary } from '@/daw/shell/errors/EditorRouteBoundary';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';
import { LibraryInlet } from '@/components/Library/libraryInlet';
import { LearnPage } from '@/components/learn/LearnPage';
import {
  LEARN_TABS,
  learnTabRedirect,
  learnTabRoute,
  type LearnTab,
} from '@/features/learn/learnPaths';
import {
  isLearnInstrumentEnabled,
  useInstrumentStore,
  useLearnInstrument,
  useLearnPageRoute,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import { isBassTheorySlug } from '@/curriculum/data/bass/theoryCatalog';
import { isUkuleleTheorySlug } from '@/curriculum/data/ukulele/theoryCatalog';
import { isGuitarTheorySlug } from '@/curriculum/data/guitar/theoryCatalog';
import { GenreLessonRoute, GenreOverviewRoute } from '@/curriculum/routes';
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
// Lazy on purpose: a static import put the whole atlas chunk on the eager
// boot graph for every user on every route.
const Atlas = lazy(() => import('@/components/atlas/atlas'));
const SongDetailPage = lazy(() =>
  import('@/components/songLibrary/SongDetailPage').then((m) => ({
    default: m.SongDetailPage,
  })),
);
const SetListsIndexPage = lazy(() =>
  import('@/features/setlists/pages/SetListsIndexPage').then((m) => ({
    default: m.SetListsIndexPage,
  })),
);
const SetListWorkspace = lazy(() =>
  import('@/features/setlists/pages/SetListWorkspace').then((m) => ({
    default: m.SetListWorkspace,
  })),
);
const SetListPrintPage = lazy(() =>
  import('@/features/setlists/print/SetListPrintPage').then((m) => ({
    default: m.SetListPrintPage,
  })),
);
import { PrismModeSlug } from '@/hooks/data';
import { ModeOverview } from '@/components/learn/ModeOverview';
import { RelativeModesOverview } from '@/components/learn/RelativeModesOverview';
import { ParallelModesOverview } from '@/components/learn/ParallelModesOverview';
// Guitar's Theory pages load on demand: the book's data, the guitar views and
// the lesson container stay out of the piano path's bundle.
const GuitarModeOverview = lazy(
  () => import('@/components/learn/GuitarModeOverview'),
);
const BassModeOverview = lazy(
  () => import('@/components/learn/BassModeOverview'),
);
const BassModeLesson = lazy(() => import('@/curriculum/pages/BassModeLesson'));
const UkuleleModeOverview = lazy(
  () => import('@/components/learn/UkuleleModeOverview'),
);
const UkuleleModeLesson = lazy(
  () => import('@/curriculum/pages/UkuleleModeLesson'),
);
const GuitarModeLesson = lazy(
  () => import('@/curriculum/pages/GuitarModeLesson'),
);
const GuitarHarmonicsPage = lazy(
  () => import('@/curriculum/guitar/harmonics/GuitarHarmonicsPage'),
);
const GuitarRelativeModesOverview = lazy(
  () => import('@/components/learn/GuitarRelativeModesOverview'),
);

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

const AssignmentsPage = lazy(() =>
  import('./assignments/AssignmentsPage').then(({ AssignmentsPage }) => ({
    default: AssignmentsPage,
  })),
);

const AssignmentDayRunner = lazy(() =>
  import('./assignments/AssignmentDayRunner').then(
    ({ AssignmentDayRunner }) => ({
      default: AssignmentDayRunner,
    }),
  ),
);

const AssignmentInstructionsPage = lazy(() =>
  import('./assignments/AssignmentInstructionsPage').then(
    ({ AssignmentInstructionsPage }) => ({
      default: AssignmentInstructionsPage,
    }),
  ),
);

const LiveSessionPage = lazy(() =>
  import('./live/LiveSessionPage').then(({ LiveSessionPage }) => ({
    default: LiveSessionPage,
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

const EchoPage = lazy(() =>
  import('@/components/Games/arcadePages').then(({ EchoPage }) => ({
    default: EchoPage,
  })),
);

const DawApp = lazy(() =>
  preloadDaw().then(({ DawApp }) => ({
    default: DawApp,
  })),
);

// A boot straight onto the editor (a link, a refresh) fetches its chunk now,
// beside sign-in, instead of once the route first renders behind it.
if (typeof window !== 'undefined' && isEditorPath(window.location.pathname)) {
  preloadDaw().catch(() => {});
}

const StudioProductionPage = lazy(() =>
  import('@/components/ClassroomLayout/studio/StudioProductionPage').then(
    ({ StudioProductionPage }) => ({
      default: StudioProductionPage,
    }),
  ),
);

/**
 * The editor's old address, `/studio/editor`, forwards to `/studio` with its
 * query and hash: links, bookmarks, lessons and kept drafts still open.
 */
function LegacyEditorRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={`${StudioRoutes.editor()}${search}${hash}`} replace />;
}

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
    // Gated at the group shell rather than per route: slide decks resolve songs
    // for artwork and titles from several components deep in this tree
    // (SlideMediaPanel, SlideLiveLayer, DeckWizardPage), and missing one of them
    // would show a teacher a deck with blank media rather than an error.
    element: (
      <AppContext>
        <ProtectedPage>
          <ContentGate needs={['songs']}>
            <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
          </ContentGate>
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
        path: ClassroomRoutes.assignments.definition,
        element: <AssignmentsPage />,
      },
      {
        path: ClassroomRoutes.assignmentDayRun.definition,
        element: <AssignmentDayRunner />,
      },
      {
        path: ClassroomRoutes.assignmentInstructions.definition,
        element: <AssignmentInstructionsPage />,
      },
      {
        path: ClassroomRoutes.live.definition,
        element: <LiveSessionPage />,
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
        // Free to play its levels (Peter, 2026-10-21); the Circle, any key
        // at all, is what upgrading opens, inside the game.
        path: GameRoutes.majorArcanum.definition,
        element: <MajorArcanumPage />,
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
        // Free: the last stop of Start Here.
        path: GameRoutes.echo.definition,
        element: <EchoPage />,
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
      // `/studio` is the DAW editor (owner, 2026-10-24: the Studio Dashboard
      // and its Templates / Demos tabs are gone), opened with
      // ?project=/?new=1/?template=/?demo=/?collab=. No content gate: the
      // editor paints at once, and a ?song= open waits for the song library
      // itself (openSession's prepareSong).
      {
        index: true,
        element: (
          <EditorRouteBoundary>
            <DawApp />
          </EditorRouteBoundary>
        ),
      },
      // The DAW lessons, which the tutorials start from.
      {
        path: 'production',
        element: <StudioProductionPage />,
      },
      { path: 'editor/*', element: <LegacyEditorRedirect /> },
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
  // ?section=O|A|B opens that chapter; none resumes where the student was.
  const section = searchParams.get('section') ?? undefined;

  // Free users can access C Ionian only
  const isFreeLesson = mode === 'ionian' && keyParam?.toLowerCase() === 'c';
  const inner = (
    <LessonContainer
      modeSlug={mode ?? 'ionian'}
      rootKey={keyParam}
      startAtSection={section}
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

const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });

// Guitar teaches the Theory families its catalog has live (the diatonic
// modes, Ionian from The Guitar Atlas: Book One, first); the Theory tab marks
// the rest as coming soon, and their links go back to it, ungated.
const isGuitarTheoryMode = isGuitarTheorySlug;

const GuitarOverviewRoute = () => {
  const { mode } = useParams<{ mode: string }>();
  if (!isGuitarTheoryMode(mode)) {
    return <Navigate replace to={THEORY_TAB_ROUTE} />;
  }
  // As on piano, free users can access the Ionian overview only
  const inner = <GuitarModeOverview />;
  return mode === 'ionian' ? inner : <RequirePremium>{inner}</RequirePremium>;
};

const GuitarLessonRoute = () => {
  const { mode, key: keyParam } = useParams<{ mode: string; key: string }>();
  if (!isGuitarTheoryMode(mode)) {
    return <Navigate replace to={THEORY_TAB_ROUTE} />;
  }
  // As on piano, free users can access C Ionian only
  const isFreeLesson = mode === 'ionian' && keyParam?.toLowerCase() === 'c';
  const inner = <GuitarModeLesson />;
  return isFreeLesson ? inner : <RequirePremium>{inner}</RequirePremium>;
};

// Bass teaches every Theory tile its catalog has live, from The Bass Atlas;
// as on guitar, C Ionian is free and the rest Premium.
const BassOverviewRoute = () => {
  const { mode } = useParams<{ mode: string }>();
  if (!isBassTheorySlug(mode)) {
    return <Navigate replace to={THEORY_TAB_ROUTE} />;
  }
  const inner = <BassModeOverview />;
  return mode === 'ionian' ? inner : <RequirePremium>{inner}</RequirePremium>;
};

const BassLessonRoute = () => {
  const { mode, key: keyParam } = useParams<{ mode: string; key: string }>();
  if (!isBassTheorySlug(mode)) {
    return <Navigate replace to={THEORY_TAB_ROUTE} />;
  }
  const isFreeLesson = mode === 'ionian' && keyParam?.toLowerCase() === 'c';
  const inner = <BassModeLesson />;
  return isFreeLesson ? inner : <RequirePremium>{inner}</RequirePremium>;
};

// Ukulele teaches every Theory tile its catalog has live, from The Ukulele
// Atlas; as on guitar, C Ionian is free and the rest Premium.
const UkuleleOverviewRoute = () => {
  const { mode } = useParams<{ mode: string }>();
  if (!isUkuleleTheorySlug(mode)) {
    return <Navigate replace to={THEORY_TAB_ROUTE} />;
  }
  const inner = <UkuleleModeOverview />;
  return mode === 'ionian' ? inner : <RequirePremium>{inner}</RequirePremium>;
};

const UkuleleLessonRoute = () => {
  const { mode, key: keyParam } = useParams<{ mode: string; key: string }>();
  if (!isUkuleleTheorySlug(mode)) {
    return <Navigate replace to={THEORY_TAB_ROUTE} />;
  }
  const isFreeLesson = mode === 'ionian' && keyParam?.toLowerCase() === 'c';
  const inner = <UkuleleModeLesson />;
  return isFreeLesson ? inner : <RequirePremium>{inner}</RequirePremium>;
};

/**
 * Bare /learn: the Learn page for the chosen instrument; an old ?tab= link
 * its tab's page there (/learn?tab=Songs → /learn/keyboard/songs).
 */
const LearnIndexRoute = () => {
  const instrument = useLearnInstrument();
  const to = useLearnPageRoute();
  const { search } = useLocation();
  return (
    <Navigate
      replace
      to={learnTabRedirect(instrument, search) ?? `${to}${search}`}
    />
  );
};

/**
 * /learn/keyboard and /learn/guitar, and their tabs' pages
 * (/learn/keyboard/songs…): the Learn page on that instrument. The address
 * chooses it, so a shared link opens on its instrument; guitar sends to
 * keyboard while its rollout flag is off. A ?tab= left on one (a link
 * written for the old hub) opens that tab's page.
 */
const LearnInstrumentRoute = ({
  instrument,
  tab,
}: {
  instrument: LearnInstrument;
  tab?: LearnTab;
}) => {
  const { search } = useLocation();
  const current = useLearnInstrument();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const available = isLearnInstrumentEnabled(instrument);
  useLayoutEffect(() => {
    if (available && current !== instrument) setInstrument(instrument);
  }, [available, current, instrument, setInstrument]);
  if (!available) {
    return (
      <Navigate
        replace
        to={tab ? learnTabRoute('piano', tab) : LearnRoutes.keyboard()}
      />
    );
  }
  const tabLink = learnTabRedirect(instrument, search);
  if (tabLink) return <Navigate replace to={tabLink} />;
  // Bass teaches Theory alone so far: its page is the Theory tab.
  if (instrument === 'bass' && tab !== 'Theory') {
    return <Navigate replace to={learnTabRoute('bass', 'Theory')} />;
  }
  // Ukulele teaches Theory, and Songs show its chord boxes.
  if (instrument === 'ukulele' && tab !== 'Theory' && tab !== 'Songs') {
    return <Navigate replace to={learnTabRoute('ukulele', 'Theory')} />;
  }
  return <LearnPage tab={tab} />;
};

/** Each tab's page on each instrument. Static paths, so /learn/guitar/songs
 *  outranks the guitar lessons' '/learn/guitar/:mode'. */
const learnTabPages = (['piano', 'guitar', 'bass', 'ukulele'] as const).flatMap(
  (instrument) =>
    LEARN_TABS.map((tab) => ({
      path: learnTabRoute(instrument, tab),
      element: <LearnInstrumentRoute instrument={instrument} tab={tab} />,
    })),
);

export const learnPages = () => {
  return {
    path: LearnRoutes.root.definition,
    // LearnHome, useLearnActivity and useInterestProfile all resolve songs.
    element: (
      <AppContext>
        <ProtectedPage>
          <ContentGate needs={['songs']}>
            <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
          </ContentGate>
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        index: true,
        element: <LearnIndexRoute />,
      },
      {
        path: LearnRoutes.keyboard.definition,
        element: <LearnInstrumentRoute instrument="piano" />,
      },
      ...learnTabPages,
      {
        path: LearnRoutes.keyboardOverview.definition,
        element: <OverviewRoute />,
      },
      {
        path: LearnRoutes.keyboardLesson.definition,
        element: <LessonRoute />,
      },
      // The genre courses: static 'genre' segment, so these outrank
      // '/:mode' and '/:mode/:key'.
      {
        path: LearnRoutes.genreCourse.definition,
        element: <GenreOverviewRoute />,
      },
      {
        path: LearnRoutes.genreLesson.definition,
        element: <GenreLessonRoute />,
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
      // Guitar: Theory → the diatonic modes. Static 'guitar' segment, so
      // these outrank '/:mode' and '/:mode/:key'.
      {
        path: LearnRoutes.guitar.definition,
        element: <LearnInstrumentRoute instrument="guitar" />,
      },
      // Technique → Guitar Harmonics. Free on purpose (every Technique tile
      // shows unlocked); static, so it outranks '/guitar/:mode/:key'.
      {
        path: LearnRoutes.guitarHarmonics.definition,
        element: <GuitarHarmonicsPage />,
      },
      // Theory → Relative Modes on guitar: a key's seven positions. Premium,
      // as on keyboard; static 'relative', so it outranks '/guitar/:mode/:key'.
      {
        path: LearnRoutes.guitarRelativeOverview.definition,
        element: (
          <RequirePremium>
            <GuitarRelativeModesOverview />
          </RequirePremium>
        ),
      },
      {
        path: LearnRoutes.guitarOverview.definition,
        element: <GuitarOverviewRoute />,
      },
      {
        path: LearnRoutes.guitarLesson.definition,
        element: <GuitarLessonRoute />,
      },
      // Bass: Theory, from The Bass Atlas. Static 'bass' segment, so these
      // outrank '/:mode' and '/:mode/:key'.
      {
        path: LearnRoutes.bass.definition,
        element: <LearnInstrumentRoute instrument="bass" />,
      },
      {
        path: LearnRoutes.bassOverview.definition,
        element: <BassOverviewRoute />,
      },
      {
        path: LearnRoutes.bassLesson.definition,
        element: <BassLessonRoute />,
      },
      // Ukulele: Theory, from The Ukulele Atlas, as bass's.
      {
        path: LearnRoutes.ukulele.definition,
        element: <LearnInstrumentRoute instrument="ukulele" />,
      },
      {
        path: LearnRoutes.ukuleleOverview.definition,
        element: <UkuleleOverviewRoute />,
      },
      {
        path: LearnRoutes.ukuleleLesson.definition,
        element: <UkuleleLessonRoute />,
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

export const globePages = () => {
  return {
    path: GlobeRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage>
          <ClassroomDashboard fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      // The Globe, one full-window page (owner, 2026-10-29: the /atlas
      // dashboard and its addresses are gone). It reads MUSIC_HISTORY, which
      // is hydrated from the published CDN bundle — ContentGate holds the
      // render until it has landed.
      {
        index: true,
        element: (
          <ContentGate>
            <Atlas />
          </ContentGate>
        ),
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
        path: 'setlists',
        element: (
          <ContentGate needs={['songs']}>
            <SetListsIndexPage />
          </ContentGate>
        ),
      },
      {
        path: 'setlists/:setListId/print',
        element: (
          <ContentGate needs={['songs']}>
            <SetListPrintPage />
          </ContentGate>
        ),
      },
      {
        path: 'setlists/:setListId',
        element: (
          <ContentGate needs={['songs']}>
            <SetListWorkspace />
          </ContentGate>
        ),
      },
      {
        path: ':songId',
        element: (
          <ContentGate needs={['songs']}>
            <SongDetailPage />
          </ContentGate>
        ),
      },
    ],
  };
};
