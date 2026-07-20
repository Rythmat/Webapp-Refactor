import { Heart } from 'lucide-react';
import { ActivityCard } from '@/components/ClassroomLayout/dashboard/ActivityCard';
import { useSavedSongsActivity } from '@/hooks/data/useLearnActivity';

/**
 * Learn hub — the user's saved songs, most-recently-saved first. Replaces part
 * of the merged RecentActivity feed so only learning-relevant items show.
 */
export const SavedSongsSection = () => {
  const items = useSavedSongsActivity();

  return (
    <section aria-label="Saved Songs" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center gap-2 md:gap-3">
        <Heart className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
        <h2 className="text-xl font-medium text-white md:text-2xl">
          Saved Songs
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="text-base text-white/50 md:text-lg">
          Songs you save will appear here.
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
