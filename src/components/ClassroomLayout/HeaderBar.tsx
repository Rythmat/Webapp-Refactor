/* eslint-disable tailwindcss/classnames-order, tailwindcss/migration-from-tailwind-2 */
import { ChevronLeft } from 'lucide-react';
import type { FC } from 'react';
import { UserWidget } from '@/layouts/DashboardLayout/UserWidget';

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  showProfile?: boolean;
  className?: string;
  onBack?: () => void;
}

export const HeaderBar: FC<HeaderBarProps> = ({
  title,
  subtitle,
  showProfile = false,
  className = '',
  onBack,
}) => {
  return (
    <header
      className={`h-16 flex items-center justify-between px-4 sm:px-6 lg:px-10 py-4 bg-transparent z-10 flex-shrink-0 ${className}`}
    >
      <div className="flex items-center gap-4 group cursor-default">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex size-8 items-center justify-center rounded-full border border-white/10 text-gray-400 transition-colors hover:border-white/20 hover:text-white"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        <h1 className="text-2xl md:text-3xl font-serif text-gray-100 group-hover:text-white transition-colors">
          {title}
        </h1>
        {subtitle && (
          <div className="text-gray-500 text-lg mt-2 font-light">
            {subtitle}
          </div>
        )}
      </div>
      <div className="flex items-center gap-6 text-sm font-medium">
        {/* <div className="flex items-center gap-2 text-gray-400">
          <span className="text-white font-bold text-base">{xp}</span> XP
        </div> */}
        {/* <button
          type="button"
          onClick={() => navigate(ProfileRoutes.awards())}
          className={`flex items-center gap-2 cursor-pointer transition-colors text-gray-400 hover:text-white`}
        >
          <Hexagon
            size={16}
            className={`text-yellow-500 fill-yellow-500/20`}
          />
          <span className="text-white font-bold text-base">{awards}</span> Awards
        </button> */}
        {/* {(
          <div className="flex items-center gap-2 text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-bold">{credits}</span> Credits
          </div>
        )} */}
        {showProfile && (
          <div className="pl-4 border-l border-white/10">
            <UserWidget variant="header" />
          </div>
        )}
      </div>
    </header>
  );
};
