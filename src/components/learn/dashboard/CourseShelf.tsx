import { SHELF_ITEM, Shelf } from '@/components/explore/Shelf';
import type { Shelf as ShelfSpec } from '@/features/learn/dashboard/recommend';
import { CourseCard } from '../explore/CourseCard';

/**
 * A row of suggested courses, its reason over its heading, in Explore's
 * shelf (Suno's layout, owner 2026-11-04), with "See all" for the whole
 * list in Explore.
 */
export function CourseShelf({
  shelf,
  onDismiss,
}: {
  shelf: ShelfSpec;
  onDismiss?: (courseId: string) => void;
}) {
  return (
    <Shelf
      id={shelf.id}
      title={shelf.title}
      reason={shelf.reason}
      seeAll={shelf.seeAll}
      count={shelf.courses.length}
    >
      {shelf.courses.map((course) => (
        <li key={course.id} className={SHELF_ITEM}>
          <CourseCard
            course={course}
            onDismiss={onDismiss ? () => onDismiss(course.id) : undefined}
          />
        </li>
      ))}
    </Shelf>
  );
}
