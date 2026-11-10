/* eslint-disable import/order */
/* eslint-disable no-duplicate-imports */
import { Suspense, lazy, useLayoutEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  ClassroomRoutes,
  ConnectRoutes,
  GameRoutes,
  GlobeRoutes,
  LearnRoutes,
  LibraryRoutes,
  ProfileRoutes,
  SettingsRoutes,
  SongRoutes,
  StudioRoutes,
  UserRoutes,
} from '@/constants/routes';
import { ContentGate } from '@/content/ContentGate';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { isEditorPath, preloadDaw } from '@/daw/preload';
import { EditorRouteBoundary } from '@/daw/shell/errors/EditorRouteBoundary';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';
import { GlobeSkeleton } from '@/layouts/DashboardLayout/GlobeSkeleton';
import { LibraryInlet } from '@/components/Library/libraryInlet';
import { LearnPage } from '@/components/learn/LearnPage';
import { exploreHref } from '@/features/learn/catalog/exploreState';
import { useWelcomeRedirect } from '@/features/welcome/useWelcomeGate';
import { GenrePathPage } from '@/features/learn/paths/GenrePathPage';
import { familyOfMode } from '@/features/learn/paths/theoryFamilies';
import { theoryBackRoute } from '@/features/learn/paths/theoryPath';
import { TheoryPathPage } from '@/features/learn/paths/TheoryPathPage';
import {
  LEARN_TABS,
  learnIndexRedirect,
  learnTabRedirect,
  learnTabRoute,
  type LearnTab,
} from '@/features/learn/learnPaths';
import {
  isLearnInstrumentEnabled,
  useChooseAudio,
  useInstrumentStore,
  useLearnChoice,
  useLearnInstrument,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import { ANATOMY_MOVES } from '@/curriculum/audio/anatomyMoves';
import { isBassTheorySlug } from '@/curriculum/data/bass/theoryCatalog';
import { isUkuleleTheorySlug } from '@/curriculum/data/ukulele/theoryCatalog';
import { isGuitarTheorySlug } from '@/curriculum/data/guitar/theoryCatalog';
import { GenreLessonRoute } from '@/curriculum/routes';
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
const SlideGlobePage = lazy(() => import('./slides/globe/SlideGlobePage'));
const ExplorePage = lazy(() =>
  import('@/components/explore/ExplorePage').then((m) => ({
    default: m.ExplorePage,
  })),
);
const ExploreSongsPage = lazy(() =>
  import('@/components/explore/ExploreSongsPage').then((m) => ({
    default: m.ExploreSongsPage,
  })),
);
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
const BassModeLesson = lazy(() => import('@/curriculum/pages/BassModeLesson'));
const UkuleleModeLesson = lazy(
  () => import('@/curriculum/pages/UkuleleModeLesson'),
);
const GuitarModeLesson = lazy(
  () => import('@/curriculum/pages/GuitarModeLesson'),
);
const AudioCoursePage = lazy(() =>
  import('@/curriculum/audio/CoursePage').then((m) => ({
    default: m.CoursePage,
  })),
);
const AudioLessonRoute = lazy(() =>
  import('@/curriculum/audio/AudioLessonRoute').then((m) => ({
    default: m.AudioLessonRoute,
  })),
);
const BassAnatomyPage = lazy(
  () => import('@/curriculum/anatomy/BassAnatomyPage'),
);
const KeyboardAnatomyPage = lazy(
  () => import('@/curriculum/anatomy/KeyboardAnatomyPage'),
);
const SynthAnatomyPage = lazy(
  () => import('@/curriculum/anatomy/SynthAnatomyPage'),
);
const ComboAmpAnatomyPage = lazy(
  () => import('@/curriculum/anatomy/ComboAmpAnatomyPage'),
);
const HeadphoneAnatomyPage = lazy(
  () => import('@/curriculum/anatomy/HeadphoneAnatomyPage'),
);
const MicrophoneAnatomyPage = lazy(
  () => import('@/curriculum/anatomy/MicrophoneAnatomyPage'),
);
const PianoAnatomyPage = lazy(
  () => import('@/curriculum/anatomy/PianoAnatomyPage'),
);
const UkuleleAnatomyPage = lazy(
  () => import('@/curriculum/anatomy/UkuleleAnatomyPage'),
);
// The song isn't licensed: this, its route and its tile stay out of production.
const LinusAndLucyLesson = import.meta.env.DEV
  ? lazy(() => import('@/curriculum/pages/LinusAndLucyLesson'))
  : null;
const GuitarAnatomyPage = lazy(
  () => import('@/curriculum/anatomy/GuitarAnatomyPage'),
);
const GuitarHarmonicsPage = lazy(
  () => import('@/curriculum/guitar/harmonics/GuitarHarmonicsPage'),
);
const GuitarRelativeModesOverview = lazy(
  () => import('@/components/learn/GuitarRelativeModesOverview'),
);

// The student's Classroom in Learn's look (owner, 2026-11-09).
const ClassroomPickerPage = lazy(() =>
  import('./home/StudentClassesPage').then(({ StudentClassesPage }) => ({
    default: StudentClassesPage,
  })),
);

const ClassroomHomePage = lazy(() =>
  import('./home/StudentClassPage').then(({ StudentClassPage }) => ({
    default: StudentClassPage,
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
  // A mode's page is its disc on its family's path now.
  if (familyOfMode(mode ?? '')) {
    return <Navigate replace to={theoryBackRoute('piano', mode ?? '')} />;
  }
  const inner = <ModeOverview mode={mode ?? 'ionian'} />;
  return mode === 'ionian' ? inner : <RequirePremium>{inner}</RequirePremium>;
};

const THEORY_TAB_ROUTE = LearnRoutes.root();

// Guitar teaches the Theory families its catalog has live (the diatonic
// modes, Ionian from The Guitar Atlas: Book One, first); the Theory tab marks
// the rest as coming soon, and their links go back to it, ungated.
const isGuitarTheoryMode = isGuitarTheorySlug;

const GuitarOverviewRoute = () => {
  const { mode } = useParams<{ mode: string }>();
  if (!isGuitarTheoryMode(mode)) {
    return <Navigate replace to={THEORY_TAB_ROUTE} />;
  }
  return <Navigate replace to={theoryBackRoute('guitar', mode ?? '')} />;
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
  return <Navigate replace to={theoryBackRoute('bass', mode ?? '')} />;
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
  return <Navigate replace to={theoryBackRoute('ukulele', mode ?? '')} />;
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
 * Bare /learn: shelves of courses and songs in Suno's layout (owner,
 * 2026-11-04; it took the place of the dashboard). A student never welcomed
 * goes to /welcome first from bare /learn, as the dashboard sent them. An old ?tab= link
 * opens its tab's page (/learn?tab=Songs → /songs), and an old one-page
 * anchor (/learn#guitar-theory) its section.
 */
const LearnIndexRoute = () => {
  const instrument = useLearnInstrument();
  const welcome = useWelcomeRedirect();
  const { search, hash } = useLocation();
  const to = learnIndexRedirect(instrument, search, hash);
  if (to) return <Navigate replace to={to} />;
  // Bare /learn only: a section, a search or a lesson's way back is a deep
  // link, which the welcome never interrupts.
  if (welcome && !search) return <Navigate replace to={welcome} />;
  return <ExplorePage />;
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
  const current = useLearnChoice();
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
  // These used to be pages. Now they're places in Explore.
  if (!tab) return <Navigate replace to={exploreHref(instrument)} />;
  if (tab === 'Songs') {
    return <Navigate replace to={{ pathname: SongRoutes.root(), search }} />;
  }
  if (tab === 'Theory') {
    return <Navigate replace to={exploreHref(instrument, 'theory')} />;
  }
  if (tab === 'Technique') {
    return <Navigate replace to={exploreHref(instrument, 'technique')} />;
  }
  if (tab === 'Genre') {
    return <Navigate replace to={exploreHref('piano', 'genres')} />;
  }
  return <LearnPage tab={tab} />;
};

/** An old link, sent on with its query, so ?tab=build&part=frets still opens
 *  what it did. */
const MovedTo = ({ to }: { to: string }) => {
  const { search, hash } = useLocation();
  return <Navigate replace to={{ pathname: to, search, hash }} />;
};

/** /learn/audio: Audio's place in Explore. */
const AudioRoute = () => {
  useChooseAudio();
  return <Navigate replace to={exploreHref('audio')} />;
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
      // A Theory family's path. Static 'theory', so it outranks '/:mode/:key'.
      ...(['piano', 'guitar', 'bass', 'ukulele'] as const).map(
        (instrument) => ({
          path: `${learnTabRoute(instrument, 'Theory')}/:family`,
          element: <TheoryPathPage instrument={instrument} />,
        }),
      ),
      // Audio: one page whatever the instrument, and its labs.
      {
        path: LearnRoutes.audio.definition,
        element: <AudioRoute />,
      },
      // The Anatomy lessons, Premium like everything in Audio past Sound Basics.
      // Static, so they outrank the labs' '/audio/:module/:lesson'.
      ...(
        [
          [LearnRoutes.pianoAnatomy, PianoAnatomyPage],
          [LearnRoutes.keyboardAnatomy, KeyboardAnatomyPage],
          [LearnRoutes.synthAnatomy, SynthAnatomyPage],
          [LearnRoutes.guitarAnatomy, GuitarAnatomyPage],
          [LearnRoutes.bassAnatomy, BassAnatomyPage],
          [LearnRoutes.ukuleleAnatomy, UkuleleAnatomyPage],
          [LearnRoutes.microphoneAnatomy, MicrophoneAnatomyPage],
          [LearnRoutes.comboAmpAnatomy, ComboAmpAnatomyPage],
          [LearnRoutes.headphoneAnatomy, HeadphoneAnatomyPage],
        ] as const
      ).map(([route, Page]) => ({
        path: route.definition,
        element: (
          <RequirePremium>
            <Page />
          </RequirePremium>
        ),
      })),
      // Where they used to be, under Technique and Gear. These stay registered,
      // or an old link would fall through to '/:mode/:key' as a lesson.
      ...ANATOMY_MOVES.map(({ from, to }) => ({
        path: from,
        element: <MovedTo to={to()} />,
      })),
      {
        path: LearnRoutes.audioCourse.definition,
        element: <AudioCoursePage />,
      },
      {
        path: LearnRoutes.audioLesson.definition,
        element: <AudioLessonRoute />,
      },
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
        element: <GenrePathPage />,
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
      ...(LinusAndLucyLesson
        ? [
            {
              path: LearnRoutes.linusAndLucy.definition,
              element: <LinusAndLucyLesson />,
            },
          ]
        : []),
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
          <ContentGate fallback={<GlobeSkeleton />}>
            <Atlas />
          </ContentGate>
        ),
      },
    ],
  };
};

/**
 * The Globe's map alone, for a lesson slide's frame (owner, 2026-11-10): no
 * sidebar, rails or Inspector. Its own route so the map's address is the
 * frame's, never the lesson's.
 */
export const globeSlidePages = () => ({
  path: GlobeRoutes.slide.definition,
  element: (
    <AppContext>
      <ProtectedPage>
        <ContentGate fallback={<div className="h-dvh w-screen bg-black" />}>
          <Suspense fallback={<div className="h-dvh w-screen bg-black" />}>
            <SlideGlobePage />
          </Suspense>
        </ContentGate>
      </ProtectedPage>
    </AppContext>
  ),
});

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
      // The library, in Suno's layout (owner, 2026-11-04).
      {
        index: true,
        element: (
          <ContentGate needs={['songs']}>
            <ExploreSongsPage />
          </ContentGate>
        ),
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
