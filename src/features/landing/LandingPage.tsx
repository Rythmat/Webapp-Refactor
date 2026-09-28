import { Helmet } from 'react-helmet';
import { LandingShell } from './LandingShell';
import { ConnectionsSection } from './sections/ConnectionsSection';
import { HeroSection } from './sections/HeroSection';
import { ModuleBentoRow } from './sections/ModuleBentoRow';
import { ModuleTocSections } from './sections/ModuleTocSections';
import { TryFreeSection } from './sections/TryFreeSection';
import {
  LANDING_DESCRIPTION,
  LANDING_JSON_LD,
  LANDING_TITLE,
  LANDING_URL,
} from './seo';

/**
 * Public landing page (`/`, logged-out visitors), inside the shared
 * `LandingShell`: the hero horizon, the five-module bento row, then the module
 * sections with a sticky sidebar table of contents (each with its live guided
 * demo), the "Connected" demo (one song through Learn, Globe and Studio),
 * then the closing "Try for free" section (the hero, mirrored).
 */
export const LandingPage = () => {
  return (
    <LandingShell>
      <Helmet>
        <title>{LANDING_TITLE}</title>
        <meta name="description" content={LANDING_DESCRIPTION} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={LANDING_URL} />
        <script type="application/ld+json">{LANDING_JSON_LD}</script>
      </Helmet>

      <HeroSection />
      <ModuleBentoRow />
      <ModuleTocSections />
      <ConnectionsSection />
      <TryFreeSection />
    </LandingShell>
  );
};
