/**
 * Studio Dashboard — the `/studio` landing page. A tab bar (StudioTabBar) leads
 * the page on every tab (matching the Learn tab bar's position): "Project" jumps
 * to a blank editor, "Production" is its own route (`/studio/production`, the
 * DAW lessons), while Templates / Demos switch the in-page view via the `?tab=`
 * param. With no `?tab=` the default view shows the welcome header + New
 * Project + Recent Projects + Collaborate + Templates + Demos; the other tabs
 * render without the welcome header.
 * The DAW editor lives at `/studio/editor`; actions here navigate there with a
 * boot intent (?new / ?project / ?template / ?demo / ?tutorial / ?collab).
 */
import { useEffect } from 'react';
import { useMatch, useSearchParams } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { prefetchDawOnIntent, prefetchDawWhenIdle } from '@/daw/preload';
import { WelcomeHeader } from '../dashboard/WelcomeHeader';
import { StudioCollaborate } from './StudioCollaborate';
import { StudioDemos } from './StudioDemos';
import { StudioNewProject } from './StudioNewProject';
import { StudioProduction } from './StudioProduction';
import { StudioRecentProjects } from './StudioRecentProjects';
import { StudioTabBar } from './StudioTabBar';
import { StudioTemplates } from './StudioTemplates';

const Divider = () => (
  <hr className="border-0 border-t border-white/15" role="separator" />
);

/** The tiles and links here that open the editor, or may. */
const OPENS_EDITOR = 'a, button, [role="button"]';

export const StudioInlet = () => {
  const [params] = useSearchParams();
  const onProduction = useMatch(StudioRoutes.production.definition) !== null;
  const tab = params.get('tab') ?? '';

  // Nearly everything here opens the editor: fetch its chunk once the page
  // is idle, and sooner when the student points at, focuses or presses a
  // tile (milestone 1.12a, bundle-load-09).
  useEffect(() => prefetchDawWhenIdle(), []);
  const onIntent =
    (kind: 'hover' | 'focus' | 'press') => (event: React.SyntheticEvent) => {
      if ((event.target as Element).closest?.(OPENS_EDITOR))
        prefetchDawOnIntent(kind);
    };

  return (
    <div
      className="flex w-full flex-col gap-8 px-6 pt-4 pb-6 md:gap-10 md:px-10 md:pb-10"
      onPointerOver={onIntent('hover')}
      onFocus={onIntent('focus')}
      onPointerDown={onIntent('press')}
    >
      <StudioTabBar />

      {onProduction ? (
        <StudioProduction />
      ) : tab === 'Templates' ? (
        <StudioTemplates />
      ) : tab === 'Demos' ? (
        <StudioDemos />
      ) : (
        <>
          <WelcomeHeader format={(name) => `${name}'s Studio`} />
          <StudioNewProject />
          <Divider />
          <StudioRecentProjects />
          <Divider />
          <StudioCollaborate />
          <Divider />
          <StudioTemplates viewAllTo="?tab=Templates" />
          <Divider />
          <StudioDemos viewAllTo="?tab=Demos" />
        </>
      )}
    </div>
  );
};
