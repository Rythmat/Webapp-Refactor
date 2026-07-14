import { Compass } from 'lucide-react';
import { useMemo } from 'react';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import { GlobeSectionHeader } from './GlobeSectionHeader';
import { FEATURED_TRADITIONS } from './data/featured';

/**
 * Explore-tab spotlight on a world music tradition/culture with a short
 * ethnomusicological blurb. Rotates daily through the curated set.
 */
export const FeaturedTradition = () => {
  const featured = useMemo(() => {
    const idx =
      Math.floor(Date.now() / 86_400_000) % FEATURED_TRADITIONS.length;
    return FEATURED_TRADITIONS[idx];
  }, []);

  const tile = useMemo(
    () => generateStudioTileSvg(`globe:${featured.seed}`, 960, 400),
    [featured.seed],
  );

  return (
    <section
      aria-label="Featured Tradition"
      className="flex flex-col gap-4 md:gap-5"
    >
      <GlobeSectionHeader
        icon={<Compass className="h-7 w-7 text-white/85 md:h-8 md:w-8" />}
        title="Featured Tradition"
      />
      <div className="relative flex min-h-[240px] items-end overflow-hidden rounded-3xl border border-white/10 md:min-h-[300px]">
        <HexWaveBackground
          src={tile}
          drain={false}
          ambient
          backgroundColor="#101012"
          colorThreshold={0.05}
          brushRadius={70}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        <div className="relative z-[2] flex max-w-[640px] flex-col gap-2 p-8 md:p-11">
          <span className="text-sm font-semibold uppercase tracking-wider text-[#7ecfcf]">
            {featured.region}
          </span>
          <h3 className="text-2xl font-medium leading-tight text-white md:text-4xl">
            {featured.title}
          </h3>
          <p className="text-base leading-relaxed text-white/75">
            {featured.blurb}
          </p>
        </div>
      </div>
    </section>
  );
};
