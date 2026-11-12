import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MICRO_LABEL } from '@/components/kit/MicroLabel';
import { CARD_GAP, CARD_SUB, CARD_TITLE } from '@/components/kit/libraryLook';
import { LockedFeatureOverlay } from '@/components/ui/LockedFeatureOverlay';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import type { CatalogCourse } from '@/features/learn/catalog/learnCatalog';
import { CourseArt } from '../cover/CourseArt';

// ── A course, as a card ────────────────────────────────────────────────────
// Its Truchet cover (owner, 2026-11-05, in place of the sigil), flat as
// Samply's art, the title and one quiet line under it, and how far through
// it the student is. Explore's grids and
// the dashboard's rows both draw it; it fills the width it's given.

export function CourseCard({
  course,
  eyebrow,
  sub,
  onDismiss,
  className,
}: {
  course: CatalogCourse;
  /** Small caps over the title: its topic, in a search across them. */
  eyebrow?: ReactNode;
  /** The line under the title; the course's meta if left out. */
  sub?: ReactNode;
  /** "Not interested": shows a small × over the art. */
  onDismiss?: () => void;
  className?: string;
}) {
  const done = course.percent >= 100;

  const body = (
    <span className="block">
      <span className="relative block">
        <CourseArt course={course} flat className="aspect-square w-full" />
        {(done || course.percent > 0) && (
          <span
            className={cn(
              'absolute left-2.5 top-2.5 inline-flex h-6 items-center gap-1 rounded-full px-2 text-[0.75rem] font-medium',
              done ? 'bg-white text-[#101012]' : 'bg-black/50 text-white',
            )}
          >
            {done ? (
              <>
                <Check aria-hidden className="size-3.5" strokeWidth={3} />
                Done
              </>
            ) : (
              `${course.percent}%`
            )}
          </span>
        )}
      </span>
      {/* Samply's card type (owner, 2026-11-10): sized by the card, the
          title semibold, the line under it grey. */}
      <span className={cn(CARD_GAP, 'flex flex-col px-0.5')}>
        {eyebrow && <span className={cn(MICRO_LABEL, 'mb-1')}>{eyebrow}</span>}
        <span className={cn(CARD_TITLE, course.comingSoon && 'text-white/45')}>
          {course.title}
        </span>
        <span className={cn(CARD_SUB, course.comingSoon && 'text-white/35')}>
          {sub ?? course.meta}
        </span>
      </span>
      {course.percent > 0 && !done && (
        <span className="mx-0.5 mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-white/80"
            style={{ width: `${course.percent}%` }}
          />
        </span>
      )}
    </span>
  );

  return (
    <div
      className={cn('group relative min-w-0', className)}
      data-learn-tile={course.slug}
    >
      {course.comingSoon ? (
        <div role="img" aria-label={`${course.title}: coming soon`}>
          <div className="opacity-60">{body}</div>
        </div>
      ) : (
        <LockedFeatureOverlay locked={course.locked} label={course.title}>
          <Link
            to={course.route}
            className={cn('block rounded-xl', FOCUS_RING)}
            aria-label={
              course.percent > 0 && !done
                ? `${course.title}, ${course.percent}% done`
                : done
                  ? `${course.title}, done`
                  : course.title
            }
          >
            {body}
          </Link>
        </LockedFeatureOverlay>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Not interested in ${course.title}`}
          title="Not interested"
          className={cn(
            'absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/50 text-white/80 opacity-0 hover:bg-black/70 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}
