import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { CurriculumRoutes } from '@/constants/routes';
import { GENRE_COURSES, type GenreCourse } from './genreCourses';

/** Learn's genre levels per course (buildGenreLevels in LearnInlet). */
const LEVELS = 3;

/** The pages stacked behind a cover, back to front (px; Suno's, one deeper). */
const PAGES = [
  { top: 0, inset: 18, opacity: 0.35, fan: 3 },
  { top: 6, inset: 12, opacity: 0.55, fan: 2 },
  { top: 12, inset: 6, opacity: 0.8, fan: 1 },
] as const;

// ── Each cover's own color, for the stack behind it ────────────────────────

const colorCache = new Map<string, string>();
const FALLBACK = 'rgb(70, 70, 82)';

/**
 * The cover's main color: its pixels averaged, the vivid ones weighted up
 * (as Suno's stacks take the art's dominant hue), from a small draw.
 */
function useCoverColor(src: string): string {
  const [color, setColor] = useState(() => colorCache.get(src) ?? FALLBACK);
  useEffect(() => {
    if (colorCache.has(src)) return;
    let live = true;
    const img = new Image();
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // The square the cover shows: the art's centre.
        const side = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          size,
          size,
        );
        const px = ctx.getImageData(0, 0, size, size).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let w = 0;
        for (let i = 0; i < px.length; i += 4) {
          const max = Math.max(px[i], px[i + 1], px[i + 2]);
          const min = Math.min(px[i], px[i + 1], px[i + 2]);
          const weight = 0.15 + (max - min) / 255;
          r += px[i] * weight;
          g += px[i + 1] * weight;
          b += px[i + 2] * weight;
          w += weight;
        }
        const found = `rgb(${Math.round(r / w)}, ${Math.round(g / w)}, ${Math.round(b / w)})`;
        colorCache.set(src, found);
        if (live) setColor(found);
      } catch {
        // A tainted or undrawable image keeps the neutral stack.
      }
    };
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);
  return color;
}

/**
 * A genre, as Suno's Curated Collections show one: the cover over three
 * tinted pages of its own color (a stack), its title and what's in it; on
 * hover a play button. It opens the genre's course.
 */
function GenreCard({ course }: { course: GenreCourse }) {
  const color = useCoverColor(course.image);
  return (
    <Link
      to={CurriculumRoutes.genre({ genre: course.slug })}
      aria-label={`${course.title}: ${LEVELS} levels`}
      className="group flex w-[12.5rem] shrink-0 snap-start flex-col rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {/* The stack: three pages behind the cover, each 6 px higher and 12 px
          narrower than the one in front, dimmer the further back, with a
          dark edge so each reads as its own sheet. Hovering fans them up. */}
      <span aria-hidden className="relative block h-[13.625rem] w-[12.5rem]">
        {PAGES.map((p) => (
          <span
            key={p.top}
            className="absolute rounded-[0.875rem] shadow-[0_-1px_0_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out motion-safe:group-hover:translate-y-[var(--fan)]"
            style={
              {
                // In rem (px / 16), so the stack grows with the app's scale.
                top: `${p.top / 16}rem`,
                left: `${p.inset / 16}rem`,
                width: `${(200 - 2 * p.inset) / 16}rem`,
                height: `${(200 - 2 * p.inset) / 16}rem`,
                background: color,
                opacity: p.opacity,
                '--fan': `${-p.fan / 16}rem`,
              } as React.CSSProperties
            }
          />
        ))}
        <span className="absolute left-0 top-[1.125rem] size-[12.5rem] overflow-hidden rounded-2xl bg-[#151518] shadow-[0_-1px_0_rgba(0,0,0,0.55)]">
          <img
            src={course.image}
            alt=""
            draggable={false}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03]"
          />
          <span className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <Play className="ml-0.5 size-4 fill-current" />
          </span>
        </span>
      </span>
      <span className="mt-3 truncate px-0.5 text-base font-medium leading-6 text-white">
        {course.title}
      </span>
      <span className="truncate px-0.5 text-sm leading-5 text-white/60">
        Music Atlas · {LEVELS} levels
      </span>
    </Link>
  );
}

const ARROW =
  'absolute top-[7.625rem] z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1c1c1f]/90 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] outline-none transition-opacity hover:bg-[#2a2a2e] focus-visible:ring-2 focus-visible:ring-white/50';

/**
 * The Genre page's Catalog, above its course tiles (moved from Home, owner
 * 2026-10-25): the genres Learn teaches, styled after Suno's Curated
 * Collections — a row of stacked covers that scrolls sideways, with arrows
 * at its ends and a fade where there's more.
 */
export const GenreCatalogRow = () => {
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const page = (dir: 1 | -1) =>
    strip.current?.scrollBy({
      left: dir * strip.current.clientWidth * 0.8,
      behavior: 'smooth',
    });

  const fade = [
    edges.start ? 'black 0' : 'transparent 0, black 48px',
    edges.end ? 'black 100%' : 'black calc(100% - 64px), transparent 100%',
  ].join(', ');

  return (
    <section
      aria-labelledby="genre-catalog-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="size-6 shrink-0 bg-white"
          style={{
            maskImage: 'url(/icons/genre-icon.svg)',
            WebkitMaskImage: 'url(/icons/genre-icon.svg)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
        <h2
          id="genre-catalog-heading"
          className="text-base leading-6 text-white"
        >
          Catalog
        </h2>
      </div>

      <div className="relative">
        <div
          ref={strip}
          onScroll={measure}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage: `linear-gradient(to right, ${fade})`,
            WebkitMaskImage: `linear-gradient(to right, ${fade})`,
          }}
        >
          {GENRE_COURSES.map((course) => (
            <GenreCard key={course.slug} course={course} />
          ))}
        </div>
        {!edges.start && (
          <button
            type="button"
            onClick={() => page(-1)}
            aria-label="Previous genres"
            className={cn(ARROW, 'left-2')}
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        {!edges.end && (
          <button
            type="button"
            onClick={() => page(1)}
            aria-label="More genres"
            className={cn(ARROW, 'right-2')}
          >
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>
    </section>
  );
};
