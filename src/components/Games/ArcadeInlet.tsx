/* eslint-disable react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { Play, Trophy, Users } from 'lucide-react';
import type { FC } from 'react';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { HexagonPattern, DEFAULT_THEMES as THEMES } from '../ui/HexagonPattern';
import '@/components/learn/learn.css';

interface ArcadeGame {
  title: string;
  players: string;
  category: string;
  color: string;
  featured?: boolean;
}

const ARCADE_GAMES_DATA: ArcadeGame[] = [
  {
    title: 'Rhythm Racer',
    players: '1.2k',
    category: 'Rhythm',
    color: THEMES.red,
    featured: true,
  },
  {
    title: 'Chord Crusher',
    players: '842',
    category: 'Theory',
    color: THEMES.yellow,
  },
  {
    title: 'Synth Match',
    players: '530',
    category: 'Ear Training',
    color: THEMES.teal,
  },
  {
    title: 'Beat Builder',
    players: '320',
    category: 'Production',
    color: THEMES.indigo,
  },
  {
    title: 'Pitch Perfect',
    players: '1.5k',
    category: 'Ear Training',
    color: THEMES.purple,
  },
  {
    title: 'Scale Runner',
    players: '605',
    category: 'Technique',
    color: THEMES.orange,
  },
];

interface ArcadeGameCardProps {
  title: string;
  players: string;
  category: string;
  color: string;
  featured?: boolean;
}

const ArcadeGameCard: FC<ArcadeGameCardProps> = ({
  title,
  players,
  category,
  color,
  featured,
}) => (
  <div
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
      <HexagonPattern
        className={`w-[150%] h-[150%] absolute transition-transform duration-700 group-hover:scale-110 ${
          featured ? '-top-10 -left-10' : '-top-4 -left-4'
        }`}
        colorsOverride={[color, '#1A1A1A']}
        variant={featured ? 'diagonal' : 'dense'}
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
        {featured && (
          <div
            className="text-xs font-bold px-3 py-1 rounded-full animate-pulse"
            style={{
              background: 'var(--color-record)',
              color: 'white',
              boxShadow: '0 0 12px rgba(239,68,68,0.3)',
            }}
          >
            LIVE
          </div>
        )}
      </div>
      <div>
        <h3
          className={`font-semibold mb-2 leading-tight ${featured ? 'text-4xl' : 'text-xl'}`}
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h3>
        <div
          className="flex items-center gap-4"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Users size={14} />
            {players} Playing
          </div>
          {featured && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-400">
              <Trophy size={14} />
              Prize: 500 Credits
            </div>
          )}
        </div>
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
  return (
    <div
      className="learn-root flex flex-col h-full overflow-y-auto px-8 pb-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <HeaderBar title="Arcade" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[200px]">
        {ARCADE_GAMES_DATA.map((game, i) => (
          <ArcadeGameCard key={i} {...game} />
        ))}
        <div
          className="rounded-3xl p-6 flex flex-col justify-between group transition-colors duration-150 glass-panel"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <div className="flex items-center gap-2 text-yellow-500 mb-4">
              <Trophy size={20} />
              <span
                className="text-xs font-semibold uppercase"
                style={{ letterSpacing: '1px' }}
              >
                Your Rank
              </span>
            </div>
            <div
              className="text-3xl font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              #428
            </div>
            <div
              className="text-xs mt-1"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Top 15% this week
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <div
              className="h-1 flex-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full w-3/4"
                style={{ background: 'var(--color-accent)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
