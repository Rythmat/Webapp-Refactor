import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcons } from '@/components/icons/appIcons';
import { CARD_META, ICON_BUTTON } from '@/components/kit/libraryLook';
import { RecordingPill } from '@/components/media/RecordingPill';
import { GENRE_LABELS } from '@/components/songLibrary/SongLibraryPage';
import { cn } from '@/components/utilities';
import { SongRoutes } from '@/constants/routes';
import type { Song } from '@/curriculum/types/songLibrary';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import type { ArtistRow } from '@/features/explore/exploreShelves';
import { useSongActions } from '@/features/songs/useSongActions';
import { extractYouTubeId } from '@/hooks/media/useYouTubeIframePlayer';
import { SongMenu } from './SongCard';
import { SongThumb } from './songArt';

// ── An artist's page (owner, 2026-11-11) ──────────────────────────────────
// What an artist's card opens, laid out as a Samply playlist (measured on
// samply.app/p/…, in its px over our 17.6px root): a 700px column in the
// middle; the artist's photo (200px) beside a small caption, their name
// large and the years their songs span, the Globe at the photo's foot; a
// hairline; then their songs, numbered, every other row a shade lighter.
// Each song with a video plays from its row (owner, 2026-11-11), with the
// Present page's recording pill, its ▾ gone: ▶ plays and opens the video
// under its row, at the list's width; ❚❚ pauses and shuts it. One at a
// time. No Play at the top.
//
// The Artist tab is these, every artist A–Z in one long list (owner,
// 2026-11-11), each name opening that artist's own page.

/** "Pop · Rock": the genres an artist's songs are in, the commonest first. */
export function artistGenres(artist: ArtistRow): string {
  const counts = new Map<string, number>();
  for (const song of artist.songs) {
    const genre = song.genreTags[0];
    if (genre) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([genre]) => GENRE_LABELS[genre] ?? genre)
    .join(' · ');
}

/** A song's YouTube video, when it has one. */
function videoOf(song: Song): string | null {
  const source = song.audioSources?.find((s) => s.provider === 'youtube');
  return source?.uri ? extractYouTubeId(source.uri) : null;
}

const hasPhoto = (song: Song) =>
  song.artistImageSource !== 'none' && Boolean(song.artistImageRef);

/** The song whose art stands for the artist: their best-known with a photo. */
export const artistCover = (artist: ArtistRow): Song =>
  artist.songs.find(hasPhoto) ?? artist.songs[0];

/** "1971" or "1971 – 1994": the years an artist's songs come from. */
function yearSpan(songs: readonly Song[]): string | null {
  const years = songs
    .map((song) => song.year)
    .filter((year): year is number => typeof year === 'number' && year > 0);
  if (!years.length) return null;
  const first = Math.min(...years);
  const last = Math.max(...years);
  return first === last ? String(first) : `${first} – ${last}`;
}

