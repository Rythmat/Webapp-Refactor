import { ArrowRight, Target } from 'lucide-react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { CardShell, HeaderRow } from '@/components/ui/CardShell';
import { Skeleton } from '@/components/ui/skeleton';
import { useChallenges } from '@/hooks/data/challenges';
import { useCountdown } from '@/hooks/useCountdown';
import { useUISound } from '@/hooks/useUISound';
import { formatTimeRemaining } from '@/lib/challenges/formatRemaining';
import type { Challenge } from '@/lib/challenges/types';

const DAY_MS = 86_400_000;

// A challenge resetting within ~a day is a "Today" item; longer is "This week".
const isDaily = (c: Challenge): boolean =>
  Date.parse(c.deadline) - Date.now() <= 1.5 * DAY_MS;

const META_CLASS =
  'mx-2 min-w-14 flex-shrink-0 text-right tabular-nums sm:mx-3 sm:min-w-20';
const META_STYLE = { fontSize: 'clamp(0.7rem, 0.95vw, 0.9rem)' } as const;

// Calm remaining-time label for weekly items — deliberately no amber "urgent"
// state (manufactured urgency is a dark pattern, especially for minors).
const RemainingLabel: FC<{ deadline: string }> = ({ deadline }) => {
  const { expired } = useCountdown(deadline);
  return (
    <span
      className={`${META_CLASS} ${expired ? 'text-white/30' : 'text-white/55'}`}
      style={META_STYLE}
    >
      {expired ? 'Expired' : formatTimeRemaining(deadline)}
    </span>
  );
};

const ChallengeRow: FC<{ challenge: Challenge; onSelect: () => void }> = ({
  challenge,
  onSelect,
}) => {
  const isCompleted = challenge.status === 'completed';
  const isExpired = challenge.status === 'expired';
  const isInactive = isCompleted || isExpired;
  const clickable = !isInactive && !!challenge.route;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!clickable}
      className="group flex items-center justify-between text-left transition-colors hover:bg-white/[0.03] disabled:cursor-default"
      style={{
        padding: 'clamp(0.6rem, 0.9vw, 0.85rem) clamp(0.25rem, 0.5vw, 0.5rem)',
      }}
    >
      <span
        className={`flex-1 truncate ${
          isInactive ? 'text-white/40 line-through' : 'text-white'
        }`}
        style={{ fontSize: 'clamp(0.75rem, 1vw, 0.95rem)' }}
      >
        {challenge.name}
      </span>
      {isCompleted ? (
        <span className={`${META_CLASS} text-emerald-400`} style={META_STYLE}>
          Completed
        </span>
      ) : isExpired ? (
        <span className={`${META_CLASS} text-white/30`} style={META_STYLE}>
          Expired
        </span>
      ) : isDaily(challenge) ? (
        <span className={`${META_CLASS} text-white/40`} style={META_STYLE}>
          Resets tomorrow
        </span>
      ) : (
        <RemainingLabel deadline={challenge.deadline} />
      )}
      <span
        className={`mr-2 min-w-12 flex-shrink-0 text-right tabular-nums sm:mr-3 sm:min-w-[4.5rem] ${
          isInactive ? 'text-white/40' : 'text-white'
        }`}
        style={{ fontSize: 'clamp(0.7rem, 0.95vw, 0.9rem)' }}
      >
        {challenge.xpReward} XP
      </span>
      <span
        className={`flex flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
          clickable
            ? 'border-white/15 group-hover:border-white/40'
            : 'border-white/5'
        }`}
        style={{
          width: 'clamp(1.75rem, 2.2vw, 2.25rem)',
          height: 'clamp(1.75rem, 2.2vw, 2.25rem)',
        }}
      >
        <ArrowRight
          className={clickable ? 'text-white/85' : 'text-white/20'}
          style={{
            width: 'clamp(0.85rem, 1.05vw, 1rem)',
            height: 'clamp(0.85rem, 1.05vw, 1rem)',
          }}
        />
      </span>
    </button>
  );
};

const Group: FC<{
  title: string;
  items: Challenge[];
  onSelect: (c: Challenge) => void;
}> = ({ title, items, onSelect }) => {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col">
      <h3
        className="px-1 pb-1 font-semibold uppercase tracking-wide text-white/35"
        style={{ fontSize: 'clamp(0.6rem, 0.8vw, 0.7rem)' }}
      >
        {title}
      </h3>
      <div className="flex flex-col divide-y divide-white/[0.06]">
        {items.map((c) => (
          <ChallengeRow key={c.id} challenge={c} onSelect={() => onSelect(c)} />
        ))}
      </div>
    </div>
  );
};

export const ChallengesCard: FC = () => {
  const navigate = useNavigate();
  const { play } = useUISound();
  const { data, isLoading } = useChallenges();

  const challenges = data?.challenges ?? [];
  const daily = challenges.filter(isDaily).slice(0, 4);
  const weekly = challenges.filter((c) => !isDaily(c)).slice(0, 4);

  const select = (c: Challenge) => {
    if (!c.route) return;
    play('click');
    navigate(c.route);
  };

  return (
    <CardShell header={<HeaderRow icon={Target} title="Challenges" />}>
      <div style={{ marginTop: 'clamp(0.75rem, 1vw, 1rem)' }}>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-white/5" />
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <p
            className="text-white/50"
            style={{ fontSize: 'clamp(0.7rem, 0.95vw, 0.9rem)' }}
          >
            No challenges yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <Group title="Today" items={daily} onSelect={select} />
            <Group title="This week" items={weekly} onSelect={select} />
          </div>
        )}
      </div>
    </CardShell>
  );
};
