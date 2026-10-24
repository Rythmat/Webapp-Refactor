import { Link } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';

/**
 * The Production page's tab bar — one inline row (mirrors LearnTabBar): the
 * "Studio" heading, which opens the editor at `/studio`, then Production,
 * the page it's on. The dashboard's Project / Templates / Demos tabs went
 * with the dashboard (owner, 2026-10-24).
 */
export const StudioTabBar = () => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-6">
      {/* Studio heading — opens the editor. */}
      <Link
        to={StudioRoutes.editor()}
        aria-label="Open the Studio"
        className="flex items-center gap-2 text-white/85 transition-opacity hover:opacity-90 md:gap-3"
      >
        <img
          src="/icons/studio-icon.svg"
          alt=""
          draggable={false}
          className="h-8 w-8 md:h-10 md:w-10"
        />
        <h2 className="text-xl font-medium text-white md:text-2xl">Studio</h2>
      </Link>

      <Link
        to={StudioRoutes.production.definition}
        aria-current="page"
        className="text-xl font-medium text-white transition-colors md:text-2xl"
      >
        Production
      </Link>
    </div>
  );
};
