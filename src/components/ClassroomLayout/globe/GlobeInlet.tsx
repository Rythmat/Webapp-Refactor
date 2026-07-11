/**
 * Globe (Atlas) Dashboard — the `/atlas` landing page. A tab bar (GlobeTabBar)
 * leads the page (mirroring the Studio/Learn dashboards). The default view
 * (no `?tab=`) shows the hero + regions + cities + a featured tradition, while
 * Pathways / Eras / Instruments switch the in-page view via `?tab=`.
 * The "Explore" tab opens the full interactive 3D globe at `/atlas/globe`
 * (as the DAW editor is opened from Studio) — the same target as the hero.
 */
import { useSearchParams } from 'react-router-dom';
import { WelcomeHeader } from '../dashboard/WelcomeHeader';
import { FeaturedTradition } from './FeaturedTradition';
import { GlobeEras } from './GlobeEras';
import { GlobeHomePreviews } from './GlobeHomePreviews';
import { GlobeInstruments } from './GlobeInstruments';
import { GlobePathways } from './GlobePathways';
import { GlobeRegionsCities } from './GlobeRegionsCities';
import { GlobeTabBar } from './GlobeTabBar';
import { OpenGlobeHero } from './OpenGlobeHero';

const Divider = () => (
  <hr className="border-0 border-t border-white/15" role="separator" />
);

export const GlobeInlet = () => {
  const [params] = useSearchParams();
  const tab = params.get('tab') ?? '';

  return (
    <div className="flex w-full flex-col gap-8 px-6 pt-4 pb-6 md:gap-10 md:px-10 md:pb-10">
      <GlobeTabBar />

      {tab === 'Regions' ? (
        <GlobeRegionsCities />
      ) : tab === 'Pathways' ? (
        <GlobePathways />
      ) : tab === 'Eras' ? (
        <GlobeEras />
      ) : tab === 'Instruments' ? (
        <GlobeInstruments />
      ) : (
        <>
          <WelcomeHeader format={(name) => `${name}'s Atlas`} />
          <OpenGlobeHero />
          <Divider />
          <GlobeHomePreviews />
          <Divider />
          <FeaturedTradition />
        </>
      )}
    </div>
  );
};
