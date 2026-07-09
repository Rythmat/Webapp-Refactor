import { Link } from 'react-router-dom';
import { InstrumentSelector } from '@/components/ClassroomLayout/dashboard/InstrumentSelector';
import { WelcomeHeader } from '@/components/ClassroomLayout/dashboard/WelcomeHeader';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';

interface Tile {
  key: string;
  label: string;
  iconSrc: string;
  to: string;
  iconClassName?: string; // per-tile icon size override
}

/**
 * Tiles mirror the Learn sub-tabs in the sidebar (same icons) and switch tabs
 * via the `?tab=` param the Learn hub reads.
 */
const TILES: Tile[] = [
  {
    key: 'songs',
    label: 'Songs',
    iconSrc: '/icons/popular-releases-icon-bold.svg',
    to: '?tab=Songs',
    iconClassName: 'h-20 w-20 md:h-24 md:w-24',
  },
  {
    key: 'genre',
    label: 'Genre',
    iconSrc: '/icons/genre-icon.svg',
    to: '?tab=Genre',
  },
  {
    key: 'theory',
    label: 'Theory',
    iconSrc: '/icons/theory-icon.svg',
    to: '?tab=Theory',
  },
  {
    key: 'technique',
    label: 'Technique',
    iconSrc: '/icons/technique-icon.svg',
    to: '?tab=Technique',
  },
];

/**
 * Interactive (paintable) colours on the Quick Start canvas — the pink/magenta
 * accents plus the two pastel greens. Everything else (lavender / light-pink
 * background) stays calm. Passed as `paintColors` so the low-saturation pastel
 * greens are interactive too (a saturation threshold couldn't include them
 * without also painting the lighter-pink background). Module-level for a stable
 * reference (avoids re-initialising the canvas each render).
 */
const PAINT_COLORS = [
  '#e53880',
  '#c30454',
  '#e470a3',
  '#8fc79c', // pastel forest green
  '#57bd9a', // emerald green
  '#89cff0', // baby blue
  '#efb9cf', // light pink
];

/**
 * Learn hub Welcome + Quick Start — copied from the Home dashboard's
 * WelcomeHeader + QuickStartSection, with the four launcher tiles swapped to the
 * Learn sub-tabs (Songs/Genre/Theory/Technique, same icons as the sidebar),
 * which navigate via the `?tab=` param.
 */
export const LearnQuickStart = () => {
  return (
    // Match the Home dashboard font: `.learn-root` forces Inter, but this
    // section copies Home's (which uses the app's Glacial Indifference), so its
    // non-heading text — e.g. the InstrumentSelector — must use it too.
    <div
      className="flex flex-col gap-8 md:gap-12"
      style={{
        fontFamily: "'Glacial Indifference', 'Haskoy', system-ui, sans-serif",
      }}
    >
      <WelcomeHeader format={(name) => `${name}'s Learning Dashboard`} />

      <section aria-label="Learn" className="flex flex-col gap-4 md:gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/85 md:gap-3">
            <img
              src="/icons/learn-icon.svg"
              alt=""
              draggable={false}
              className="h-8 w-8 md:h-10 md:w-10"
            />
            <h2 className="text-xl font-medium text-white md:text-2xl">
              Learn
            </h2>
          </div>
          <InstrumentSelector />
        </div>

        <div className="relative isolate overflow-hidden rounded-2xl">
          <HexWaveBackground
            src="/backgrounds/learn-quickstart-bg.svg"
            drain={false}
            ambient
            className="pointer-events-none absolute inset-0 z-0"
            backgroundColor="#0D0B08"
            paintColors={PAINT_COLORS}
            brushRadius={90}
          />
          <div className="relative z-10 grid grid-cols-2 gap-4 p-4 md:grid-cols-4 md:gap-5 md:p-5">
            {TILES.map(({ key, label, iconSrc, to, iconClassName }) => (
              <Link
                key={key}
                to={to}
                aria-label={`Open ${label}`}
                className="group relative flex aspect-square flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/15 transition-transform hover:-translate-y-px hover:border-white/25"
              >
                <div className="pointer-events-none flex flex-1 items-center justify-center pt-8 md:pt-12">
                  <img
                    src={iconSrc}
                    alt=""
                    draggable={false}
                    className={`${iconClassName ?? 'h-16 w-16 md:h-20 md:w-20'} opacity-70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all group-hover:scale-105 group-hover:opacity-100`}
                  />
                </div>
                <div className="m-3 rounded-lg bg-black/70 px-4 py-3 backdrop-blur-sm md:m-4 md:rounded-xl">
                  <div className="text-center text-lg font-normal text-white md:text-xl">
                    {label}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
