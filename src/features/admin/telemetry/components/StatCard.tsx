import { Card } from '@/components/ui/card';

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
    <Card className="border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
      )}
    </Card>
  );
};
