import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { ProfileRoutes } from '@/constants/routes';
import { useCreditsBalance } from '@/hooks/data/credits';

interface CreditsBadgeProps {
  isCollapsed?: boolean;
}

export const CreditsBadge = ({ isCollapsed = false }: CreditsBadgeProps) => {
  const { data, isLoading } = useCreditsBalance();

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2',
          isCollapsed && 'justify-center px-0',
        )}
      >
        <Sparkles className="size-4 text-muted-foreground" />
        {!isCollapsed && (
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <Link
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-100',
        isCollapsed && 'justify-center px-2',
      )}
      to={ProfileRoutes.plan()}
    >
      <Sparkles className="size-4 text-amber-500" />
      {!isCollapsed && (
        <span className="text-muted-foreground">{data.balance} credits</span>
      )}
    </Link>
  );
};
