import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { SongRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';
import type { GenreRow } from '@/features/explore/exploreShelves';
import { genreTruchetCover } from '@/lib/cover';
import { CourseCover } from '../learn/cover/CourseCover';

/**
 * A genre's "Best of", as Suno's genre playlists: its Truchet tapestry
 * (owner, 2026-11-05: the genre's home scale, coloured by its place in a
 * row that runs round the spectrum, on a little stack of cards), "Best of {genre}" and how many songs. It opens
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
  const reduced = useReducedMotion() ?? false;
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
      className={cn('group block min-w-0 rounded-2xl', FOCUS_RING, className)}
    >
      <motion.span
        className="block"
        whileHover={reduced ? undefined : { y: -3 }}
        whileTap={reduced ? undefined : { y: 1, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      >
        <CourseCover cover={cover} className="aspect-square w-full" />
        <span className="mt-3 flex flex-col gap-1 px-0.5">
          <span className="truncate text-[0.875rem] font-medium leading-5 text-[#f7f4ef]">
            Best of {genre.label}
          </span>
          <span className="truncate text-[0.875rem] leading-4 text-[#a3a3a3]">
            {genre.count} songs
          </span>
        </span>
      </motion.span>
    </Link>
  );
}
