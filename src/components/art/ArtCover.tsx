// ── ArtCover ───────────────────────────────────────────────────────────────
// An item's generative cover (lib/art), filling its box: hairline strands,
// rings, contours or a helix, stroked with one multi-hue gradient on the
// dark canvas (owner, 2026-10-28: the Muzaic look).
//
// Motion is CSS transforms only (artCover.css):
//   none   still
//   hover  breathes while its `.art-host` is hovered or focused (tiles)
//   drift  always moving while on screen: flowing kinds slide one frame
//          along forever, the rest sway (heroes)
// Reduced motion keeps every cover still.

import { memo, useId, useMemo, useRef } from 'react';
import { cn } from '@/components/utilities';
import { useInView } from '@/features/landing/motion/useInView';
import {
  buildArtScene,
  cyclicStops,
  type ArtDensity,
  type ArtKind,
  type ArtPaletteName,
  type ArtScene,
  type ArtTone,
  type ChladniMode,
  paletteAccent,
  type RingsVariant,
} from '@/lib/art';
import './artCover.css';

export type ArtMotion = 'none' | 'hover' | 'drift';

export interface ArtCoverProps {
  /** The item's id: the same seed, the same cover. */
  seed: string;
  kind?: ArtKind;
  variant?: RingsVariant;
  /** Chladni only: the plate's mode. */
  mode?: ChladniMode;
  palette?: ArtPaletteName;
  density?: ArtDensity;
  /** Width ÷ height of the box it fills (a portrait tile is 0.75). */
  aspect: number;
  motion?: ArtMotion;
  /**
   * Where the lines fade out: 'auto' (the scene's own, mostly toward the
   * bottom, where a card's words sit), 'none', or a CSS angle in degrees
   * (90 fades them toward the right; a hero's words on the left take 270),
   * or 'vignette': out to every edge, a figure floating in its card (the
   * Arcade's Learn-style tiles).
   */
  fade?: 'auto' | 'none' | 'vignette' | number;
  /**
   * The palette the lines turn to while their `.art-host` is hovered or
   * focused (the Arcade's white waves taking the key rainbow): the same
   * lines again in it, crossfading over the still ones.
   */
  hoverPalette?: ArtPaletteName;
  /**
   * The lines' own colours instead of a palette's (CSS colours, var()s
   * allowed): run as one lap, back to the first. The Arcade's featured
   * card takes the page's glow colours this way, easing as they ease.
   * A toned cover (Chladni) takes the first as its hue.
   */
  colors?: readonly string[];
  className?: string;
}

/** A toned stroke's colour, from the cover's hue (a var() allowed). */
export const toneColor = (tone: ArtTone, accent: string): string =>
  tone === 'white'
    ? '#F4F4F8'
    : tone === 'tint'
      ? `color-mix(in oklab, ${accent} 52%, #ffffff)`
      : accent;

/** A gradient id SVG accepts: useId's colons stripped. */
export const svgId = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '');

/** The scene's gradient, for any SVG to stroke with (`url(#id)`). */
export function ArtGradientDefs({
  id,
  scene,
}: {
  id: string;
  scene: Pick<ArtScene, 'gradient'>;
}) {
  const g = scene.gradient;
  return (
    <defs>
      <linearGradient
        id={id}
        gradientUnits="userSpaceOnUse"
        x1={g.x1}
        y1={g.y1}
        x2={g.x2}
        y2={g.y2}
        spreadMethod={g.spread}
      >
        {g.stops.map((stop) => (
          // As a style, so a var() colour resolves (and eases with it).
          <stop
            key={stop.offset}
            offset={stop.offset}
            style={{ stopColor: stop.color }}
          />
        ))}
      </linearGradient>
    </defs>
  );
}

