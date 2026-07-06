import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CurriculumRoutes } from '@/constants/routes';
import { PathwayCard } from './PathwayCard';

interface PathwayTile {
  key: string;
  title: string;
  route: string;
  seed: string;
  paletteIndex?: number;
  image?: string;
}

const PATHWAY_TILES: PathwayTile[] = [
  {
    key: 'beginner',
    title: 'Beginner',
    route: CurriculumRoutes.root(),
    seed: 'beginner-hex',
    paletteIndex: 3,
    image: '/learn-tiles/beginner.svg',
  },
  {
    key: 'pop',
    title: 'Pop',
    route: CurriculumRoutes.genre({ genre: 'pop' }),
    seed: 'pop-hex',
    paletteIndex: 17,
    image: '/learn-tiles/pop.svg',
  },
  {
    key: 'funk',
    title: 'Funk',
    route: CurriculumRoutes.genre({ genre: 'funk' }),
    seed: 'funk-hex',
    paletteIndex: 42,
    image: '/learn-tiles/funk.svg',
  },
  {
    key: 'rock',
    title: 'Rock',
    route: CurriculumRoutes.genre({ genre: 'rock' }),
    seed: 'rock-hex',
    paletteIndex: 91,
    image: '/learn-tiles/rock.svg',
  },
];

export const PathwaysSection = () => {
  return (
    <section aria-label="Pathways" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <img
            src="/icons/pathways-icon.svg"
            alt=""
            draggable={false}
            className="h-8 w-8 md:h-10 md:w-10"
          />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Pathways
          </h2>
        </div>
        <Link
          to={CurriculumRoutes.root()}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white md:text-base"
        >
          <span>View All Pathways</span>
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
          />
        ))}
      </div>
    </section>
  );
};
