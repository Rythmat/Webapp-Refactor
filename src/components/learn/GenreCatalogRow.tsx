import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { useArtAccent } from '@/hooks/useArtAccent';
import { GENRE_COURSES, type GenreCourse } from './genreCourses';
import { SigilCard } from './sigil/SigilCard';
import { genreSpec } from './sigil/sigilSpec';

/** Learn's genre levels per course (buildGenreLevels in LearnInlet). */
const LEVELS = 3;

/** The pages stacked behind a cover, back to front (px; Suno's, one deeper). */
const PAGES = [
  { top: 0, inset: 18, opacity: 0.35, fan: 3 },
  { top: 6, inset: 12, opacity: 0.55, fan: 2 },
  { top: 12, inset: 6, opacity: 0.8, fan: 1 },
] as const;

// The stack behind a cover: its art's accent (useArtAccent), or a
// neutral one until that's read.
const STACK_FALLBACK = 'rgb(70, 70, 82)';

/**
 * A genre, as Suno's Curated Collections show one: the cover over three
 * tinted pages of its own color (a stack), its title and what's in it; on
 * hover a play button. It opens the genre's course.
 */
function GenreCard({ course }: { course: GenreCourse }) {
  const color = useArtAccent(course.image) ?? STACK_FALLBACK;
  const spec = genreSpec(course.slug, course.image);
  return (
    <Link
      to={LearnRoutes.genreCourse({ genre: course.slug })}
      aria-label={`${course.title}: ${LEVELS} levels`}
      className="group flex w-[12.5rem] shrink-0 snap-start flex-col rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {/* The stack: three pages behind the cover, each 6 px higher and 12 px
          narrower than the one in front, dimmer the further back, with a
          dark edge so each reads as its own sheet. Hovering fans them up. */}
      <div aria-hidden className="relative h-[13.625rem] w-[12.5rem]">
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
        {/* The cover: the Learn tiles' card, the genre's signature
            interval drawn in it (owner, 2026-10-27); opaque, over the
            stack. */}
        {spec && (
          <SigilCard
            spec={spec}
            label={course.title}
            interactive={false}
            className="absolute left-0 top-[1.125rem] size-[12.5rem]"
          >
            <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              <Play className="ml-0.5 size-4 fill-current" />
            </span>
          </SigilCard>
        )}
      </div>
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
