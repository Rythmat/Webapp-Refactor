import type { ReactNode } from 'react';
import { DashboardFooter } from '@/components/ClassroomLayout/dashboard/DashboardFooter';
import { cn } from '@/components/utilities';
import { GoogleOneTap } from '../authentication/components/GoogleOneTap';
import { MarketingNav } from '../marketing/components/MarketingNav';
import { LANDING_FRAME } from './frame';
import '@/components/ClassroomLayout/dashboard/dashboard.css';
import './landing.css';

/**
 * Page chrome shared by the landing (`/`) and every public marketing page
 * (`/features/*`, For Teachers, Blog). Scrolls the window (so the nav's glass
 * state and scroll-linked motion work), and sits inside `.dashboard-root` so
 * it inherits the app's glass/grain/accent tokens, with `landing.css` layered
 * on top.
 *
 * Layout (Attio-style): one framed column with hairline rails holding the
 * nav bar and the page's sections, then the app's footer at the same width.
 *
 * Signed-out visitors also get Google One Tap here (see GoogleOneTap).
 */
export const LandingShell = ({ children }: { children: ReactNode }) => {
  return (
    <div
      className="dashboard-root landing-root min-h-screen w-full overflow-x-clip"
      data-tab="home"
    >
      <GoogleOneTap />

      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-white px-4 py-2 text-sm text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <MarketingNav framed />

      <main
        id="main"
        className={cn(LANDING_FRAME, 'border-x border-white/[0.08]')}
      >
        {children}
      </main>

      {/* Same footer as the app (Home / Settings), at the page's width,
          without its animated logo. */}
      <div className={cn(LANDING_FRAME, 'px-6 pb-10 md:px-10')}>
        <DashboardFooter showLogo={false} />
      </div>
    </div>
  );
};
