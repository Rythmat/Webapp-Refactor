import { ArrowRight, Target } from 'lucide-react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { useChallenges } from '@/hooks/data/challenges';
import { useCountdown } from '@/hooks/useCountdown';
import { useUISound } from '@/hooks/useUISound';
import {
  formatTimeRemaining,
  isExpiringSoon,
} from '@/lib/challenges/formatRemaining';
import type { Challenge } from '@/lib/challenges/types';

const CountdownLabel: FC<{ deadline: string }> = ({ deadline }) => {
  const { expired } = useCountdown(deadline);
  const label = expired ? 'Expired' : formatTimeRemaining(deadline);
  const urgent = !expired && isExpiringSoon(deadline);
  const color = expired
    ? 'text-white/30'
    : urgent
      ? 'text-amber-400'
      : 'text-white/60';

  return (
    <span
      className={`mx-3 min-w-20 flex-shrink-0 text-right tabular-nums ${color}`}
      style={{ fontSize: 'clamp(0.7rem, 0.95vw, 0.9rem)' }}
    >
      {label}
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
        <span
          className="mx-3 min-w-20 flex-shrink-0 text-right text-emerald-400"
          style={{ fontSize: 'clamp(0.7rem, 0.95vw, 0.9rem)' }}
        >
          Completed
        </span>
      ) : isExpired ? (
        <span
          className="mx-3 min-w-20 flex-shrink-0 text-right text-white/30"
          style={{ fontSize: 'clamp(0.7rem, 0.95vw, 0.9rem)' }}
        >
          Expired
        </span>
      ) : (
        <CountdownLabel deadline={challenge.deadline} />
      )}
      <span
        className={`mr-3 min-w-[4.5rem] flex-shrink-0 text-right tabular-nums ${
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

export const ChallengesCard: FC = () => {
  const navigate = useNavigate();
  const { play } = useUISound();
  const { data, isLoading } = useChallenges();

  const challenges = data?.challenges ?? [];

  return (
    <div
      className="glass-panel-sm flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(26, 26, 26, 0.7)',
        padding: 'clamp(0.85rem, 1.3vw, 1.5rem)',
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Target
          className="text-white/85"
          style={{
            width: 'clamp(0.95rem, 1.25vw, 1.15rem)',
            height: 'clamp(0.95rem, 1.25vw, 1.15rem)',
          }}
        />
        <span
          className="font-medium text-white"
          style={{ fontSize: 'clamp(0.75rem, 1.05vw, 1rem)' }}
        >
          Challenges
        </span>
      </div>
      {isLoading ? (
        <div className="flex flex-1 flex-col gap-2">
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
        <div className="flex flex-1 flex-col divide-y divide-white/[0.06]">
          {challenges.slice(0, 4).map((c) => (
            <ChallengeRow
              key={c.id}
              challenge={c}
              onSelect={() => {
                if (!c.route) return;
                play('click');
                navigate(c.route);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
