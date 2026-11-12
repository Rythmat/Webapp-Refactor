import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CARD_GAP, CARD_SUB, CARD_TITLE } from '@/components/kit/libraryLook';
import { cn } from '@/components/utilities';
import { SongRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';
import type { GenreRow } from '@/features/explore/exploreShelves';
import { genreTruchetCover } from '@/lib/cover';
import { CourseCover } from '../learn/cover/CourseCover';

/**
 * A genre's "Best of", as Suno's genre playlists: its Truchet tapestry
 * (owner, 2026-11-05: the genre's home scale, coloured by its place in a
 * row that runs round the spectrum; flat since 2026-11-10), "Best of {genre}" and how many songs. It opens
 * the library on that genre.
 */
export function GenreCard({
  genre,
  position,
  className,
}: {
  genre: GenreRow;
  /** Its place in the row: the row's colours run round the spectrum (and
   *  the genre's course sigil takes the same, GenreOrderContext). */
  position: number;
  className?: string;
}) {
  const cover = useMemo(
    () =>
      genreTruchetCover(`learn/best-of/${genre.slug}`, genre.slug, position),
    [genre.slug, position],
  );
  return (
    <Link
      to={SongRoutes.root(undefined, { genre: genre.slug })}
      data-explore-genre={genre.slug}
      aria-label={`Best of ${genre.label}, ${genre.count} songs`}
      className={cn('group block min-w-0 rounded-xl', FOCUS_RING, className)}
    >
      <CourseCover cover={cover} flat className="aspect-square w-full" />
      <span className={cn(CARD_GAP, 'flex flex-col px-0.5')}>
        <span className={CARD_TITLE}>Best of {genre.label}</span>
        <span className={CARD_SUB}>{genre.count} songs</span>
      </span>
    </Link>
  );
}
