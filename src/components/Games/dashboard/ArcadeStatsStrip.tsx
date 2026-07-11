import { Flame, Gamepad2, Star, Zap } from 'lucide-react';
import type { FC, ReactNode } from 'react';
import {
  computeStreak,
  selectTotalPlays,
  useArcadeActivityStore,
} from '@/features/arcade/useArcadeActivityStore';
import { useExperienceSummary } from '@/hooks/data/experience';

const Stat: FC<{
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}> = ({ icon, children, className }) => (
  <div
    className={`flex items-center gap-1.5 text-[20px] font-medium leading-none tabular-nums text-white${
      className ? ` ${className}` : ''
    }`}
  >
    {icon}
    <span>{children}</span>
  </div>
);

/**
 * The Arcade's player-stats row — streak · total XP · level · games played.
 * Mirrors the app-wide TopRail's inline stat style (no cards): XP/level from the
 * real experience summary; streak + plays from the local arcade-activity store.
 */
export const ArcadeStatsStrip: FC = () => {
  const { data: xp } = useExperienceSummary();
  const totalPlays = useArcadeActivityStore(selectTotalPlays);
  const streak = useArcadeActivityStore((s) => computeStreak(s.activeDays));

  const level = xp?.level ?? 1;
  const totalXp = xp?.totalExperience ?? 0;

  return (
    <section
      aria-label="Your stats"
      className="flex flex-wrap items-center gap-x-6 gap-y-2"
    >
      <Stat
        className="md:hidden"
        icon={<Flame className="h-5 w-5 text-orange-400" fill="currentColor" />}
      >
        {streak}
        <span className="ml-1 text-white/70">
          {streak === 1 ? 'day' : 'days'}
        </span>
      </Stat>
      <Stat
        className="md:hidden"
        icon={<Zap className="h-5 w-5 text-white/60" fill="currentColor" />}
      >
        {totalXp.toLocaleString()}
        <span className="ml-1 text-white/70">XP</span>
      </Stat>
      <Stat
        className="md:hidden"
        icon={<Star className="h-5 w-5 text-white/60" fill="currentColor" />}
      >
        <span className="text-white/70">Level</span> {level}
      </Stat>
      <Stat icon={<Gamepad2 className="h-5 w-5 text-white/60" />}>
        {totalPlays}
        <span className="ml-1 text-white/70">played</span>
      </Stat>
    </section>
  );
};
