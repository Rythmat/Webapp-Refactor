import { Helmet } from 'react-helmet';
import { MarketingFooter } from '../marketing/components/MarketingFooter';
import { MarketingNav } from '../marketing/components/MarketingNav';
import { HeroSection } from './sections/HeroSection';
import { ModuleBentoRow } from './sections/ModuleBentoRow';
import { ModuleTocSections } from './sections/ModuleTocSections';
import {
  LANDING_DESCRIPTION,
  LANDING_JSON_LD,
  LANDING_TITLE,
  LANDING_URL,
} from './seo';
import '@/components/ClassroomLayout/dashboard/dashboard.css';
import './landing.css';

/**
 * Public landing page (`/`, logged-out visitors). Scrolls the window (so the
 * nav's glass state and scroll-linked motion work), and sits inside
 * `.dashboard-root` so it inherits the app's glass/grain/accent tokens, with
 * `landing.css` layered on top.
 *
 * Layout (Attio-style): one framed column with hairline rails holding the
 * hero horizon, the five-module bento row, then the module sections with a
 * sticky sidebar table of contents (each with its live guided demo).
 */
export const LandingPage = () => {
  return (
    <div
      className="dashboard-root landing-root min-h-screen w-full overflow-x-clip"
      data-tab="home"
    >
      <Helmet>
        <title>{LANDING_TITLE}</title>
        <meta name="description" content={LANDING_DESCRIPTION} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={LANDING_URL} />
        <script type="application/ld+json">{LANDING_JSON_LD}</script>
      </Helmet>

      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-white px-4 py-2 text-sm font-semibold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <MarketingNav fluid />

      <main
        id="main"
        className="mx-auto w-full max-w-[1392px] border-x border-white/[0.08]"
      >
        <HeroSection />
        <ModuleBentoRow />
        <ModuleTocSections />
      </main>

      <MarketingFooter />
    </div>
  );
};
