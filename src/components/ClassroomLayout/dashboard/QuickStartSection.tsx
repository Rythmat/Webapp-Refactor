import { Link } from 'react-router-dom';
import {
  AtlasRoutes,
  GameRoutes,
  LearnRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { InstrumentSelector } from './InstrumentSelector';

interface Tile {
  key: string;
  label: string;
  iconSrc: string;
  to: string;
}

const TILES: Tile[] = [
  {
    key: 'learn',
    label: 'Learn',
    iconSrc: '/icons/learn-icon.svg',
    to: LearnRoutes.root(),
  },
  {
    key: 'studio',
    label: 'Studio',
    iconSrc: '/icons/studio-icon.svg',
    to: StudioRoutes.root(),
  },
  {
    key: 'globe',
    label: 'Globe',
    iconSrc: '/icons/globe-icon.svg',
    to: AtlasRoutes.root(),
  },
  {
    key: 'arcade',
    label: 'Arcade',
    iconSrc: '/icons/arcade-icon.svg',
    to: GameRoutes.root(),
  },
];

/**
 * Quick Start banner — section header + 4-tile launcher over the honeycomb
 * background. Header sits at the same horizontal position as Pathways / Songs
 * headers so all three read as peers in the vertical stack.
 */
export const QuickStartSection = () => {
  return (
    <section aria-label="Quick Start" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/85 md:gap-3">
          <img
            src="/icons/quick-start-icon.svg"
            alt=""
            draggable={false}
            className="h-8 w-8 md:h-10 md:w-10"
          />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Quick Start
          </h2>
        </div>
        <InstrumentSelector />
      </div>

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          backgroundImage: "url('/backgrounds/learn-bg.svg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4 md:gap-5 md:p-5">
          {TILES.map(({ key, label, iconSrc, to }) => (
            <Link
              key={key}
              to={to}
              aria-label={`Open ${label}`}
              className="group relative flex aspect-square flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/10 backdrop-blur-sm transition-transform hover:-translate-y-px hover:border-white/25"
            >
              <div className="pointer-events-none flex flex-1 items-center justify-center pt-8 md:pt-12">
                <img
                  src={iconSrc}
                  alt=""
                  draggable={false}
                  className="h-24 w-24 opacity-70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all group-hover:scale-105 group-hover:opacity-100 md:h-[120px] md:w-[120px]"
                />
              </div>
              <div className="m-3 rounded-lg bg-black/70 px-4 py-3 backdrop-blur-sm md:m-4 md:rounded-xl">
                <div className="text-lg font-semibold text-white md:text-xl">
                  {label}
                </div>
                <div className="text-sm text-white/60 md:text-base">
                  Open {label}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
