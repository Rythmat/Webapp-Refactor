import { ArrowRight, Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Song } from '@/curriculum/types/songLibrary';
import { useSongActions } from '@/features/songs/useSongActions';

interface FeaturedSongCardProps {
  song: Song;
}

const CROSSFADE_MS = 1000;

export const FeaturedSongCard = ({ song }: FeaturedSongCardProps) => {
  // Crossfade pattern mirrors HoneycombCarousel: preload incoming image,
  // render both layers, fade between them, then commit. Triggered by parent
  // (HomeInlet) advancing the `song` prop in sync with the banner.
  const [currentSong, setCurrentSong] = useState(song);
  const [incomingSong, setIncomingSong] = useState<Song | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (song.id === currentSong.id) return;
    if (!song.artistImageRef) {
      // No image to preload — swap immediately.
      setCurrentSong(song);
      return;
    }
    const preload = new Image();
    preload.src = song.artistImageRef;
    const advance = () => {
      setIncomingSong(song);
      timerRef.current = setTimeout(() => {
        setCurrentSong(song);
        setIncomingSong(null);
      }, CROSSFADE_MS);
    };
    if (preload.complete) {
      advance();
    } else {
      preload.onload = advance;
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [song, currentSong.id]);

  const visibleSong = incomingSong ?? currentSong;
  const { openInLesson, openInStudio, openInGlobe, toggleSaved, isSaved } =
    useSongActions(visibleSong);

  return (
    <Link
      to={`/songs/${visibleSong.id}`}
      aria-label={`Open ${visibleSong.title} by ${visibleSong.artist}`}
      className="group glass-panel relative block size-full overflow-hidden rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {currentSong.artistImageRef && (
        <img
          key={`current-${currentSong.id}`}
          src={currentSong.artistImageRef}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-opacity duration-1000"
          style={{ opacity: incomingSong === null ? 1 : 0 }}
        />
      )}
      {incomingSong?.artistImageRef && (
        <img
          key={`incoming-${incomingSong.id}`}
          src={incomingSong.artistImageRef}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-opacity duration-1000"
          style={{ opacity: 1 }}
        />
      )}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-4 py-3 transition-opacity duration-1000"
        style={{
          background:
            'linear-gradient(to top, rgba(0, 0, 0, 0.85) 60%, rgba(0, 0, 0, 0))',
        }}
      >
        <span
          className="truncate font-semibold text-white"
          style={{ fontSize: 'var(--dash-label-fz, 1rem)' }}
        >
          {visibleSong.artist}
        </span>
        <span
          className="truncate text-white/60"
          style={{ fontSize: 'var(--dash-label-fz, 0.875rem)' }}
        >
          {visibleSong.title}
        </span>
        <div className="mt-2 flex items-center gap-2 sm:gap-3 md:gap-4">
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
              style={{
                width: 'var(--dash-icon-sz, 1.15rem)',
                height: 'var(--dash-icon-sz, 1.15rem)',
              }}
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
              style={{
                width: 'var(--dash-icon-sz, 1.15rem)',
                height: 'var(--dash-icon-sz, 1.15rem)',
              }}
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
              style={{
                width: 'var(--dash-icon-sz, 1.15rem)',
                height: 'var(--dash-icon-sz, 1.15rem)',
              }}
            />
          </button>
          <button
            type="button"
            onClick={toggleSaved}
            aria-label={isSaved ? 'Remove from saved' : 'Save song'}
            aria-pressed={isSaved}
            title={isSaved ? 'Remove from saved' : 'Save song'}
            className="transition-colors hover:text-white"
            style={{ color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.6)' }}
          >
            <Heart
              fill={isSaved ? 'currentColor' : 'none'}
              style={{
                width: 'var(--dash-icon-sz, 1.15rem)',
                height: 'var(--dash-icon-sz, 1.15rem)',
              }}
            />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
          <span
            className="text-white/80"
            style={{ fontSize: 'var(--dash-label-fz, 0.875rem)' }}
          >
            Open Song
          </span>
          <ArrowRight
            className="text-white/80 transition-transform group-hover:translate-x-0.5"
            style={{
              width: 'var(--dash-icon-sz, 1rem)',
              height: 'var(--dash-icon-sz, 1rem)',
            }}
          />
        </div>
      </div>
    </Link>
  );
};
