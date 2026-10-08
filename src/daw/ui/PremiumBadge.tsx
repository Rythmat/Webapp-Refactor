import { Lock } from 'lucide-react';
import { Chip } from './Chip';

interface PremiumBadgeProps {
  /** The student's plan doesn't include it: the badge shows a lock too. */
  locked?: boolean;
  className?: string;
}

/**
 * Marks what needs Premium, such as the four Prism lessons on the Production
 * tab (owner decision 8). A neutral Chip rather than an accent, since colour
 * is for meaning, at the 12 px label floor.
 *
 * Built in its final home in Stage A (1.2), so Stage B restyles it in place
 * (2.2, onto Chip) and the lesson launcher reuses it (plan: integration
 * rules). It also renders on the Studio dashboard, outside the editor, which
 * is why it takes nothing heavier than Chip from src/daw.
 */
export function PremiumBadge({ locked = false, className }: PremiumBadgeProps) {
  return (
    <Chip
      className={className}
      icon={locked ? <Lock aria-hidden /> : undefined}
    >
      Premium
    </Chip>
  );
}
