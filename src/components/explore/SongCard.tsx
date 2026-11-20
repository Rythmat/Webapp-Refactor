import { MoreHorizontal, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { AppIcons } from '@/components/icons/appIcons';
import {
  CARD_GAP,
  CARD_META,
  CARD_SUB,
  CARD_TITLE,
} from '@/components/kit/libraryLook';
import { GENRE_LABELS } from '@/components/songLibrary/SongLibraryPage';
import { ComingSoonBadge, LightDot } from '@/components/songLibrary/SongLight';
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
import {
  isSongOpen,
  songLight,
  useSongLights,
} from '@/features/songs/songGate';
import { useSongActions } from '@/features/songs/useSongActions';
import { SongThumb } from './songArt';

// ── A song, as a card ──────────────────────────────────────────────────────
// Samply's (owner, 2026-11-10): the square art (the artist's photo), the
// title with a small grey tag (its level), the artist, and a quiet line of
// facts. The photo stands on the page itself: no panel behind it, no
// coloured rim on hover (owner, 2026-11-11). Over the art's corner on
// hover: save, and a menu with the old list's links.

/** A tile grows a touch under the pointer (owner, 2026-11-11): small
 *  enough to stay inside a shelf's 4px of padding. */
export const HOVER_GROW =
  'transition-transform duration-200 ease-out hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100';

const CORNER_BUTTON = cn(
  'grid size-7 place-items-center rounded-full bg-black/55 text-white/85 hover:bg-black/75 hover:text-white',
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
  const { toggleSaved, isSaved } = useSongActions(song);
  // The console shows every song's light and opens them all.
  const lights = useSongLights();

  // A red song, to a student: there, greyed out, marked Coming soon, and
  // not opened (songGate.ts).
  if (!lights && !isSongOpen(song)) {
    return (
      <div
        className={cn('relative min-w-0', className)}
        data-explore-song={song.id}
        data-coming-soon=""
      >
        <div
          role="img"
          aria-label={`${song.title} by ${song.artist}: coming soon`}
        >
          <span className="relative block aspect-square w-full overflow-hidden rounded-xl">
            <span className="block size-full opacity-50 grayscale">
              <SongThumb song={song} />
            </span>
            <ComingSoonBadge className="absolute left-2.5 top-2.5" />
          </span>
          <span className={cn(CARD_GAP, 'flex flex-col px-0.5')}>
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className={cn(CARD_TITLE, 'text-white/45')}>
                {song.title}
              </span>
              <span className={cn(CARD_META, 'shrink-0 text-white/30')}>
                Lvl {song.difficulty}
              </span>
            </span>
            <span className={cn(CARD_SUB, 'text-white/35')}>{song.artist}</span>
            <span className={cn(CARD_META, 'truncate text-white/30')}>
              Coming soon
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('group relative min-w-0', HOVER_GROW, className)}
      data-explore-song={song.id}
    >
      <Link
        to={SongRoutes.song({ songId: song.id })}
        aria-label={`${song.title} by ${song.artist}`}
        className={cn('block rounded-xl', FOCUS_RING)}
      >
        <span className="relative block aspect-square w-full overflow-hidden rounded-xl">
          <SongThumb song={song} />
          {lights && (
            <LightDot
              light={songLight(song)}
              className="absolute left-2.5 top-2.5 size-3.5"
            />
          )}
        </span>
        <span className={cn(CARD_GAP, 'flex flex-col px-0.5')}>
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className={CARD_TITLE}>{song.title}</span>
            <span className={cn(CARD_META, 'shrink-0')}>
              Lvl {song.difficulty}
            </span>
          </span>
          <span className={CARD_SUB}>{song.artist}</span>
          <span className={cn(CARD_META, 'truncate')}>{songFacts(song)}</span>
        </span>
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
        <SongMenu song={song} className={CORNER_BUTTON} />
      </div>
    </div>
  );
}

/**
 * A song's "More" menu: its lesson, the Studio, the Globe. A list row, with
 * no heart beside it, puts Save in it too, behind Samply's "…".
 */
export function SongMenu({
  song,
  className,
  row = false,
}: {
  song: Song;
  className?: string;
  /** A list row's menu: Save in it, and the dots lying down. */
  row?: boolean;
}) {
  const { openInLesson, openInStudio, openInGlobe, toggleSaved, isSaved } =
    useSongActions(song);
  const Dots = row ? MoreHorizontal : MoreVertical;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`More for ${song.title}`}
        className={className}
      >
        <Dots aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {row && (
          <DropdownMenuItem onSelect={() => toggleSaved()}>
            <HeartIcon filled={isSaved} className="size-4" />
            {isSaved ? 'Unsave' : 'Save'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => openInLesson()}>
          <AppIcons.learn aria-hidden className="size-4" />
          Open the lesson
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openInStudio()}>
          <AppIcons.studio aria-hidden className="size-4" />
          Open in Studio
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openInGlobe()}>
          <AppIcons.globe aria-hidden className="size-4" />
          See it on the Globe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
