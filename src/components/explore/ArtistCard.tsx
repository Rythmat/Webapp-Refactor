import { Link } from 'react-router-dom';
import {
  CARD_GAP,
  CARD_META,
  CARD_SUB,
  CARD_TITLE,
} from '@/components/kit/libraryLook';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import type { ArtistRow } from '@/features/explore/exploreShelves';
import { artistCover, artistGenres } from './ArtistPage';
import { HOVER_GROW } from './SongCard';
import { SongThumb } from './songArt';

// ── An artist, as a card or a compact row (owner, 2026-11-11) ─────────────
// The Artist tab's Grid and Compact layouts: a song card's look, one to an
// artist (their photo, name, how many songs, their genres), or the same on
// one slim line. Either opens the artist's own page.

/** The Compact list: 1.5% in on each side, just what a row's 3% growth
 *  needs at any width, so a hovered row never sets the page scrolling
 *  sideways. */
export const COMPACT_LIST = 'flex flex-col px-[1.5%]';

const songCount = (artist: ArtistRow) =>
  `${artist.songs.length} ${artist.songs.length === 1 ? 'song' : 'songs'}`;

export function ArtistCard({ artist, to }: { artist: ArtistRow; to: string }) {
  return (
    <Link
      to={to}
      data-explore-artist={artist.key}
      aria-label={`${artist.name}, ${songCount(artist)}`}
      className={cn('group block min-w-0 rounded-xl', HOVER_GROW, FOCUS_RING)}
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-xl">
        <SongThumb song={artistCover(artist)} />
      </span>
      <span className={cn(CARD_GAP, 'flex flex-col px-0.5')}>
        <span className={CARD_TITLE}>{artist.name}</span>
        <span className={CARD_SUB}>{songCount(artist)}</span>
        <span className={cn(CARD_META, 'truncate')}>
          {artistGenres(artist)}
        </span>
      </span>
    </Link>
  );
}

/** The Compact layout's line, across the page from its left edge, big
 *  enough to read at a glance (owner, 2026-11-11): 84px, a 68px photo, the
 *  name at the body's size, the genres and the count in columns. It grows
 *  3% under the pointer, as the cards do (its list leaves room, COMPACT_LIST). */
export function ArtistListRow({
  artist,
  to,
}: {
  artist: ArtistRow;
  to: string;
}) {
  return (
    <li
      className={cn(
        'relative rounded-xl even:bg-white/[0.024] hover:z-10',
        HOVER_GROW,
      )}
    >
      <Link
        to={to}
        data-explore-artist={artist.key}
        aria-label={`${artist.name}, ${songCount(artist)}`}
        className={cn(
          'flex h-[4.773rem] items-center gap-4 rounded-xl px-2 hover:bg-white/[0.05]',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <span className="relative block size-[3.864rem] shrink-0 overflow-hidden rounded-lg">
          <SongThumb song={artistCover(artist)} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[1rem] font-medium leading-6 text-white">
          {artist.name}
        </span>
        <span className="hidden w-56 shrink-0 truncate text-[0.875rem] leading-5 text-white/50 sm:block">
          {artistGenres(artist)}
        </span>
        <span className="w-[5.5rem] shrink-0 pr-3 text-right text-[0.875rem] tabular-nums leading-5 text-white/50">
          {songCount(artist)}
        </span>
      </Link>
    </li>
  );
}
