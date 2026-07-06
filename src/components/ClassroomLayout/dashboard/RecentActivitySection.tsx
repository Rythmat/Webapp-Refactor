import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRecentActivity, type ActivityItem } from '@/hooks/data';

const CategoryThumbnail = ({ item }: { item: ActivityItem }) => {
  if (item.thumbnail) {
    return (
      <img
        src={item.thumbnail}
        alt=""
        loading="lazy"
        draggable={false}
        className="h-full w-full object-cover"
      />
    );
  }
  const initial = item.title.charAt(0).toUpperCase() || '·';
  return (
    <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-2xl font-semibold text-white/60">
      {initial}
    </div>
  );
};

const ActivityCard = ({ item }: { item: ActivityItem }) => {
  return (
    <Link
      to={item.route}
      aria-label={`Open ${item.title}`}
      className="group flex h-[150px] w-[380px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/15 hover:bg-white/[0.04] md:h-[190px] md:w-[440px]"
    >
      <div className="h-full w-[150px] flex-shrink-0 overflow-hidden md:w-[190px]">
        <CategoryThumbnail item={item} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-5 py-4 md:gap-2 md:px-6 md:py-5">
        <div className="text-xs uppercase tracking-wide text-white/50 md:text-sm">
          {item.category}
        </div>
        <div className="truncate text-xl font-semibold text-white md:text-2xl">
          {item.title}
        </div>
        <div className="truncate text-base text-white/60 md:text-lg">
          {item.subtitle}
        </div>
      </div>
    </Link>
  );
};

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
