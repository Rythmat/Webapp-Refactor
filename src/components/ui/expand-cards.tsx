import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { cn } from '@/components/utilities';

export interface ExpandCardItem {
  id: string;
  title: string;
  description: string;
  /** In-app route or external href. */
  href: string;
  icon: React.ReactNode;
  /** CSS color used for the tile's accent tint/hairline/icon chip. */
  accent: string;
  /** Inline `<svg>` markup fed to HexWaveBackground (e.g. generateStudioTileSvg). */
  art: string;
}

/**
 * Expand-on-hover row of tiles. Hovering (or focusing) a tile grows it while the
 * others collapse, with a smooth transition — adapted from a generic
 * `ExpandOnHover` template to the app's dark UI.
 *
 * - Desktop (`lg+`): a flex row; the active tile's `flex-grow` is boosted via a
 *   CSS var so widths always distribute to fit (no fixed-width overflow).
 * - Mobile/touch (`<lg`): tiles stack as full-width cards showing full content
 *   (no hover expand).
 *
 * Each tile is a `<Link>` and reacts to keyboard focus, so it's accessible. The
 * hex canvas is cursor-reactive and respects `prefers-reduced-motion`.
 */
export const ExpandCards = ({
  items,
  defaultIndex,
  className,
}: {
  items: ExpandCardItem[];
  defaultIndex?: number;
  className?: string;
}) => {
  const [active, setActive] = useState(
    defaultIndex ?? Math.floor(items.length / 2),
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:h-[22rem] lg:flex-row lg:items-stretch lg:gap-2',
        className,
      )}
    >
      {items.map((item, i) => {
        const isActive = i === active;
        return (
          <Link
            key={item.id}
            to={item.href}
            aria-label={item.title}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            style={{ '--tile-grow': isActive ? 8 : 1 } as React.CSSProperties}
            className={cn(
              'group relative isolate flex h-44 w-full shrink-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]',
              'transition-[flex-grow,border-color] duration-500 ease-in-out',
              'hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              'lg:h-full lg:w-auto lg:min-w-0 lg:shrink lg:basis-0 lg:grow-[var(--tile-grow)]',
            )}
          >
            {/* Interactive hex art (cursor-reactive; no ambient to keep 9 canvases light). */}
            <HexWaveBackground
              src={item.art}
              drain={false}
              className="pointer-events-none absolute inset-0 -z-0 h-full w-full"
              backgroundColor="#0D0B08"
              colorThreshold={0.05}
              brushRadius={70}
            />

            {/* Accent tint + legibility wash. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                background: `linear-gradient(to top, rgba(0,0,0,0.80), rgba(0,0,0,0.15) 55%, transparent 80%), radial-gradient(130% 90% at 15% 0%, ${item.accent}26, transparent 60%)`,
              }}
            />
            {/* Accent hairline: always on mobile, on lg only when active. */}
            <div
              aria-hidden
              className={cn(
                'absolute inset-x-0 top-0 z-[2] h-[3px] origin-left scale-x-100 transition-transform duration-500',
                !isActive && 'lg:scale-x-0',
              )}
              style={{ background: item.accent }}
            />

            {/* Expanded content (always shown on mobile; on lg only when active). */}
            <div
              className={cn(
                'relative z-[3] flex h-full w-full flex-col justify-end gap-3 p-4 lg:transition-opacity lg:duration-300',
                !isActive && 'lg:pointer-events-none lg:opacity-0',
              )}
            >
              <span
                className="flex size-10 items-center justify-center rounded-xl [&_svg]:size-5"
                style={{ background: `${item.accent}26`, color: item.accent }}
              >
                {item.icon}
              </span>
              <div className="min-w-60">
                <h3 className="text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-sm text-white/70">
                  {item.description}
                </p>
              </div>
            </div>

            {/* Collapsed vertical label (lg + inactive only). */}
            <div
              aria-hidden
              className={cn(
                'absolute inset-0 z-[3] hidden flex-col items-center justify-between py-4',
                !isActive && 'lg:flex',
              )}
            >
              <span
                className="flex size-10 items-center justify-center rounded-xl [&_svg]:size-5"
                style={{ background: `${item.accent}26`, color: item.accent }}
              >
                {item.icon}
              </span>
              <span
                className="whitespace-nowrap text-sm font-semibold uppercase tracking-wide text-white/80"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                {item.title}
              </span>
              <span className="size-10" />
            </div>
          </Link>
        );
      })}
    </div>
  );
};
