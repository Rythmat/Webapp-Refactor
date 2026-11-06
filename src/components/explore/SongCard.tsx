import { motion, useReducedMotion } from 'framer-motion';
import {
  Globe,
  GraduationCap,
  MoreVertical,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SpectrumRim } from '@/components/art/light/SpectrumLight';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { GENRE_LABELS } from '@/components/songLibrary/SongLibraryPage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { SongRoutes } from '@/constants/routes';
import type { Song } from '@/curriculum/types/songLibrary';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { useSongActions } from '@/features/songs/useSongActions';
import { SongThumb, songKeyColour } from './songArt';

// ── A song, as a card ──────────────────────────────────────────────────────
// Suno's: the square art (the artist's photo), the title with a small mono
// tag (its level, where Suno puts the model), the artist, and a quiet line
// of facts. Its key centre's colour rims it on hover. Over the art's corner
// on hover: save, and a menu with the old list's links.

const CORNER_BUTTON = cn(
  'grid size-7 place-items-center rounded-full bg-black/55 text-white/85 backdrop-blur-md hover:bg-black/75 hover:text-white',
  TRANSITION,
  FOCUS_RING,
);

/** "Rock · C major · 1969": what a song's card says under its artist. */
export function songFacts(song: Song): string {
  const genre = song.genreTags[0];
  return [genre ? (GENRE_LABELS[genre] ?? genre) : '', song.key, song.year]
    .filter(Boolean)
    .join(' · ');
}

export function SongCard({
  song,
  className,
}: {
  song: Song;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const { openInLesson, openInStudio, openInGlobe, toggleSaved, isSaved } =
    useSongActions(song);

  return (
    <div
      className={cn('art-host group relative min-w-0', className)}
      data-explore-song={song.id}
    >
      <Link
        to={SongRoutes.song({ songId: song.id })}
        aria-label={`${song.title} by ${song.artist}`}
        className={cn('block rounded-2xl', FOCUS_RING)}
      >
        <motion.span
          className="block"
          whileHover={reduced ? undefined : { y: -3 }}
          whileTap={reduced ? undefined : { y: 1, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        >
          <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-daw-surface-1">
            <SongThumb song={song} />
            <SpectrumRim state="hover" colors={[songKeyColour(song)]} />
          </span>
          <span className="mt-3 flex flex-col gap-1 px-0.5">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate text-[0.875rem] font-medium leading-5 text-[#f7f4ef]">
                {song.title}
              </span>
              <span className="shrink-0 font-mono text-[0.6875rem] uppercase tracking-wide text-[#a3a3a3]">
                Lvl {song.difficulty}
              </span>
            </span>
            <span className="truncate text-[0.875rem] leading-4 text-[#a3a3a3]">
              {song.artist}
            </span>
            <span className="truncate text-[0.75rem] leading-4 text-[#a3a3a3]">
              {songFacts(song)}
            </span>
          </span>
        </motion.span>
      </Link>
      <div
        className={cn(
          'absolute right-2 top-2 flex gap-1.5 opacity-0 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100',
          TRANSITION,
          isSaved && 'opacity-100',
        )}
      >
        <button
          type="button"
          onClick={toggleSaved}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Unsave ${song.title}` : `Save ${song.title}`}
          className={CORNER_BUTTON}
        >
          <HeartIcon filled={isSaved} className="size-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More for ${song.title}`}
            className={CORNER_BUTTON}
          >
            <MoreVertical aria-hidden className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openInLesson()}>
              <GraduationCap aria-hidden className="size-4" />
              Open the lesson
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openInStudio()}>
              <SlidersHorizontal aria-hidden className="size-4" />
              Open in Studio
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openInGlobe()}>
              <Globe aria-hidden className="size-4" />
              See it on the Globe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
