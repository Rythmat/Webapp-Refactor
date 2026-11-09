import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SongsMarquee } from '@/components/songLibrary/SongsMarquee';
import { cn } from '@/components/utilities';
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
      // No bold on Home: the shared SongCard's semibold titles (and bold
      // initials) drop to regular here, and stay as they are elsewhere.
      className="flex flex-col gap-2 [&_*]:font-normal"
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
              className="text-base leading-6 text-white"
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
      {/* Each card is an instrument tile's size (HomeInstrumentsRow): five
        across the frame, two under 42rem, on the same container query. A
        card is its square artwork plus 3.75rem of title and artist, which
        is what one off screen holds (cqw: the strip is this container; not
        `auto`, which would keep a size from before a resize). */}
      <div className="@container">
        <ContentGate needs={['songs']} fallback={<div className="h-72" />}>
          <SongsMarquee
            scrollable
            bleed={false}
            gapClassName="gap-4"
            cardClassName={cn(
              'w-[calc((100%-1rem)/2)] [contain-intrinsic-block-size:calc((100cqw-1rem)/2+3.75rem)]',
              '@2xl:w-[calc((100%-4rem)/5)] @2xl:[contain-intrinsic-block-size:calc((100cqw-4rem)/5+3.75rem)]',
            )}
          />
        </ContentGate>
      </div>
    </section>
  );
};
