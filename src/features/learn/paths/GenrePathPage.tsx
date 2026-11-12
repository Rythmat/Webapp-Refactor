import { useLayoutEffect, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { PathPage } from '@/components/learn/path/PathPage';
import { discRatio } from '@/components/learn/path/pathGeometry';
import { LearnRoutes } from '@/constants/routes';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import { exploreHref } from '@/features/learn/catalog/exploreState';
import { useGenreReadiness } from '@/features/learn/genreReadiness';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { useIsPremium } from '@/hooks/useIsPremium';
import { followingGenre, genreAccent, genrePath } from './genrePath';

/** /learn/keyboard/genre/:genre: a genre's path. All genres teach at the keys. */
export function GenrePathPage() {
  const { genre = '' } = useParams<{ genre: string }>();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  useLayoutEffect(() => setInstrument('piano'), [setInstrument]);
  const ready = useGenreReadiness(true);
  const { isPremium } = useIsPremium();
  const at = GENRE_COURSES.findIndex((course) => course.slug === genre);
  const course = useMemo(() => {
    if (!ready || at < 0) return null;
    const profile = getGenreProfile(genre);
    const path = genrePath(genre, {
      title: profile?.displayName ?? GENRE_COURSES[at].title,
      description: profile?.tagline ?? '',
      accent: genreAccent(genre),
      ratio: discRatio(at),
      isPremium,
      built: (level, section) => ready.section(genre, level, section),
    });
    const next = followingGenre(genre, ready.course);
    const nextProfile = next ? getGenreProfile(next.slug) : null;
    return {
      ...path,
      upNext: next
        ? {
            title: next.title,
            blurb: nextProfile?.tagline ?? '',
            to: LearnRoutes.genreCourse({ genre: next.slug }),
          }
        : undefined,
    };
  }, [at, genre, isPremium, ready]);
  // Still reading which lessons are built.
  if (at >= 0 && !ready) return null;
  if (!course || course.rows.length === 0) {
    return <Navigate replace to={exploreHref('piano', 'genres')} />;
  }
  return <PathPage course={course} />;
}
