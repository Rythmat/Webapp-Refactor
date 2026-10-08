import { Lock } from 'lucide-react';
import { cn } from '@/components/utilities';

interface PremiumBadgeProps {
  /** The student's plan doesn't include it: the badge shows a lock too. */
  locked?: boolean;
  className?: string;
}

/**
 * Marks what needs Premium, such as the four Prism lessons on the Production
 * tab (owner decision 8). Neutral rather than an accent, since colour is for
 * meaning, and at the 12 px label floor.
 *
 * Stage A's minimal badge, built in its final home so Stage B restyles it in
 * place and the lesson launcher (1.2b) reuses it (plan: integration rules).
 */
export function PremiumBadge({ locked = false, className }: PremiumBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80',
        className,
      )}
    >
      {locked && <Lock aria-hidden className="size-3" />}
      Premium
    </span>
  );
}