function ArtistSongRow({
  song,
  number,
  videoId,
}: {
  song: Song;
  number: number;
  videoId: string | undefined;
}) {
  // Where the row's video opens: under the row, at the list's width.
  const [videoSlot, setVideoSlot] = useState<HTMLDivElement | null>(null);
  return (
    <li
      data-explore-song={song.id}
      className="rounded-lg even:bg-white/[0.024]"
    >
      <div
        className={cn(
          'flex h-[2.955rem] items-center rounded-lg hover:bg-white/[0.05]',
          TRANSITION,
        )}
      >
        <Link
          to={SongRoutes.song({ songId: song.id })}
          aria-label={`${song.title} by ${song.artist}`}
          className={cn(
            'flex h-full min-w-0 flex-1 items-center rounded-lg',
            FOCUS_RING,
          )}
        >
          <span className="w-[2.33rem] shrink-0 pl-[1.023rem] text-[0.795rem] tabular-nums leading-[1.136rem] text-white/30">
            {number}
          </span>
          <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
            <span className="truncate text-[0.795rem] leading-[1.136rem] text-white">
              {song.title}
            </span>
            <span className={cn(CARD_META, 'shrink-0')}>
              Lvl {song.difficulty}
            </span>
          </span>
          <span className="shrink-0 px-[0.114rem] text-[0.682rem] leading-[0.909rem] text-white/50">
            {[song.key, song.year].filter(Boolean).join(' · ')}
          </span>
        </Link>
        {/* The ▶s line up, whether a row has one or not. */}
        <span className="flex w-[2.045rem] shrink-0 justify-end">
          {videoId && (
            <RecordingPill
              videoId={videoId}
              videoWithPlay
              solo
              openIn={videoSlot}
            />
          )}
        </span>
        <SongMenu
          song={song}
          row
          className={cn(
            'mx-[0.455rem] grid size-7 shrink-0 place-items-center rounded-full text-white/50 hover:bg-white/[0.08] hover:text-white',
            TRANSITION,
            FOCUS_RING,
          )}
        />
      </div>
      {videoId && (
        <div
          ref={setVideoSlot}
          data-song-video={song.id}
          className="px-2 [&>*]:mb-2"
        />
      )}
    </li>
  );
}

export function ArtistPage({
  artist,
  to,
  className,
}: {
  artist: ArtistRow;
  /** In the long list: their own page, which their name opens. */
  to?: string;
  className?: string;
}) {
  const nameId = useId();
  // Their best-known song: the Globe finds them by it.
  const top = artist.songs[0];
  const cover = artistCover(artist);
  const { openInGlobe } = useSongActions(top);
  const count = artist.songs.length;
  const genres = artistGenres(artist);
  const years = yearSpan(artist.songs);
  // Each song's video, where it has one.
  const videos = useMemo(
    () =>
      new Map(
        artist.songs.flatMap((song) => {
          const id = videoOf(song);
          return id ? [[song.id, id] as const] : [];
        }),
      ),
    [artist.songs],
  );

  return (
    <section
      data-artist-page={artist.key}
      aria-labelledby={nameId}
      className={cn(
        'mx-auto flex w-full max-w-[39.773rem] flex-col',
        className,
      )}
    >
      <header className="flex flex-col gap-6 border-b border-white/[0.08] pb-[1.818rem] sm:flex-row sm:gap-[2.273rem]">
        <span className="relative block size-[11.364rem] shrink-0 overflow-hidden rounded-xl">
          <SongThumb song={cover} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="pb-[0.682rem] text-[0.568rem] font-medium uppercase leading-[0.682rem] tracking-[0.0114rem] text-white/50">
            {count} {count === 1 ? 'song' : 'songs'}
            {genres && ` · ${genres}`}
          </p>
          <h2
            id={nameId}
            className="text-[1.932rem] font-bold leading-[2.273rem] text-white"
          >
            {to ? (
              <Link
                to={to}
                className={cn('rounded-lg hover:text-white/85', FOCUS_RING)}
              >
                {artist.name}
              </Link>
            ) : (
              artist.name
            )}
          </h2>
          {years && (
            <p className="text-[0.795rem] leading-[1.136rem] text-white/50">
              {years}
            </p>
          )}
          <div className="mt-6 flex items-center justify-end gap-3 sm:mt-auto">
            <button
              type="button"
              onClick={openInGlobe}
              aria-label={`See ${artist.name} on the Globe`}
              title="See them on the Globe"
              className={ICON_BUTTON}
            >
              <AppIcons.globe aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      </header>
      <ol
        aria-label={`${artist.name}’s songs`}
        className="flex flex-col pt-[0.682rem]"
      >
        {artist.songs.map((song, index) => (
          <ArtistSongRow
            key={song.id}
            song={song}
            number={index + 1}
            videoId={videos.get(song.id)}
          />
        ))}
      </ol>
    </section>
  );
}
