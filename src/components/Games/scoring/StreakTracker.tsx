import { cn } from '@/lib/utils';

type Props = {
  count: number;
  target?: number;
  className?: string;
};

export function StreakTracker({ count, target = 5, className }: Props) {
  return (
    <div
      className={cn(
        'absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 select-none pointer-events-none',
        className,
      )}
    >
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        Streak
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: target }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2.5 w-2.5 rounded-full border transition-all duration-200',
              i < count
                ? 'border-primary bg-primary scale-110'
                : 'border-muted-foreground/40 bg-transparent',
            )}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">
        {count} / {target}
      </span>
    </div>
  );
}
