/**
 * Studio Dashboard — the `/studio` landing page. A tab bar (StudioTabBar) leads
 * the page on every tab (matching the Learn tab bar's position): "Project" jumps
 * to a blank editor, while Library / Templates / Demos switch the in-page view
 * via the `?tab=` param. With no `?tab=` the default view shows the welcome
 * header + New Project + Recent Projects + Collaborate + Templates + Demos; the
 * Library / Templates / Demos tabs render without the welcome header.
 * The DAW editor lives at `/studio/editor`; actions here navigate there with a
 * boot intent (?new / ?project / ?template / ?demo / ?collab).
 */
import { useSearchParams } from 'react-router-dom';
import { WelcomeHeader } from '../dashboard/WelcomeHeader';
import { StudioCollaborate } from './StudioCollaborate';
import { StudioDemos } from './StudioDemos';
import { StudioLibrary } from './StudioLibrary';
import { StudioNewProject } from './StudioNewProject';
import { StudioRecentProjects } from './StudioRecentProjects';
import { StudioTabBar } from './StudioTabBar';
import { StudioTemplates } from './StudioTemplates';

const Divider = () => (
  <hr className="border-0 border-t border-white/15" role="separator" />
);

export const StudioInlet = () => {
  const [params] = useSearchParams();
  const tab = params.get('tab') ?? '';

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-8 px-6 py-6 md:gap-12 md:px-10 md:py-10">
      <StudioTabBar />

      {tab === 'Library' ? (
        <StudioLibrary />
      ) : tab === 'Templates' ? (
        <StudioTemplates />
      ) : tab === 'Demos' ? (
        <StudioDemos />
      ) : (
        <>
          <WelcomeHeader format={(name) => `${name}'s Studio`} />
          <StudioNewProject />
          <Divider />
          <StudioRecentProjects viewAllTo="?tab=Library" />
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
