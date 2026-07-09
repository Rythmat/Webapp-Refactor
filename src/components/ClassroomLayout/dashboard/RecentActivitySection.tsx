import { ArrowRight } from 'lucide-react';
import { useRecentActivity } from '@/hooks/data';
import { ActivityCard } from './ActivityCard';

export const RecentActivitySection = () => {
  const items = useRecentActivity();

  return (
    <section
      aria-label="Recent Activity"
      className="flex flex-col gap-4 md:gap-5"
    >
      <div className="flex items-center gap-2 md:gap-3">
        <ArrowRight className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
        <h2 className="text-xl font-medium text-white md:text-2xl">
          Recent Activity
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="text-base text-white/50 md:text-lg">
          Your recent lessons, projects, and saved songs will appear here.
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
