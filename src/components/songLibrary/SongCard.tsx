/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { memo, useMemo, useState } from 'react';
import { BookOpen, Globe, Heart, Music, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Song } from '@/curriculum/types/songLibrary';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { useSongActions } from '@/features/songs/useSongActions';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';

interface SongCardProps {
  song: Song;
}

const ICON_SIZE = 20;

const SongCardImpl = ({ song }: SongCardProps) => {
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
        className="glass-panel relative aspect-square overflow-hidden rounded-2xl transition-colors duration-150"
        style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)',
        }}
      >
        {hasArtistImage ? (
          <img
            src={song.artistImageRef}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
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
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30 flex items-center justify-center">
          <div
            className="rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
            style={{ width: 56, height: 56 }}
          >
            <Play size={24} className="text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>

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
        <div className="mt-2 flex items-center justify-between">
          <span style={{ fontSize: 15, color: 'var(--color-text-dim)' }}>
            Lvl. {song.difficulty}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openInLesson}
              aria-label="Open in Lesson"
              title="Open in Lesson"
              className="text-white/40 hover:text-white transition-colors"
            >
              <BookOpen width={ICON_SIZE} height={ICON_SIZE} />
            </button>
            <button
              type="button"
              onClick={openInStudio}
              aria-label="Open in Studio"
              title="Open in Studio"
              className="text-white/40 hover:text-white transition-colors"
            >
              <Music width={ICON_SIZE} height={ICON_SIZE} />
            </button>
            <button
              type="button"
              onClick={openInGlobe}
              aria-label="Open in Globe"
              title="Open in Globe"
              className="text-white/40 hover:text-white transition-colors"
            >
              <Globe width={ICON_SIZE} height={ICON_SIZE} />
            </button>
            <button
              type="button"
              onClick={toggleSaved}
              aria-label={isSaved ? 'Remove from saved' : 'Save song'}
              aria-pressed={isSaved}
              title={isSaved ? 'Remove from saved' : 'Save song'}
              className="transition-colors hover:text-white"
              style={{ color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.4)' }}
            >
              <Heart
                width={ICON_SIZE}
                height={ICON_SIZE}
                fill={isSaved ? 'currentColor' : 'none'}
              />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const SongCard = memo(SongCardImpl);
SongCard.displayName = 'SongCard';
