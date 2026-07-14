import { BookOpen } from 'lucide-react';
import { ActivityCard } from '@/components/ClassroomLayout/dashboard/ActivityCard';
import { useProgressSummary } from '@/hooks/data/progress/useProgressSummary';
import { useRecentLessons } from '@/hooks/data/useLearnActivity';

/**
 * Learn hub — recently touched lessons (theory modes + genre curriculum),
 * most-recent first. Replaces part of the merged RecentActivity feed so only
 * learning-relevant items show.
 */
export const RecentLessonsSection = () => {
  const items = useRecentLessons();
  const { data: progress } = useProgressSummary(true);
  const completed = (progress?.lessons ?? []).reduce(
    (sum, l) => sum + (l.completedCount ?? 0),
    0,
  );

  return (
    <section
      aria-label="Recent Lessons"
      className="flex flex-col gap-4 md:gap-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-3">
          <BookOpen className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Recent Lessons
          </h2>
        </div>
        {completed > 0 && (
          <div className="flex-shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/70">
            {completed} {completed === 1 ? 'activity' : 'activities'} completed
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-base text-white/50 md:text-lg">
          Your recent lessons will appear here.
        </p>
      ) : (
        <div className="-mx-2 overflow-x-auto pb-2">
          <div className="flex gap-4 px-2 md:gap-5">
            {items.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
