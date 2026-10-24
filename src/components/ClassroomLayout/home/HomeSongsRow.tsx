import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SongsMarquee } from '@/components/songLibrary/SongsMarquee';
import { SongRoutes } from '@/constants/routes';
import { ContentGate } from '@/content/ContentGate';

/**
 * Home's Songs row, under the two columns: the songs marquee, scrolled by hand
 * rather than drifting, through every artist with artwork, one song each,
 * in a new random order on every load. The header matches the cards above.
 * The library hydrates at runtime, so the strip waits behind its own
 * ContentGate (Home's route isn't gated); the fallback holds the row's height.
 */
export const HomeSongsRow = () => {
  return (
    <section
      aria-labelledby="home-songs-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="size-6 shrink-0 bg-white"
            style={{
              maskImage: 'url(/icons/popular-releases-icon.svg)',
              WebkitMaskImage: 'url(/icons/popular-releases-icon.svg)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
          <div className="min-w-0">
            <h2
              id="home-songs-heading"
              className="text-base font-bold leading-6 text-white"
            >
              Songs
            </h2>
          </div>
        </div>
        <Link
          to={SongRoutes.root()}
          className="group flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white/70 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
        >
          View all
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
          />
        </Link>
      </div>
      <ContentGate needs={['songs']} fallback={<div className="h-[340px]" />}>
        <SongsMarquee scrollable bleed={false} />
      </ContentGate>
    </section>
  );
};
