import { type RefObject, Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { MobileChordNotationBar } from '@/components/ClassroomLayout/ChordNotationSwitcher';
import { PageTopFade, TopRail } from '@/components/ClassroomLayout/TopRail';
import { cn } from '@/components/utilities';
import { ProfileRoutes } from '@/constants/routes';
import { isEditorPath } from '@/daw/preload';
import { DawSkeleton } from '@/daw/shell/DawSkeleton';
import { useCortexCapture } from '@/features/cortex/useCortexCapture';
import { LearnTourLayer } from '@/features/learnTour/LearnTourLayer';
import { PlayerBridge } from '@/features/library/player/PlayerBridge';
import { QueuePanel } from '@/features/library/player/QueuePanel';
import {
  playerActive,
  usePlayer,
} from '@/features/library/player/libraryPlayer';
import {
  isOfficeFramePath,
  isOfficePresentPath,
} from '@/features/office/frame/officeNav';
import { useProgressBootstrap } from '@/hooks/data';
import { useStampEarnedAwards } from '@/hooks/data/useAwards';
import { useStreakPing } from '@/hooks/data/useStreak';
import { useChallengeWatcher } from '@/hooks/useChallengeWatcher';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ActivityPlayBar, shouldShowPlayBar } from './ActivityPlayBar';
import { AppRail, isIconRailPath } from './AppRail';
import { GlobeSkeleton } from './GlobeSkeleton';
import { DESK_QUERY, useAppRail } from './appRailStore';
import {
  isAudioPlayerPath,
  isFundamentalsLessonPath,
  isGlobePath,
  isGuidedLessonPath,
} from './focusPaths';
import '@/components/ClassroomLayout/dashboard/dashboard.css';

/** How long the scrollbar stays after the page stops scrolling. */
const SCROLLBAR_LINGER_MS = 1000;

/**
 * Keeps the page's scrollbar out of sight but while it scrolls (owner,
 * 2026-11-10, Home): the scroller is marked idle (dashboard.css clears the
 * thumb) until it moves, and again a second after it stops.
 */
function useScrollbarWhileScrolling(
  scroller: RefObject<HTMLElement>,
  enabled: boolean,
) {
  useEffect(() => {
    const el = scroller.current;
    if (!enabled || !el) return undefined;
    let timer = 0;
    el.setAttribute('data-scrollbar-idle', '');
    const onScroll = () => {
      el.removeAttribute('data-scrollbar-idle');
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => el.setAttribute('data-scrollbar-idle', ''),
        SCROLLBAR_LINGER_MS,
      );
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
      el.removeAttribute('data-scrollbar-idle');
    };
  }, [scroller, enabled]);
}

