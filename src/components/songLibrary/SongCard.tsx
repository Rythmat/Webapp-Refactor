/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { HeartIcon } from '@/components/icons/HeartIcon';
import { memo, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Song } from '@/curriculum/types/songLibrary';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { useSongActions } from '@/features/songs/useSongActions';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';

interface SongCardProps {
  song: Song;
  /** When false, hides the hover darkening scrim over the image so only the
   *  play button overlays. Defaults to true. */
  hoverScrim?: boolean;
  /** When true, the artist image bleeds out of (over) its rounded container on
   *  hover instead of being clipped. Defaults to false. */
  bleedOnHover?: boolean;
  /** When true, renders just the square artwork (no title/artist/actions row) —
   *  used by the compact, pinned Songs-tab marquee. Defaults to false. */
  compact?: boolean;
  /** When false, no play button fades in over the image on hover (Home's
   *  Songs row, owner 2026-10-23). Defaults to true. */
  playOverlay?: boolean;
  /** When false, no Lvl. / Lesson, Studio, Globe and save row under the
   *  title and artist (Home's Songs row, owner 2026-10-24). Defaults to
   *  true. */
  actions?: boolean;
}

const ICON_SIZE = 20;

const SongCardImpl = ({
  song,
  hoverScrim = true,
  bleedOnHover = false,
  compact = false,
  playOverlay = true,
  actions = true,
}: SongCardProps) => {
  const { openInLesson, openInStudio, openInGlobe, toggleSaved, isSaved } =
    useSongActions(song);

  const [imageBroken, setImageBroken] = useState(false);
  const hasArtistImage = !!song.artistImageRef && !imageBroken;

  const avatarConfig = useMemo(
    () => defaultAvatarConfig(song.genreTags[0] ?? song.artist),
    [song.id, song.genreTags, song.artist],
  );

  const initials = useMemo(
    () =>
      song.artist
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [song.artist],
  );

  return (
    <Link
      to={`/songs/${song.id}`}
      aria-label={`${song.title} by ${song.artist}, ${song.key}, ${song.genreTags[0] ?? ''}, Difficulty ${song.difficulty}`}
      className="group flex flex-col gap-3 outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-2xl"
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-2xl${
          bleedOnHover ? ' group-hover:z-10 group-hover:overflow-visible' : ''
        }`}
      >
        {hasArtistImage ? (
          <img
            src={song.artistImageRef}
            alt=""
            loading="lazy"
            className={`absolute inset-0 size-full object-cover transition-transform duration-500 ${
              bleedOnHover
                ? 'rounded-2xl group-hover:scale-[1.03]'
                : 'group-hover:scale-105'
            }`}
            onError={() => setImageBroken(true)}
          />
        ) : (
          <>
            <HexAvatarSVG
              config={avatarConfig}
              circular={false}
              className="absolute left-0 top-0 size-[120%] transition-transform duration-500 group-hover:scale-105 opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-white/20 font-bold"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
              >
                {initials}
              </span>
            </div>
          </>
        )}
        {hoverScrim || playOverlay ? (
          <div
            className={`absolute inset-0 flex items-center justify-center${
              hoverScrim
                ? ' bg-black/0 transition-colors group-hover:bg-black/30'
                : ''
            }`}
          >
            {playOverlay ? (
              <div
                className="rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                style={{ width: '3.5rem', height: '3.5rem' }}
              >
                <Play
                  size={24}
                  className="text-black ml-0.5"
                  fill="currentColor"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {!compact && (
        <div className="px-1">
          <h3
            className="text-lg font-semibold truncate"
            style={{ color: 'var(--color-text)' }}
          >
            {song.title}
          </h3>
          <p
            className="truncate text-sm"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {song.artist}
          </p>
          {actions && (
            <div className="mt-2 flex items-center justify-between">
              <span
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--color-text-dim)',
                }}
              >
                Lvl. {song.difficulty}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openInLesson}
                  aria-label="Open in Lesson"
                  title="Open in Lesson"
                  className="opacity-70 transition-opacity hover:opacity-100"
                >
                  <img
                    src="/icons/learn-icon.svg"
                    alt=""
                    draggable={false}
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                  />
                </button>
                <button
                  type="button"
                  onClick={openInStudio}
                  aria-label="Open in Studio"
                  title="Open in Studio"
                  className="opacity-70 transition-opacity hover:opacity-100"
                >
                  <img
                    src="/icons/studio-icon.svg"
                    alt=""
                    draggable={false}
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                  />
                </button>
                <button
                  type="button"
                  onClick={openInGlobe}
                  aria-label="Open in Globe"
                  title="Open in Globe"
                  className="opacity-70 transition-opacity hover:opacity-100"
                >
                  <img
                    src="/icons/globe-icon.svg"
                    alt=""
                    draggable={false}
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                  />
                </button>
                <button
                  type="button"
                  onClick={toggleSaved}
                  aria-label={isSaved ? 'Remove from saved' : 'Save song'}
                  aria-pressed={isSaved}
                  title={isSaved ? 'Remove from saved' : 'Save song'}
                  className="transition-colors hover:text-white"
                  style={{
                    color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <HeartIcon size={ICON_SIZE} filled={isSaved} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Link>
  );
};

export const SongCard = memo(SongCardImpl);
SongCard.displayName = 'SongCard';
