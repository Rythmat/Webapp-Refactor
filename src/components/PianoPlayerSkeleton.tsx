import { Skeleton } from '@/components/ui/skeleton';

export const PianoPlayerSkeleton = () => {
  return (
    <div className="w-full">
      {/* Title skeleton */}
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-6 w-40 bg-muted-foreground/30" />
      </div>

      <div className="rounded-lg bg-foreground py-3 text-background">
        {/* Controls row */}
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <Skeleton className="size-8 rounded-full bg-muted-foreground/40" />
          <Skeleton className="h-2 w-full rounded-full bg-muted-foreground/30" />
        </div>

        {/* Keyboard skeleton */}
        <div className="overflow-x-auto pb-2">
          <Skeleton className="h-16 w-full rounded-md bg-muted-foreground/20" />
        </div>
      </div>

      {/* Info text skeleton */}
      <div className="mt-2 flex justify-end">
        <Skeleton className="h-4 w-32 bg-muted-foreground/30" />
      </div>
    </div>
  );
};
