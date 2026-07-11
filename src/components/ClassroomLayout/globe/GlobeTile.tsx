import { useMemo, type FC, type ReactNode } from 'react';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';

interface GlobeTileProps {
  title: string;
  subtitle?: string;
  /** Seed for the deterministic curated hex-tile palette. */
  seed: string;
  /** When set, the tile is a button; otherwise a static display card. */
  onClick?: () => void;
  ariaLabel?: string;
  /** Custom art for the thumbnail area; falls back to the interactive hex tile. */
  art?: ReactNode;
}

/**
 * Shared Globe-dashboard card — the same interactive honeycomb hex tile used
 * across the app (Arcade game cards, Studio project thumbnails) under a
 * legibility wash, with a title + optional subtitle. Used by the Regions /
 * Music Cities / Instruments / Scales shelves.
 */
export const GlobeTile: FC<GlobeTileProps> = ({
  title,
  subtitle,
  seed,
  onClick,
  ariaLabel,
  art,
}) => {
  const hasArt = art != null;
  const tile = useMemo(
    () => (hasArt ? '' : generateStudioTileSvg(`globe:${seed}`, 480, 280)),
    [seed, hasArt],
  );

  const inner = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden bg-[#101012]">
        {/* Custom art (e.g. a region's globe polygons) or the interactive hex
            tile. pointer-events-none so the whole card stays one target. */}
        {art ?? (
          <HexWaveBackground
            src={tile}
            drain={false}
            ambient
            backgroundColor="#101012"
            colorThreshold={0.05}
            brushRadius={40}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="flex flex-col gap-0.5 px-4 pb-4 pt-3">
        <span className="truncate text-base font-medium text-white md:text-xl">
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-sm text-white/50">{subtitle}</span>
        )}
      </div>
    </>
  );

  const className =
    'group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-all duration-200 hover:-translate-y-1 hover:border-white/25';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? title}
        className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf]/60`}
      >
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
};
