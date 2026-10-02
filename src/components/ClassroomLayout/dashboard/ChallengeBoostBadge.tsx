import { Zap } from 'lucide-react';
import { useXpBoost } from '@/hooks/data/challenges/useXpBoost';

const PILL =
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium';

/**
 * Small XP-boost pill for the Challenges section header: shows an active 2×
 * window, a claimable boost (earned by finishing yesterday's set), or the
 * "boost tomorrow" pending state. Renders nothing when there's no boost.
 */
export const ChallengeBoostBadge = () => {
  const { isActive, claimable, pendingSoon, multiplier, claim } = useXpBoost();

  if (isActive) {
    return (
      <span className={`${PILL} border border-white/20 bg-white/10 text-white`}>
        <Zap className="h-4 w-4" fill="currentColor" />
        {multiplier}× XP active
      </span>
    );
  }
  if (claimable) {
    return (
      <button
        type="button"
        onClick={() => claim.mutate()}
        className={`${PILL} border border-white bg-white text-[#101012] transition-colors hover:bg-white/90`}
      >
        <Zap className="h-4 w-4" fill="currentColor" />
        Claim your {multiplier}× XP
      </button>
    );
  }
  if (pendingSoon) {
    return (
      <span
        className={`${PILL} border border-white/10 bg-white/[0.04] text-white/55`}
      >
        <Zap className="h-4 w-4" />
        {multiplier}× boost tomorrow
      </span>
    );
  }
  return null;
};
