import { Card } from '@/components/ui/card';
import { cn } from '@/components/utilities';
import { CONSOLE_LABEL, CONSOLE_PANEL } from '../../ui/styles';

export const StatCard = ({
  label,
  value,
  sublabel,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: 'default' | 'success' | 'danger';
}) => {
  const valueColor =
    variant === 'success'
      ? 'text-emerald-400'
      : variant === 'danger'
        ? 'text-red-400'
        : 'text-white';

  return (
    <Card className={cn(CONSOLE_PANEL, 'p-4')}>
      <p className={CONSOLE_LABEL}>{label}</p>
      <p
        className={cn(
          'mt-2 text-3xl tabular-nums tracking-[-0.02em]',
          valueColor,
        )}
      >
        {value}
      </p>
      {sublabel && <p className="mt-1 text-sm text-white/55">{sublabel}</p>}
    </Card>
  );
};
