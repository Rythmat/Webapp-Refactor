import { Flame } from 'lucide-react';
import type { FC } from 'react';
import { useStreak } from '@/hooks/data/useStreak';
import { DailyGoalRing } from './DailyGoalRing';

/**
 * Learn-hub streak + daily-goal card — the core engagement loop. A learning
 * streak (any day you complete a lesson/activity/game) with a forgiving freeze,
 * beside today's XP-goal ring. Copy is gentle and gain-framed (no loss-pressure)
 * for a mixed, COPPA-sensitive audience.
 */
export const StreakGoalCard: FC = () => {
  const { data: streak } = useStreak();
  const days = streak?.currentStreak ?? 0;
  const activeToday = streak?.activeToday ?? false;

  const subtitle =
    days === 0
      ? 'Complete a lesson today to start your streak.'
      : activeToday
        ? "You've kept your streak going today — nice work!"
        : 'Do one lesson today to keep your streak going.';

  return (
    <section
      aria-label="Your learning streak and daily goal"
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl md:h-16 md:w-16 ${
            days > 0
              ? 'bg-orange-500/[0.14] text-orange-400'
              : 'bg-white/[0.06] text-white/40'
          }`}
        >
          <Flame
            className="h-7 w-7 md:h-8 md:w-8"
            fill={days > 0 ? 'currentColor' : 'none'}
          />
        </span>
        <div className="min-w-0">
          <div className="text-2xl font-bold tabular-nums text-white md:text-3xl">
            {days} {days === 1 ? 'day' : 'days'}
          </div>
          <div className="truncate text-sm text-white/55 md:text-base">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <DailyGoalRing />
        <span className="text-[10px] uppercase tracking-wide text-white/35">
          Today's goal
        </span>
      </div>
    </section>
  );
};
