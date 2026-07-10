import { Lock, Play } from 'lucide-react';
import { useMemo, type FC } from 'react';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import type { ArcadeGame } from '../arcadeGames';

const relativeTime = (ts: number): string => {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return day === 1 ? 'yesterday' : `${day}d ago`;
};

interface GameCardProps {
  game: ArcadeGame;
  free: boolean;
  locked: boolean;
  onLaunch: () => void;
  /** Wider layout used by the "Jump back in" row. */
  wide?: boolean;
  /** When set (jump-back-in), shows a "last played" subtitle instead of the blurb. */
  lastPlayedAt?: number;
  /** Genre-card-style portrait tile (aspect-[3/4], full-bleed art + title
   *  overlay, no blurb) used by the category shelves' dashboard variant. */
  portrait?: boolean;
}

/**
 * A single Arcade game "cover-art" card — an interactive HexWaveBackground tile
 * (the same hex art used across the app: lessons, studio projects, the Arcade
 * hero) seeded deterministically per game, under a legibility wash, with a
 * Free/Premium badge, hover-to-play, and title + one-liner. Shared by the
 * category shelves and the "Jump back in" row.
 */
export const GameCard: FC<GameCardProps> = ({
  game,
  free,
  locked,
  onLaunch,
  wide = false,
  lastPlayedAt,
  portrait = false,
}) => {
  const tile = useMemo(
    () =>
      generateStudioTileSvg(
        `arcade:${game.title}`,
        portrait ? 360 : 480,
        portrait ? 480 : 280,
      ),
    [game.title, portrait],
  );

  const subtitle =
    lastPlayedAt != null
      ? `Last played ${relativeTime(lastPlayedAt)}`
      : game.blurb;

  // Genre-card-style portrait tile: full-bleed hex art in an aspect-[3/4] tile
  // with a title overlay (dashboard font), keeping the badge + hover-play.
  if (portrait) {
    return (
      <button
        type="button"
        onClick={locked ? undefined : onLaunch}
        aria-label={`Play ${game.title}`}
        className="group relative flex aspect-[3/4] w-[220px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] text-left transition-transform hover:-translate-y-px hover:border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf]/60"
      >
        <HexWaveBackground
          src={tile}
          drain={false}
          ambient
          backgroundColor="#101012"
          colorThreshold={0.05}
          brushRadius={40}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        {/* Legibility wash so the title, badge, and play button read over art. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

        {/* Title overlay — Genre-card chip, dashboard font. */}
        <div className="relative z-10 m-3 rounded-lg bg-black/70 px-4 py-3 backdrop-blur-sm md:rounded-xl">
          <div className="text-base font-medium text-white md:text-xl">
            {game.title}
          </div>
        </div>

        {locked ? (
          <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white/70 backdrop-blur-sm">
            <Lock className="h-3 w-3" /> Premium
          </span>
        ) : free ? (
          <span className="absolute bottom-3 left-3 z-10 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
            Free
          </span>
        ) : null}

        {!locked && (
          <span className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#7ecfcf] text-[#06201f] opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
              <Play className="h-5 w-5" fill="currentColor" />
            </span>
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={locked ? undefined : onLaunch}
      aria-label={`Play ${game.title}`}
      className={`group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-all duration-200 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf]/60 ${
        wide ? 'w-[300px]' : 'w-[236px]'
      }`}
    >
      <div
        className={`relative overflow-hidden ${wide ? 'h-[150px]' : 'h-[138px]'}`}
      >
        {/* Interactive hex tile — pointer-events-none so the card click still
            launches the game while the canvas paints toward the cursor. */}
        <HexWaveBackground
          src={tile}
          drain={false}
          ambient
          backgroundColor="#101012"
          colorThreshold={0.05}
          brushRadius={40}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        {/* Legibility wash so badges + the hover play button read over the art. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

        {locked ? (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white/70 backdrop-blur-sm">
            <Lock className="h-3 w-3" /> Premium
          </span>
        ) : free ? (
          <span className="absolute left-3 top-3 z-10 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
            Free
          </span>
        ) : null}

        {!locked && (
          <span className="absolute bottom-3 right-3 z-10 grid h-10 w-10 translate-y-2 place-items-center rounded-full bg-[#7ecfcf] text-[#06201f] opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <Play className="h-4 w-4" fill="currentColor" />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5 px-4 pb-4 pt-3">
        <span className="text-[15.5px] font-bold leading-tight tracking-tight text-white">
          {game.title}
        </span>
        <span className="truncate text-[12.5px] text-white/45">{subtitle}</span>
      </div>
    </button>
  );
};
