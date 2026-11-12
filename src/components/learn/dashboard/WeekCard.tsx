import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit/MicroLabel';
import { cn } from '@/components/utilities';
import { WelcomeRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';
import {
  dateKey,
  weekDates,
  type WeekStats,
} from '@/features/learn/dashboard/weekStats';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** The week, Monday to Sunday: a filled dot for each day practised. */
export function WeekStrip({
  active,
  nowMs,
}: {
  active: readonly string[];
  nowMs: number;
}) {
  const today = dateKey(nowMs);
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="Days practised">
      {weekDates(nowMs).map((date, i) => {
        const on = active.includes(date);
        const isToday = date === today;
        return (
          <li
            key={date}
            className="flex flex-col items-center gap-1.5"
            aria-label={`${DAY_NAMES[i]}${on ? ': practised' : ''}`}
          >
            <span
              aria-hidden
              className={cn(
                'size-3 rounded-full',
                on ? 'bg-white' : 'bg-white/[0.12]',
                isToday && !on && 'ring-1 ring-white/50',
              )}
            />
            <span
              aria-hidden
              className={cn(
                'text-[0.8125rem] font-bold',
                isToday ? 'text-daw-text' : 'text-daw-text-3',
              )}
            >
              {DAY_LETTERS[i]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const RING = 2 * Math.PI * 30;

/** Days practised against their target, as a ring. */
export function DaysRing({
  days,
  target,
  className,
}: {
  days: number;
  target: number;
  className?: string;
}) {
  const share = Math.min(1, days / Math.max(1, target));
  return (
    <svg
      viewBox="0 0 72 72"
      className={cn('size-[5.5rem] shrink-0 -rotate-90', className)}
      role="img"
      aria-label={`${days} of ${target} days this week`}
    >
      <circle
        cx="36"
        cy="36"
        r="30"
        fill="none"
        stroke="rgb(255 255 255 / 0.1)"
        strokeWidth="6"
      />
      {share > 0 && (
        <circle
          cx="36"
          cy="36"
          r="30"
          fill="none"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${share * RING} ${RING}`}
          className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
        />
      )}
    </svg>
  );
}

/**
 * This week at a glance, beside the hero: a weekly target rather than a
 * streak to lose, and only numbers that aren't zero (never "0-day streak").
 */
export function WeekCard({
  stats,
  target,
  streak,
  nowMs,
  className,
}: {
  stats: WeekStats;
  nowMs: number;
  /** Their days-a-week goal; null if they haven't set one. */
  target: number | null;
  streak: number;
  className?: string;
}) {
  const goal = target ?? 3;
  const facts = [
    stats.xp > 0 && { value: stats.xp.toLocaleString(), label: 'XP' },
    stats.finished > 0 && {
      value: String(stats.finished),
      label: stats.finished === 1 ? 'lesson finished' : 'lessons finished',
    },
    streak > 1 && { value: String(streak), label: 'days in a row' },
  ].filter((f): f is { value: string; label: string } => Boolean(f));
  const met = stats.daysActive >= goal;

  return (
    <section
      aria-labelledby="learn-week-title"
      data-learn-home="streak"
      className={cn(
        'flex flex-col gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-6',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="learn-week-title" className="text-[1.125rem] text-daw-text">
          This week
        </h2>
        <Link
          to={WelcomeRoutes.root(undefined, { edit: '1', step: 'days' })}
          className={cn(
            'rounded-full text-[0.8125rem] text-daw-text-3 hover:text-daw-text',
            FOCUS_RING,
          )}
        >
          {target ? 'Change goal' : 'Set a goal'}
        </Link>
      </div>
      <div className="flex items-center gap-5">
        <DaysRing days={stats.daysActive} target={goal} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[1.75rem] leading-none text-daw-text">
            {stats.daysActive}
            <span className="text-[1rem] text-daw-text-3"> / {goal} days</span>
          </span>
          <span className="text-[0.875rem] text-daw-text-3">
            {stats.daysActive === 0
              ? 'Your week starts with one lesson.'
              : met
                ? 'Goal reached. Anything more is a bonus.'
                : `${goal - stats.daysActive} more to reach your goal.`}
          </span>
        </div>
      </div>
      <WeekStrip active={stats.activeDates} nowMs={nowMs} />
      {facts.length > 0 && (
        <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-4">
          {facts.map((fact) => (
            <div key={fact.label} className="flex min-w-0 flex-col">
              <dt className="order-2">
                <MicroLabel>{fact.label}</MicroLabel>
              </dt>
              <dd className="order-1 text-[1.25rem] text-daw-text">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
