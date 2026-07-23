import { Helmet } from 'react-helmet';
import { MarketingNav } from '../marketing/components/MarketingNav';
import { LandingHome } from './LandingHome';
import '@/components/ClassroomLayout/dashboard/dashboard.css';

/**
 * Public landing shell — a fork of `src/layouts/DashboardLayout/ClassroomDashboard.tsx`
 * for logged-out visitors. Keeps the `.dashboard-root` tokens + `#101012` scroll
 * surface, drops the left sidebar + auth-only mount hooks, and uses the shared
 * marketing nav (fixed + `solid`, since content scrolls in an inner container).
 * Renders `LandingHome` directly instead of an `<Outlet />`.
 */
export const LandingDashboard = () => {
  return (
    <div
      className="dashboard-root flex h-screen w-full overflow-hidden"
      data-tab="home"
    >
      <Helmet>
        <title>Music Atlas — Learn, create, and teach music</title>
        <meta
          name="description"
          content="Music Atlas — a music-theory engine and a full browser studio. Learn, create, and teach music in one place."
        />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <MarketingNav solid fluid />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#101012] pt-24">
          <LandingHome />
        </div>
      </main>
    </div>
  );
};
