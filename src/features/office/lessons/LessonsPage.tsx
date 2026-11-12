import { BookOpen } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useCountryFeatures } from '@/components/ClassroomLayout/globe/RegionPolygonThumb';
import { MicroLabel } from '@/components/kit';
import { OFFICE_LESSONS_SCOPE } from '@/constants/officeScopes';
import { EmptyState } from '@/daw/ui/EmptyState';
import { useSongsReady } from '@/features/classroom/plan/useSongsReady';
import { lessonInspectHref } from '../today/officeLinks';
import { LessonCard } from '../ui/LessonCard';
import { OFFICE_CARD, OFFICE_PAGE, OFFICE_PAGE_TITLE } from '../ui/styles';
import { AssignLessonMenu } from './AssignLessonMenu';
import { useBuiltInLessons } from './useBuiltInLessons';

const GRID =
  'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))]';

/**
 * The lessons ready to teach (owner, 2026-11-12). Only the built-in ones for
 * now: Michael Jackson · Producer. Each is assigned to a class from under
 * its card; it opens in the Inspector to be presented or edited.
 */
export const LessonsPage = () => {
  const { pathname } = useLocation();
  const { lessons, isLoading, isError } = useBuiltInLessons();
  const countryFeatures = useCountryFeatures();
  const songsReady = useSongsReady();

  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-col gap-1.5">
        <MicroLabel>
          {isLoading
            ? 'Loading'
            : `${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'}`}
        </MicroLabel>
        <h1 className={OFFICE_PAGE_TITLE}>Lessons</h1>
      </header>

      {isLoading ? (
        <ul className={GRID} aria-busy>
          <li aria-hidden className="flex flex-col gap-2.5">
            <div className="aspect-square animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.04]" />
          </li>
        </ul>
      ) : lessons.length === 0 ? (
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            icon={<BookOpen />}
            title={isError ? 'The lessons didn’t load' : 'No lessons yet'}
            description={isError ? 'Reload the page to try again.' : undefined}
          />
        </div>
      ) : (
        <ul className={GRID}>
          {lessons.map(({ day }) => (
            <li key={day.id} className="flex flex-col gap-2.5">
              <LessonCard
                day={day}
                eyebrow="Lesson"
                to={lessonInspectHref(pathname, OFFICE_LESSONS_SCOPE, day.id)}
                countryFeatures={countryFeatures}
                songsReady={songsReady}
              />
              <AssignLessonMenu day={day} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
