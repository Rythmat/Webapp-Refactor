import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { XpTrackerCard } from '@/components/ClassroomLayout/dashboard/XpTrackerCard';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { type ActivityItem } from '@/hooks/data';
import { useLastLearnActivity } from '@/hooks/data/useLearnActivity';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { LearnQuickStart } from './LearnQuickStart';
import { RecentLessonsSection } from './RecentLessonsSection';
import { SavedSongsSection } from './SavedSongsSection';

const Thumbnail = ({ item }: { item: ActivityItem }) => {
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
  // Lessons show their Genre/Theory hex tile (same interactive tile as the Learn
  // sections). Falls back to a procedural hex avatar if the tile is unmapped.
  if (item.image) {
    return (
      <HexWaveBackground
        src={item.image}
        drain={false}
        ambient
        colorThreshold={0.05}
        brushRadius={40}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    );
  }
  return (
    <HexAvatarSVG
      config={defaultAvatarConfig(item.accentColor ?? item.title)}
      circular={false}
      size={160}
      className="h-full w-full"
    />
  );
};

/** Top "resume where you left off" banner, built from the most recent activity. */
const ContinueBar = ({ item }: { item: ActivityItem }) => (
  <Link
    to={item.route}
    aria-label={`Resume ${item.title}`}
    className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/25 hover:bg-white/[0.05] md:gap-5 md:p-4"
    style={
      item.accentColor
        ? { boxShadow: `inset 4px 0 0 0 ${item.accentColor}` }
        : undefined
    }
  >
    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl md:h-24 md:w-24">
      <Thumbnail item={item} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/20">
        <Play className="h-8 w-8 text-white drop-shadow" fill="currentColor" />
      </div>
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-xs uppercase tracking-wide text-white/50 md:text-sm">
        Continue · {item.category}
      </div>
      <div className="truncate text-xl font-semibold text-white md:text-2xl">
        {item.title}
      </div>
      <div className="truncate text-sm text-white/60 md:text-base">
        {item.subtitle}
      </div>
    </div>
    <div className="mr-1 hidden items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform group-hover:scale-105 sm:flex">
      <Play className="h-4 w-4" fill="currentColor" />
      Resume
    </div>
  </Link>
);

/** Empty-state banner shown when there's no recent activity yet. */
const StartLearningBar = () => (
  <Link
    to="?tab=Genre"
    aria-label="Start learning"
    className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.05] md:gap-5 md:p-5"
  >
    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] md:h-24 md:w-24">
      <Play className="h-9 w-9 text-white/80" fill="currentColor" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-xs uppercase tracking-wide text-white/50 md:text-sm">
        Get started
      </div>
      <div className="truncate text-xl font-semibold text-white md:text-2xl">
        Start your first lesson
      </div>
      <div className="truncate text-sm text-white/60 md:text-base">
        Pick a genre pathway and begin playing.
      </div>
    </div>
    <div className="mr-1 hidden items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform group-hover:scale-105 sm:flex">
      Browse
      <ArrowRight className="h-4 w-4" />
    </div>
  </Link>
);

/**
 * Learn Home hub — the landing view when no `?tab` is set. Leads with a
 * "Continue" resume banner, then the XP tracker, recent lessons, and saved
 * songs. Tab navigation now lives in the main sidebar (SidebarLearnGroup).
 */
export const LearnHome = () => {
  const resume = useLastLearnActivity();

  return (
    <div className="flex flex-col gap-8 pb-10 md:gap-10">
      <div className="px-6 pt-6 md:px-10 md:pt-10">
        <LearnQuickStart />
      </div>

      <div className="px-6 md:px-10">
        {resume ? <ContinueBar item={resume} /> : <StartLearningBar />}
      </div>

      <div className="px-6 md:px-10">
        <XpTrackerCard />
      </div>

      <div className="px-6 md:px-10">
        <RecentLessonsSection />
      </div>

      <div className="px-6 md:px-10">
        <SavedSongsSection />
      </div>
    </div>
  );
};
