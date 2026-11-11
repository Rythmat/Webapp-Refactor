import { useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { UserRoutes, WelcomeRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';
import { getCortexRecords, subscribeCortex } from '@/features/cortex/ledger';
import {
  weekStats,
  type WeekStats,
} from '@/features/learn/dashboard/weekStats';
import { useLearnProfile } from '@/features/learn/profile/useLearnProfile';
import { useExperienceSummary } from '@/hooks/data/experience';
import { useStreak } from '@/hooks/data/useStreak';
import type { CoverSpec } from '@/lib/cover';
import { keyPair } from '@/lib/cover/color';
import { CourseCover } from '../cover/CourseCover';
import { DiscoverColumn } from './DiscoverColumn';
import { DaysRing, WeekStrip } from './WeekCard';

/**
 * The dashboard's Progress column: the "This week" card in a Discover
 * column (owner, 2026-11-04). The days against their goal as a ring, the
 * week's strip, and only the numbers that aren't zero.
 */
export function ProgressColumn({
  stats,
  target,
  streak,
  nowMs,
  art,
}: {
  stats: WeekStats;
  target: number | null;
  streak: number;
  nowMs: number;
  /** The header tile's cover: rings in the student's key. */
  art: CoverSpec;
}) {
  const goal = target ?? 3;
  const met = stats.daysActive >= goal;
  const facts = [
    stats.xp > 0 && { value: stats.xp.toLocaleString(), label: 'XP' },
    stats.finished > 0 && {
      value: String(stats.finished),
      label: stats.finished === 1 ? 'Lesson' : 'Lessons',
    },
    streak > 1 && { value: String(streak), label: 'In a row' },
  ].filter((f): f is { value: string; label: string } => Boolean(f));

  return (
    <DiscoverColumn
      title="Progress"
      art={
        <CourseCover
          cover={art}
          stack={false}
          className="size-full [&>span]:rounded-none"
        />
      }
      seeMore={{ to: UserRoutes.root() }}
    >
      <div data-learn-home="streak" className="flex flex-1 flex-col gap-4 py-1">
        <div className="flex items-center gap-4">
          <DaysRing
            days={stats.daysActive}
            target={goal}
            className="size-[5.75rem]"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[1.875rem] leading-none text-white">
              {stats.daysActive}
              <span className="text-base text-white/50"> / {goal} days</span>
            </span>
            <span className="text-[0.9375rem] leading-5 text-white/55">
              {stats.daysActive === 0
                ? 'Your week starts with one lesson.'
                : met
                  ? 'Goal reached this week.'
                  : `${goal - stats.daysActive} more to reach your goal.`}
            </span>
          </div>
        </div>
        <WeekStrip active={stats.activeDates} nowMs={nowMs} />
        {facts.length > 0 && (
          <dl className="grid grid-cols-3 gap-2">
            {facts.map((fact) => (
              <div key={fact.label} className="flex min-w-0 flex-col">
                <dt className="order-2 text-[0.8125rem] text-white/45">
                  {fact.label}
                </dt>
                <dd className="order-1 text-[1.25rem] text-white">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <Link
          to={WelcomeRoutes.root(undefined, { edit: '1', step: 'days' })}
          className={cn(
            'self-start rounded-full text-[0.9375rem] text-white/50 hover:text-white',
            FOCUS_RING,
          )}
        >
          {target ? 'Change weekly goal' : 'Set a weekly goal'}
        </Link>
      </div>
    </DiscoverColumn>
  );
}

/** Progress's tile: interference rings, quiet, in a cool key. */
const PROGRESS_ART: CoverSpec = {
  family: 'rings',
  seed: 'learn/progress',
  colors: keyPair('D♭'),
  stacked: false,
  ratio: [3, 2],
  variant: 3,
};

/**
 * Progress on Home, beside the Studio card where the Projects card was
 * (owner, 2026-11-11): this week from the student's own XP and history,
 * against the days a week they set themselves.
 */
export function HomeProgressColumn() {
  const { profile } = useLearnProfile();
  const records = useSyncExternalStore(subscribeCortex, getCortexRecords);
  const { data: xp } = useExperienceSummary();
  const { data: streak } = useStreak();
  // Fixed for the visit, so the week doesn't move under the student.
  const [nowMs] = useState(() => Date.now());
  const week = useMemo(
    () => weekStats(xp?.timeline, records, nowMs),
    [xp?.timeline, records, nowMs],
  );
  return (
    <ProgressColumn
      stats={week}
      target={profile.daysPerWeek ?? null}
      streak={streak.currentStreak}
      nowMs={nowMs}
      art={PROGRESS_ART}
    />
  );
}
