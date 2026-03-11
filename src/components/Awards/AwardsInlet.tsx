/* eslint-disable react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/no-custom-classname, tailwindcss/enforces-shorthand */
import type { FC } from 'react';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { HexAvatarSVG } from '../ui/HexAvatarSVG';

const AWARDS_DATA = [
  {
    title: 'Popstar',
    level: 1,
    description: 'Double XP: 25 minutes',
  },
  {
    title: 'Rockstar',
    level: 2,
    description: 'Reward Claimed',
  },
  {
    title: 'Jewelheart',
    level: 1,
    description: 'Reward Claimed',
  },
  {
    title: 'Soulstone',
    level: 1,
    description: 'Double XP: 25 minutes',
  },
  {
    title: 'Popstar',
    level: 2,
    description: 'Triple XP: 15 minutes',
  },
  {
    title: 'Rockstar',
    level: 3,
    description: 'Reward Claimed',
  },
  {
    title: 'Jewelheart',
    level: 2,
    description: 'Reward Claimed',
  },
  {
    title: 'Soulstone',
    level: 2,
    description: 'Reward Claimed',
  },
];

interface AwardCardProps {
  title: string;
  level: number;
  description: string;
}

const AwardCard: FC<AwardCardProps> = ({ title, level, description }) => (
  <div className="flex flex-col rounded-lg overflow-hidden border border-white/10 group hover:border-white/30 transition-all cursor-pointer">
    <div className="h-48 bg-[#121212] relative flex items-center justify-center">
      <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent opacity-50" />
      <HexAvatarSVG
        config={defaultAvatarConfig(`${title}-${level}`)}
        circular={false}
        className="w-48 h-48 drop-shadow-2xl"
      />
    </div>
    <div className="bg-white p-4 flex flex-col gap-1">
      <h3 className="text-black font-serif text-lg">
        {title}: Lvl {level}
      </h3>
      <p
        className={`text-xs ${description === 'Reward Claimed' ? 'text-gray-400 italic' : 'text-gray-600'}`}
      >
        {description}
      </p>
    </div>
  </div>
);

export const AwardsInlet: FC = () => {
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-12 px-8">
      <HeaderBar title="Awards" className="bg-neutral-900/60" />
      <div className="flex items-center gap-2 text-lg font-serif text-gray-200 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {AWARDS_DATA.map((award, i) => (
          <AwardCard key={i} {...award} />
        ))}
      </div>
    </div>
  );
};