export const ArtCover = memo(function ArtCover({
  seed,
  kind,
  variant,
  mode,
  palette,
  density = 'tile',
  aspect,
  motion = 'none',
  fade = 'auto',
  hoverPalette,
  colors,
  className,
}: ArtCoverProps) {
  const scene = useMemo(
    () =>
      buildArtScene({
        seed,
        kind,
        variant,
        mode,
        palette,
        density,
        aspect,
        loop: motion === 'drift',
      }),
    // mode's fields stand for it (a fresh object each render is the same).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      seed,
      kind,
      variant,
      mode?.n,
      mode?.m,
      mode?.sign,
      palette,
      density,
      aspect,
      motion,
    ],
  );
  const gradientId = `art-${svgId(useId())}`;
  // Given colours replace the palette's lap on the scene's run.
  const colorKey = colors?.join('|');
  const baseScene = useMemo(() => {
    if (!colors?.length) return scene;
    const lap = [...colors, colors[0]];
    return {
      ...scene,
      gradient: {
        ...scene.gradient,
        stops: lap.map((color, i) => ({
          offset: i / (lap.length - 1),
          color,
        })),
      },
    };
    // colorKey stands for colors' contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, colorKey]);
  // A toned cover's hue: the first given colour, else its palette's.
  const accent = colors?.[0] ?? paletteAccent(scene.palette);
  const hoverId = `${gradientId}-hover`;
  // The hover lines' gradient: the scene's run, the hover palette's lap.
  const hoverScene = useMemo(() => {
    if (!hoverPalette) return null;
    const lap = cyclicStops(hoverPalette);
    return {
      gradient: {
        ...scene.gradient,
        stops: lap.map((color, i) => ({
          offset: i / (lap.length - 1),
          color,
        })),
      },
    };
  }, [hoverPalette, scene]);
  const ref = useRef<HTMLDivElement>(null);
  // Only a drifting cover runs by itself; it rests while off screen.
  const inView = useInView(ref, { rootMargin: '120px' });
  // The fade is the box's (a mask), so it stays put while the drawing
  // slides under it.
  const angle = fade === 'auto' ? scene.fadeAngle : fade;
  const mask =
    angle === 'none'
      ? undefined
      : angle === 'vignette'
        ? 'radial-gradient(closest-side, #000 62%, rgba(0,0,0,0.45) 84%, transparent 100%)'
        : `linear-gradient(${angle}deg, #000 0%, #000 34%, rgba(0,0,0,0.4) 60%, transparent 82%)`;

  return (
    <div
      ref={ref}
      aria-hidden
      data-art-cover={scene.kind}
      data-art-palette={scene.palette}
      data-motion={motion}
      data-flow={scene.loop || undefined}
      data-paused={motion === 'drift' && !inView ? '' : undefined}
      className={cn('art-cover pointer-events-none', className)}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
    >
      <div className="art-drift">
        <svg
          viewBox={`0 0 ${scene.viewWidth} ${scene.height}`}
          // A sliding cover must keep its frame at exactly half the drawing,
          // so it stretches to the box; a still one fills and crops.
          preserveAspectRatio={scene.loop ? 'none' : 'xMidYMid slice'}
          focusable="false"
          className="art-svg"
        >
          <ArtGradientDefs id={gradientId} scene={baseScene} />
          {hoverScene && <ArtGradientDefs id={hoverId} scene={hoverScene} />}
          <g className="art-base">
            {scene.layers.map((layer) => (
              <path
                key={layer.glow ? 'glow' : layer.opacity}
                data-art-glow={layer.glow || undefined}
                d={layer.d}
                fill="none"
                stroke={layer.tone ? undefined : `url(#${gradientId})`}
                // A toned line's colour as a style, so a var() resolves.
                style={
                  layer.tone
                    ? { stroke: toneColor(layer.tone, accent) }
                    : undefined
                }
                strokeOpacity={layer.opacity}
                strokeWidth={scene.strokeWidth * layer.widthScale}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
          {hoverScene && (
            <g className="art-hover" data-art-hover={hoverPalette}>
              {scene.layers.map((layer) => (
                <path
                  key={`h-${layer.glow ? 'glow' : layer.opacity}`}
                  d={layer.d}
                  fill="none"
                  stroke={`url(#${hoverId})`}
                  strokeOpacity={layer.opacity}
                  strokeWidth={scene.strokeWidth * layer.widthScale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
});
