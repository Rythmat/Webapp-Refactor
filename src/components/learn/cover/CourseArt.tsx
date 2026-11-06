import { useContext, useMemo } from 'react';
import type { CatalogCourse } from '@/features/learn/catalog/learnCatalog';
import { genreCourseTruchetCover, genreSpectrumIndex } from '@/lib/cover';
import { GenreOrderContext } from '../sigil/genreOrder';
import { CourseCover } from './CourseCover';

/**
 * A course's picture: its Truchet tapestry (owner, 2026-11-05: every
 * card's sigil a Truchet pattern). A genre's takes its Best Of tile's
 * colours from the page's row, where the page has one.
 */
export function CourseArt({
  course,
  stack = true,
  className,
}: {
  course: CatalogCourse;
  /** A cover's stack of cards behind it (off for small thumbnails). */
  stack?: boolean;
  className?: string;
}) {
  const genreOrder = useContext(GenreOrderContext);
  const cover = useMemo(
    () =>
      course.kind === 'genre' && genreOrder
        ? genreCourseTruchetCover(
            course.cover.seed,
            course.slug,
            genreSpectrumIndex(course.slug, genreOrder),
          )
        : course.cover,
    [course, genreOrder],
  );
  return <CourseCover cover={cover} stack={stack} className={className} />;
}