export const ClassroomDashboard = (props: { fallback?: React.ReactNode }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useProgressBootstrap();
  useChallengeWatcher();
  useStreakPing();
  useStampEarnedAwards();
  useCortexCapture();

  // Only the DAW editor (`/studio`) needs the full-viewport, no-scroll
  // treatment; `/studio/production`, the DAW lessons, is a normal inlet.
  // It is also in focus mode (owner decision 7): no TopRail or
  // chord-notation bar. Since 2026-11-10 it has the app rail like every
  // page (owner: Samply's sidebar everywhere), opened from its top bar.
  const isStudioEditor = isEditorPath(pathname);
  // The Globe has its own top and bottom rails in the Studio's frame (owner,
  // 2026-10-29), with the app's navigation at its left (owner, 2026-10-30).
  // Its height is the dynamic viewport's, so the bottom rail stays above a
  // phone's toolbar.
  const isGlobe = isGlobePath(pathname);
  // A guided Audio lesson takes the whole window too (owner, 2026-11-01).
  // So does any other lesson that's gone guided (owner, 2026-11-02).
  // And Piano Fundamentals' lessons, on the same player (owner, 2026-11-05).
  // And so does Present, the lesson on the class screen (owner, 2026-11-09).
  const isAudioPlayer =
    isOfficePresentPath(pathname) ||
    isAudioPlayerPath(pathname) ||
    isGuidedLessonPath(pathname) ||
    isFundamentalsLessonPath(pathname);
  // The Office draws the Studio's frame too (owner, 2026-11-09): its own top
  // and bottom rails, the app's navigation at its left, as the Globe.
  const isOffice = isOfficeFramePath(pathname);
  const framed = isGlobe || isOffice;
  const focus = isStudioEditor || framed || isAudioPlayer;
  // The player carries on from page to page while it holds something
  // (owner, 2026-11-11), in the Recent activity bar.
  const playerHolds = usePlayer(playerActive);
  // Suno's frame (owner, 2026-11-10): the rail and the page as rounded
  // panels in the brand's black, 8px apart on a darker black; the rail runs
  // the window's height, as Suno's, and the top bar (Suno's play bar, at
  // the top) spans the page's column beside it. The rail's column brings its
  // own 8px on the page's left while it takes room.
  const desk = useMediaQuery(DESK_QUERY);
  const railOpen = useAppRail((s) => s.open);
  const railTakesRoom = desk && (railOpen || isIconRailPath(pathname));
  // Home's scrollbar only while it scrolls (owner, 2026-11-10).
  useScrollbarWhileScrolling(
    scrollerRef,
    !focus && pathname.replace(/\/$/, '') === ProfileRoutes.root(),
  );

  return (
    <div
      className={cn(
        'dashboard-root flex w-full flex-col overflow-hidden',
        framed || isAudioPlayer ? 'h-dvh' : 'h-screen',
        !focus && 'bg-black',
      )}
    >
      <div className="flex min-h-0 w-full flex-1">
        {/* The app rail (owner, 2026-11-10: Samply's sidebar), on every page
          but the lesson players and Present, which take the whole window. */}
        {isAudioPlayer ? null : <AppRail />}

        <main
          ref={mainRef}
          className={cn(
            'flex min-w-0 flex-1 flex-col overflow-hidden',
            !focus && 'gap-[0.455rem] pb-[0.455rem] pr-[0.455rem]',
            !focus && !railTakesRoom && 'pl-[0.455rem]',
          )}
        >
          {focus ? null : <MobileChordNotationBar />}
          {/* The top bar, over the page's column only, the rail going up
            beside it (owner, 2026-11-10); the framed pages have their own. */}
          {focus ? null : <TopRail scroller={scrollerRef} />}
          <div
            className={cn(
              'relative flex min-h-0 min-w-0 flex-1 flex-col',
              !focus && 'overflow-hidden rounded-[0.682rem]',
            )}
          >
            {/* The toolbar's fade, at the page panel's top (owner). */}
            {focus ? null : <PageTopFade scroller={scrollerRef} />}
            {/* The player's queue, over the page's right (Samply's). */}
            {focus ? null : <QueuePanel />}
            <div
              ref={scrollerRef}
              data-app-scroller={focus ? undefined : ''}
              className={cn(
                'relative min-w-0 flex-1',
                focus
                  ? 'flex min-h-0 flex-col overflow-hidden'
                  : 'overflow-y-auto overflow-x-hidden rounded-[0.682rem] bg-[#101012] p-2',
              )}
            >
              {/* The editor and the Globe show their own shapes while their
                chunks load (1.12a). */}
              <Suspense
                fallback={
                  isStudioEditor ? (
                    <DawSkeleton />
                  ) : isGlobe ? (
                    <GlobeSkeleton />
                  ) : isAudioPlayer ? null : (
                    props.fallback
                  )
                }
              >
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
      {/* Recent activity on Home, Learn, the Arcade and the Library, and
          the player wherever it holds something, Suno's play bar: across
          the window under the rail and the page, so the rail ends above it
          (owner). */}
      {!focus && shouldShowPlayBar(pathname, playerHolds) ? (
        <ActivityPlayBar />
      ) : null}
      {/* The player hushes on the pages that take the whole window: they
          have no bar to stop it from, and the editor and the lessons make
          their own sound. */}
      <PlayerBridge quiet={focus} />
      {/* The Learn tours, which run across every page this layout holds. */}
      <LearnTourLayer />
    </div>
  );
};
