import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StreakGoalCard } from '@/components/ClassroomLayout/dashboard/StreakGoalCard';
import { XpTrackerCard } from '@/components/ClassroomLayout/dashboard/XpTrackerCard';
import { getKeyColor } from '@/components/common/CircleOfFifthsSvg';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { getSong } from '@/curriculum/data/songs';
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

/** Small hex → [r,g,b] parser (#RGB or #RRGGBB); null if unparseable. */
function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.replace('#', '').trim();
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * The Continue item's tint color — a song's key color (same source as the Song
 * Details header), else the lesson/project accentColor. null → no overlay.
 */
function continueTintRgb(item: ActivityItem): [number, number, number] | null {
  if (item.kind === 'song') {
    const song = getSong(item.id.replace('song:', ''));
    return song ? getKeyColor(song) : null;
  }
  return item.accentColor ? hexToRgb(item.accentColor) : null;
}

/** Top "resume where you left off" banner, built from the most recent activity. */
const ContinueBar = ({ item }: { item: ActivityItem }) => {
  const rgb = continueTintRgb(item);
  return (
    <Link
      to={item.route}
      aria-label={`Resume ${item.title}`}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/25 hover:bg-white/[0.05]"
    >
      {/* Key/accent-color tint — same gradient as the Song Details header. */}
      {rgb && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.12) 0%, rgba(${rgb[0]},${rgb[1]},${rgb[2]},0) 70%)`,
          }}
        />
      )}
      <div className="relative z-10 flex items-center gap-4 p-3 md:gap-5 md:p-4">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl md:h-24 md:w-24">
          <Thumbnail item={item} />
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
      </div>
    </Link>
  );
};

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
 * songs. Tab navigation is the inline Learn tab bar (LearnTabBar) shown at the
 * top of each Learn tab.
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
        <StreakGoalCard />
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
