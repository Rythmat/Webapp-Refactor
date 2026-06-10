/**
 * Home Dashboard layout.
 *
 * ⚠ BEFORE CHANGING ANYTHING IN THIS FILE: read docs/dashboard-responsive.md.
 *
 * Three pillars (don't fight them):
 *   1. CSS Grid template areas — defined in dashboard/dashboard.css (.home-grid)
 *   2. Container queries — for banner overlays via cqw units
 *   3. CardShell + Radix ScrollArea — internal scroll on every list-style card
 *
 * Do not add overflow-y-auto here (the parent <main> wrapper already scrolls).
 * Do not add overflow-hidden to card bodies (defeats CardShell). Do not size
 * banner overlays in viewport %; use cqw against the banner container.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { getChordScales } from '@/components/learn/chordScaleData';
import { LearnRoutes, StudioRoutes } from '@/constants/routes';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { getAllSongs, getSong } from '@/curriculum/data/songs';
import { useProgressSummary } from '@/hooks/data';
import { type PrismModeSlug } from '@/hooks/data/prism';
import { useUISound } from '@/hooks/useUISound';
import { keyLabelToUrlParam, urlParamToKeyLabel } from '@/lib/musicKeyUrl';
import { studioProjectsApi } from '@/lib/studio-projects/api';
import { ChallengesCard } from './dashboard/ChallengesCard';
import { FeaturedSongCard } from './dashboard/FeaturedSongCard';
import { HoneycombCarousel } from './dashboard/HoneycombCarousel';
import { QuickStartCard } from './dashboard/QuickStartCard';
import { RecentProjects, type RecentProject } from './dashboard/RecentProjects';
import { XpCalendar } from './dashboard/XpCalendar';

const BANNER_SLIDES: string[] = [
  '/backgrounds/banner1.svg',
  '/backgrounds/banner2.svg',
  '/backgrounds/banner3.svg',
  '/backgrounds/banner4.svg',
];

function shuffleIds(ids: readonly string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const HomeInlet = () => {
  const navigate = useNavigate();
  const { play } = useUISound();
  const token = useAuthToken();
  const { data: progressSummary } = useProgressSummary(true);

  // Most-recently-touched projects for the dashboard grid. The list endpoint
  // already orders by updatedAt desc; we only need the first 4.
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await studioProjectsApi.list(token);
        if (cancelled) return;
        setRecentProjects(
          list.slice(0, 4).map((p) => ({
            id: p.id,
            title: p.name,
          })),
        );
      } catch (err) {
        console.error('Failed to load recent projects', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleOpenProject = (id: string) => {
    play('click');
    navigate(
      `${StudioRoutes.root.definition}?project=${encodeURIComponent(id)}`,
    );
  };

  const handleCreateProject = () => {
    play('click');
    navigate(`${StudioRoutes.root.definition}?new=1`);
  };

  // Featured songs: cycle through one song per UNIQUE SVG-trial artist.
  // Filter songs whose artistImageRef points at /artists/svg/* and dedupe by
  // artist so the user sees every artist's illustration once per cycle —
  // re-shuffle once the queue is exhausted, then start over.
  const featuredPool = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const s of getAllSongs()) {
      if (!s.artistImageRef?.startsWith('/artists/svg/')) continue;
      if (seen.has(s.artist)) continue;
      seen.add(s.artist);
      result.push(s.id);
    }
    return result;
  }, []);

  const [queue, setQueue] = useState(() => shuffleIds(featuredPool));
  const [cursor, setCursor] = useState(0);

  // Decoupled from the banner's slide index: the banner has 4 slides on a
  // loop, the featured queue has ~67. Each banner change advances the cursor
  // by one; when the queue is exhausted we reshuffle and reset to 0.
  const advanceFeatured = useCallback(() => {
    setCursor((c) => {
      const next = c + 1;
      if (next >= queue.length) {
        setQueue(shuffleIds(featuredPool));
        return 0;
      }
      return next;
    });
  }, [queue.length, featuredPool]);

  const featuredSong = getSong(queue[cursor] ?? '');

  const latestContinue = (() => {
    const latest = progressSummary?.lessons?.find(
      (l) =>
        l.lessonId.startsWith('mode-lesson-flow') &&
        !!l.mode &&
        !!l.root &&
        (l.completedCount ?? 0) > 0,
    );
    if (!latest?.mode || !latest.root) return null;
    const mode = latest.mode;
    const root = latest.root;
    return {
      modeTitle: getChordScales(mode as PrismModeSlug)?.modeName ?? mode,
      rootTitle: urlParamToKeyLabel(root),
      route: LearnRoutes.lesson({
        mode: mode as PrismModeSlug,
        key: keyLabelToUrlParam(root),
      }),
    };
  })();

  const quickStartCard = (
    <QuickStartCard
      onContinue={() => {
        play('click');
        navigate(latestContinue?.route ?? LearnRoutes.root.definition);
      }}
      onNewSession={() => {
        play('click');
        navigate(StudioRoutes.root.definition);
      }}
    />
  );

  const featuredCardEl = featuredSong ? (
    <FeaturedSongCard song={featuredSong} />
  ) : null;

  return (
    <div
      className="home-grid min-w-[320px]"
      style={{ padding: 'clamp(0.5rem, 0.75vw, 1rem)' }}
    >
      {/* Banner — also the container for absolute overlay cards at lg+.
          container-type: inline-size + container-name: banner lets overlay
          children size in `cqw` against the banner, not the viewport. */}
      <div
        className="area-banner overflow-hidden rounded-2xl"
        style={{
          containerType: 'inline-size',
          containerName: 'banner',
        }}
      >
        <HoneycombCarousel
          slides={BANNER_SLIDES}
          onSlideChange={advanceFeatured}
        />
        <div
          className="absolute bottom-11 left-5 hidden lg:block"
          style={{ width: 'min(36cqw, 36rem)' }}
        >
          {quickStartCard}
        </div>
        {featuredCardEl && (
          <div
            className="absolute bottom-11 right-5 hidden lg:block"
            style={{ width: 'min(28cqw, 22rem)', aspectRatio: '1 / 1' }}
          >
            {featuredCardEl}
          </div>
        )}
      </div>

      {/* Stand-alone QuickStart — used at compact + comfortable; hidden at lg+
          where the absolute overlay above replaces it. */}
      <div className="area-quickstart lg:hidden">{quickStartCard}</div>

      {/* Stand-alone Featured — same pattern. */}
      {featuredCardEl && (
        <div
          className="area-featured lg:hidden"
          style={{ maxWidth: '22rem', aspectRatio: '1 / 1' }}
        >
          {featuredCardEl}
        </div>
      )}

      <div className="area-calendar">
        <XpCalendar />
      </div>
      <div className="area-recent">
        <RecentProjects
          projects={recentProjects}
          onOpenProject={handleOpenProject}
          onCreateNew={handleCreateProject}
        />
      </div>
      <div className="area-challenges">
        <ChallengesCard />
      </div>
    </div>
  );
};
