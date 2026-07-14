import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CurriculumRoutes, LearnRoutes } from '@/constants/routes';
import { PathwayCard } from './PathwayCard';

interface PathwayTile {
  key: string;
  title: string;
  route: string;
  seed: string;
  paletteIndex?: number;
  image?: string;
  /** When true, the tile's honeycomb art is an interactive hex canvas. */
  interactive?: boolean;
}

const PATHWAY_TILES: PathwayTile[] = [
  {
    key: 'beginner',
    title: 'Beginner',
    route: CurriculumRoutes.root(),
    seed: 'beginner-hex',
    paletteIndex: 3,
    image: '/learn-tiles/beginner-hex.svg',
    interactive: true,
  },
  {
    key: 'pop',
    title: 'Pop',
    route: CurriculumRoutes.genre({ genre: 'pop' }),
    seed: 'pop-hex',
    paletteIndex: 17,
    image: '/learn-tiles/pop.svg',
    interactive: true,
  },
  {
    key: 'funk',
    title: 'Funk',
    route: CurriculumRoutes.genre({ genre: 'funk' }),
    seed: 'funk-hex',
    paletteIndex: 42,
    image: '/learn-tiles/funk-hex.svg',
    interactive: true,
  },
  {
    key: 'rock',
    title: 'Rock',
    route: CurriculumRoutes.genre({ genre: 'rock' }),
    seed: 'rock-hex',
    paletteIndex: 91,
    image: '/learn-tiles/rock-hex.svg',
    interactive: true,
  },
];

export const PathwaysSection = () => {
  return (
    <section aria-label="Genre" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <img
            src="/icons/genre-icon.svg"
            alt=""
            draggable={false}
            className="h-8 w-8 md:h-10 md:w-10"
          />
          <h2 className="text-xl font-medium text-white md:text-2xl">Genre</h2>
        </div>
        <Link
          to={`${LearnRoutes.root()}?tab=Genre`}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white md:text-base"
        >
          <span>View All Genres</span>
          <Plus className="h-5 w-5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {PATHWAY_TILES.map((tile) => (
          <PathwayCard
            key={tile.key}
            title={tile.title}
            route={tile.route}
            seed={tile.seed}
            paletteIndex={tile.paletteIndex}
            image={tile.image}
            interactive={tile.interactive}
          />
        ))}
      </div>
    </section>
  );
};
