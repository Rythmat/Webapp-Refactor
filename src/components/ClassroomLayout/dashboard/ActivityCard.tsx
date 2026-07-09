import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import type { ActivityItem } from '@/hooks/data';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';

const CategoryThumbnail = ({ item }: { item: ActivityItem }) => {
  // Studio projects have no predefined tile — synthesise a deterministic
  // honeycomb from their id (memoised so the SVG string is stable per card).
  const projectTile = useMemo(
    () => (item.kind === 'project' ? generateStudioTileSvg(item.id) : null),
    [item.kind, item.id],
  );

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
  // Lessons show their Genre/Theory hex tile — the same interactive tile as the
  // Learn page sections. Falls back to a procedural hex avatar if unmapped.
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
  // Studio projects: the generated interactive honeycomb tile.
  if (projectTile) {
    return (
      <HexWaveBackground
        src={projectTile}
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

/**
 * Horizontal activity card — thumbnail + category/title/subtitle. Shared by the
 * dashboard RecentActivity feed and the Learn hub's Recent Lessons / Saved
 * Songs rows so all three read as one visual language.
 */
export const ActivityCard = ({ item }: { item: ActivityItem }) => {
  return (
    <Link
      to={item.route}
      aria-label={`Open ${item.title}`}
      className="group flex h-[150px] w-[380px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/15 hover:bg-white/[0.04] md:h-[190px] md:w-[440px]"
      style={
        item.accentColor
          ? { boxShadow: `inset 4px 0 0 0 ${item.accentColor}` }
          : undefined
      }
    >
      <div className="relative h-full w-[150px] flex-shrink-0 overflow-hidden md:w-[190px]">
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
