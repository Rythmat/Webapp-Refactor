import { memo, useId, useMemo, type CSSProperties } from 'react';
import { cn } from '@/components/utilities';
import {
  buildCover,
  type CoverDetail,
  type CoverShape,
  type CoverSpec,
} from '@/lib/cover';

// ── A course's cover (owner, 2026-11-04) ───────────────────────────────────
// The generative picture on a Learn card, in place of the sigil: minimal,
// coloured by the course's key, drawn from its music (lib/cover). A course
// of several lessons sits on a little stack of cards, as Suno marks its
// collections. Hovering the card (an ancestor `.group`) eases the picture in
// a touch; reduced motion keeps it still. Flat, it's Samply's art (owner,
// 2026-11-10): no stack, no motion, the corners eased less.

function paint(value: string | undefined, prefix: string) {
  if (!value) return undefined;
  return value.startsWith('@') ? `url(#${prefix}-${value.slice(1)})` : value;
}

function Shape({ shape, prefix }: { shape: CoverShape; prefix: string }) {
  return (
    <path
      d={shape.d}
      fill={shape.stroke ? 'none' : paint(shape.fill, prefix)}
      stroke={paint(shape.stroke, prefix)}
      strokeWidth={shape.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={shape.opacity}
      style={shape.blend ? { mixBlendMode: shape.blend } : undefined}
    />
  );
}

export const CourseCover = memo(function CourseCover({
  cover,
  detail = 'card',
  title,
  stack = true,
  flat = false,
  className,
}: {
  cover: CoverSpec;
  detail?: CoverDetail;
  /** Set large inside the tile (genre covers), as Suno's genre tiles are. */
  title?: string;
  /** Draw a course's stack of cards behind it (off for small thumbnails). */
  stack?: boolean;
  /** Learn's library look: no stack, no hover zoom, rounded-xl. */
  flat?: boolean;
  className?: string;
}) {
  const scene = useMemo(() => buildCover(cover, detail), [cover, detail]);
  const prefix = `cover${useId().replace(/:/g, '')}`;
  const [a, b] = cover.colors;
  const stacked = stack && !flat && cover.stacked;

  return (
    <span
      aria-hidden
      data-course-cover={cover.family}
      className={cn('relative block', stacked && 'mt-2.5', className)}
    >
      {stacked && (
        <>
          <span
            className="absolute inset-x-[12%] -top-2.5 h-6 rounded-t-xl opacity-35"
            style={{ background: b }}
          />
          <span
            className="absolute inset-x-[6%] top-[-0.3rem] h-6 rounded-t-[0.875rem] opacity-60"
            style={{ background: a }}
          />
        </>
      )}
      <span
        className={cn(
          'relative block size-full overflow-hidden ring-1 ring-inset ring-white/[0.08] @container',
          flat ? 'rounded-xl' : 'rounded-2xl',
        )}
      >
        <span
          className={cn(
            'block size-full',
            !flat &&
              'transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100',
          )}
        >
          {scene.kind === 'mesh' ? (
            <span
              className="block size-full"
              style={
                {
                  backgroundColor: scene.base,
                  backgroundImage: scene.layers.join(','),
                } as CSSProperties
              }
            />
          ) : (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid slice"
              className="block size-full"
            >
              <defs>
                {scene.gradients.map((g) => (
                  <linearGradient
                    key={g.id}
                    id={`${prefix}-${g.id}`}
                    gradientUnits="userSpaceOnUse"
                    x1={g.x1}
                    y1={g.y1}
                    x2={g.x2}
                    y2={g.y2}
                  >
                    {g.stops.map(([offset, color]) => (
                      <stop key={offset} offset={offset} stopColor={color} />
                    ))}
                  </linearGradient>
                ))}
              </defs>
              <rect
                width="100"
                height="100"
                fill={paint(scene.background, prefix)}
              />
              {scene.shapes.map((shape, i) => (
                <Shape key={i} shape={shape} prefix={prefix} />
              ))}
            </svg>
          )}
        </span>
        {title && (
          <span className="absolute left-[8%] top-[7%] max-w-[84%] text-[13cqw] font-bold leading-[1.05] text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.25)]">
            {title}
          </span>
        )}
      </span>
    </span>
  );
});
