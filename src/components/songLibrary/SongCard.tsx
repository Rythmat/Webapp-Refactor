/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { memo, useCallback, useMemo, type MouseEvent } from 'react';
import { BookOpen, Heart, Music, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Song } from '@/curriculum/types/songLibrary';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { useSavedSongsStore } from '@/features/songs/useSavedSongsStore';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';

interface SongCardProps {
  song: Song;
}

const ICON_SIZE = 12;

const SongCardImpl = ({ song }: SongCardProps) => {
  const isSaved = useSavedSongsStore((s) => Boolean(s.savedIds[song.id]));
  const toggleSaved = useSavedSongsStore((s) => s.toggleSaved);

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

  const handleHeartClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSaved(song.id);
    },
    [toggleSaved, song.id],
  );

  return (
    <Link
      to={`/songs/${song.id}`}
      aria-label={`${song.title} by ${song.artist}, ${song.key}, ${song.genreTags[0] ?? ''}, Difficulty ${song.difficulty}`}
      className="group block overflow-hidden transition-all duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
      style={{
        background: 'rgba(28,28,30,0.85)',
        borderRadius: 12,
      }}
    >
      <div
        className="relative"
        style={{ aspectRatio: '1 / 1', background: 'rgba(30,30,30,0.6)' }}
      >
        {song.artistImageRef ? (
          <img
            src={song.artistImageRef}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <HexAvatarSVG
            config={avatarConfig}
            circular={false}
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <div
            className="rounded-full bg-white/90 flex items-center justify-center"
            style={{ width: 44, height: 44 }}
          >
            <Play size={18} className="text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
        {!song.artistImageRef && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-white/20 font-bold"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              {initials}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: 12 }}>
        <h3
          style={{
            fontSize: 14,
            lineHeight: 1.3,
            fontWeight: 600,
            color: '#ffffff',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
        >
          {song.title}
        </h3>
        <p
          className="truncate"
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            marginTop: 2,
          }}
        >
          {song.artist}
        </p>
        <div
          className="flex items-center justify-between"
          style={{ marginTop: 8 }}
        >
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
            Lvl. {song.difficulty}
          </span>
          <div className="flex items-center" style={{ gap: 6 }}>
            <BookOpen
              width={ICON_SIZE}
              height={ICON_SIZE}
              style={{ color: 'rgba(255,255,255,0.4)' }}
            />
            <Music
              width={ICON_SIZE}
              height={ICON_SIZE}
              style={{ color: 'rgba(255,255,255,0.4)' }}
            />
            <button
              type="button"
              onClick={handleHeartClick}
              aria-label={isSaved ? 'Remove from saved' : 'Save song'}
              aria-pressed={isSaved}
              className="transition-colors"
            >
              <Heart
                width={ICON_SIZE}
                height={ICON_SIZE}
                fill={isSaved ? 'currentColor' : 'none'}
                style={{
                  color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.4)',
                }}
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
