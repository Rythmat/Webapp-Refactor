import { ArrowRight, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AtlasRoutes } from '@/constants/routes';
import { HeroGlobe } from './HeroGlobe';

/**
 * Explore-tab hero — launches the full interactive 3D globe (`/atlas/globe`),
 * the same way the Studio dashboard's New Project tile opens the DAW editor.
 * The background is a simplified, auto-rotating, non-interactive globe (the same
 * globe used across the Atlas), oversized and cropped to the Northern Hemisphere.
 */
export const OpenGlobeHero = () => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(AtlasRoutes.globe())}
      aria-label="Open the interactive globe"
      className="group relative flex min-h-[220px] items-end overflow-hidden rounded-3xl border border-white/10 text-left transition-colors hover:border-white/25 md:min-h-[300px]"
      // A <button> does not inherit the page font-family by default, so its body
      // text (eyebrow, blurb, pill) can fall back to a system font. Pin the app's
      // Glacial Indifference explicitly (matches the ArcadeInlet hero pattern).
      style={{
        fontFamily: "'Glacial Indifference', 'Haskoy', system-ui, sans-serif",
      }}
    >
      <HeroGlobe className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      <div className="relative z-[2] flex max-w-[620px] flex-col gap-3 p-8 md:p-11">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
          <Globe className="h-4 w-4" /> The Atlas
        </div>
        <h3 className="text-3xl font-medium leading-tight text-white md:text-4xl">
          Explore music across the world
        </h3>
        <p className="text-base text-white/70">
          Spin the interactive globe to trace how genres, cities and traditions
          connect across cultures and centuries.
        </p>
        <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-[#7ecfcf] px-5 py-2.5 font-semibold text-[#06201f] transition-transform group-hover:scale-105">
          Open the Globe <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
};
