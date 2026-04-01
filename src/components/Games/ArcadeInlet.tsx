/* eslint-disable react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { Play } from 'lucide-react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameRoutes } from '@/constants/routes';
import { useIsPremium } from '@/hooks/useIsPremium';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { HexAvatarSVG } from '../ui/HexAvatarSVG';
import { LockedFeatureOverlay } from '../ui/LockedFeatureOverlay';
import '@/components/learn/learn.css';

interface ArcadeGame {
  title: string;
  category: string;
  featured?: boolean;
  route?: keyof typeof GameRoutes;
}

const CATEGORY_ORDER = [
  'Multiplayer',
  'Ear Training',
  'Technique',
  'Theory',
  'Rhythm',
  'Sound Lab',
] as const;

const ARCADE_GAMES_DATA: ArcadeGame[] = [
  // Multiplayer
  {
    title: 'Jam Room',
    category: 'Multiplayer',
    featured: true,
    route: 'jamLobby',
  },
  // Ear Training
  {
    title: 'Chroma',
    category: 'Ear Training',
    route: 'chroma',
  },
  {
    title: 'Constellations',
    category: 'Ear Training',
    route: 'constellations',
  },
  // Technique
  {
    title: 'Major Arcanum',
    category: 'Technique',
    route: 'majorArcanum',
  },
  {
    title: 'Chord Press',
    category: 'Technique',
    route: 'chordPress',
  },
  // Theory
  {
    title: 'Board Choice',
    category: 'Theory',
    route: 'boardChoice',
  },
  {
    title: 'Chord Connection',
    category: 'Theory',
    route: 'chordConnection',
  },
  // Rhythm
  {
    title: 'Foli',
    category: 'Rhythm',
    route: 'foli',
  },
  {
    title: 'Groove Lab',
    category: 'Rhythm',
    route: 'grooveLab',
  },
  // Sound Lab
  {
    title: 'Wave Sculptor',
    category: 'Sound Lab',
    route: 'waveSculptor',
  },
  {
    title: 'Harmonic Strings',
    category: 'Sound Lab',
    route: 'harmonicStrings',
  },
  {
    title: 'Signal Flow',
    category: 'Sound Lab',
    route: 'signalFlow',
  },
];

/** Routes of games that are available to free-tier users. */
const FREE_GAME_ROUTES = new Set<string>([
  'chroma',
  'chordPress',
  'boardChoice',
  'chordConnection',
  'harmonicStrings',
]);

const isGameFree = (game: ArcadeGame) =>
  !!game.route && FREE_GAME_ROUTES.has(game.route);

const gamesByCategory = CATEGORY_ORDER.map((cat) => ({
  category: cat,
  games: ARCADE_GAMES_DATA.filter((g) => g.category === cat),
}));

interface ArcadeGameCardProps {
  title: string;
  category: string;
  featured?: boolean;
  onClick?: () => void;
}

const ArcadeGameCard: FC<ArcadeGameCardProps> = ({
  title,
  category,
  featured,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-colors duration-300 glass-panel ${
      featured ? 'md:col-span-2 md:row-span-2' : ''
    }`}
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--color-border)',
    }}
  >
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 bg-gradient-to-br from-transparent to-black/80"
        style={{ zIndex: 1 }}
      />
      <HexAvatarSVG
        config={defaultAvatarConfig(title)}
        circular={false}
        className={`w-[150%] h-[150%] absolute transition-transform duration-700 group-hover:scale-110 ${
          featured ? '-top-10 -left-10' : '-top-4 -left-4'
        }`}
      />
    </div>
    <div
      className={`relative z-10 flex flex-col justify-between h-full ${featured ? 'p-8' : 'p-5'}`}
    >
      <div className="flex justify-between items-start">
        <div
          className="px-3 py-1 rounded-full text-xs font-bold uppercase glass-panel-sm"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            letterSpacing: '1px',
            backdropFilter: 'blur(10px)',
          }}
        >
          {category}
        </div>
      </div>
      <div>
        <h3
          className={`font-semibold mb-2 leading-tight ${featured ? 'text-4xl' : 'text-xl'}`}
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h3>
      </div>
      <div
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
        style={{
          background: 'var(--color-accent)',
          color: '#191919',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        <Play size={20} fill="currentColor" />
      </div>
    </div>
  </div>
);

export const ArcadeInlet: FC = () => {
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();

  // For free users, push categories with zero free games to the bottom.
  const sortedCategories = isPremium
    ? gamesByCategory
    : [...gamesByCategory].sort((a, b) => {
        const aHasFree = a.games.some(isGameFree);
        const bHasFree = b.games.some(isGameFree);
        if (aHasFree === bHasFree) return 0;
        return aHasFree ? -1 : 1;
      });

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      <HeaderBar title="Arcade" />
      <div className="learn-root flex-1 overflow-y-auto px-8 pb-12 space-y-10">
        {sortedCategories.map(({ category, games }) => (
          <section key={category}>
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{
                color: 'var(--color-text-muted, rgba(255,255,255,0.45))',
              }}
            >
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[200px]">
              {games.map((game, i) => {
                const locked = !isPremium && !isGameFree(game);
                return (
                  <LockedFeatureOverlay key={i} locked={locked}>
                    <ArcadeGameCard
                      {...game}
                      onClick={
                        game.route
                          ? () =>
                              navigate(
                                (GameRoutes[game.route!] as (p?: void) => string)(),
                              )
                          : undefined
                      }
                    />
                  </LockedFeatureOverlay>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
