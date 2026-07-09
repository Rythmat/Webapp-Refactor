/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useState, useEffect, useRef, type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  KeyCenterBadge,
  prettyGenre,
} from '@/components/common/CircleOfFifthsSvg';
import { getSong } from '@/curriculum/data/songs';
import { ChordChart } from './ChordChart';
import {
  getSectionTimeRange,
  getSectionTimeRangeFromBeats,
} from '@/curriculum/songLibrary/timing';
import { useBeatGrid } from '@/curriculum/songLibrary/useBeatGrid';
import { useSongActions } from '@/features/songs/useSongActions';
import { useViewedSongsStore } from '@/features/songs/useViewedSongsStore';
import type { Song } from '@/curriculum/types/songLibrary';

/** Extract YouTube video ID from a URL or URI */
function extractYouTubeId(uri: string): string | null {
  const match = uri.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

export const SongDetailPage: FC = () => {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const song = songId ? getSong(songId) : null;

  // YouTube playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopSection, setLoopSection] = useState<number | null>(null);
  const playerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const playerInitialized = useRef(false);

  // Find YouTube source
  const ytSource = song?.audioSources.find((s) => s.provider === 'youtube');
  const videoId = ytSource?.uri ? extractYouTubeId(ytSource.uri) : null;
  const startOffset = ytSource?.startOffsetSec ?? 0;

  // Lazy-load beat grid sidecar for this song (null until loaded or absent).
  const beatGrid = useBeatGrid(song?.id);

  // Record that the user looked at this song (opened its detail page) so it can
  // feed the Learn hub's "Continue" bar — saved or not.
  const recordSongView = useViewedSongsStore((s) => s.recordView);
  useEffect(() => {
    if (song) recordSongView(song.id);
  }, [song, recordSongView]);

  // Poll YouTube time only when section-loop is engaged. Cheap setInterval
  // is enough — there's no UI consumer of current time anymore.
  useEffect(() => {
    if (!isPlaying || !playerRef.current || loopSection == null || !song)
      return;

    const range = beatGrid
      ? getSectionTimeRangeFromBeats(song, beatGrid, loopSection)
      : getSectionTimeRange(song, loopSection);

    const id = setInterval(() => {
      try {
        const t = playerRef.current?.getCurrentTime?.();
        if (typeof t !== 'number') return;
        const adjusted = t - startOffset;
        if (adjusted >= range.end) {
          playerRef.current?.seekTo(range.start + startOffset, true);
        }
      } catch {
        /* player not ready */
      }
    }, 200);

    return () => clearInterval(id);
  }, [isPlaying, startOffset, loopSection, song, beatGrid]);

  // Load YouTube IFrame API and create player
  useEffect(() => {
    if (!videoId || !ytContainerRef.current) return;

    // Guard against double-init in React Strict Mode
    if (playerInitialized.current) return;
    playerInitialized.current = true;

    const createPlayer = () => {
      if (!ytContainerRef.current || playerRef.current) return;
      playerRef.current = new (window as any).YT.Player(
        ytContainerRef.current,
        {
          videoId,
          playerVars: {
            modestbranding: 1,
            rel: 0,
            fs: 0,
            iv_load_policy: 3,
            controls: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onStateChange: (e: any) => {
              setIsPlaying(e.data === 1);
            },
          },
        },
      );
    };

    // Load the API script if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = createPlayer;
    } else if ((window as any).YT?.Player) {
      createPlayer();
    } else {
      // API script loaded but not ready yet — wait for callback
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        prev?.();
        createPlayer();
      };
    }

    return () => {
      // Only destroy on real unmount, not Strict Mode double-fire
      // The playerInitialized ref prevents re-init
    };
  }, [videoId]);

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-white/40 text-lg">Song not found</p>
        <button
          onClick={() => navigate('/songs')}
          className="mt-4 rounded-full px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          Back to Song Library
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full min-w-0 overflow-hidden"
      style={{ background: 'var(--color-bg, #191919)' }}
    >
      {/* ── Subheading: Back · Pills/Badge/Meta · Title/Artist · YouTube ── */}
      <div
        className="grid items-start gap-4 px-4 sm:px-6 py-3 flex-shrink-0"
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        {/* Left track: back arrow + pills/badge/meta */}
        <div className="flex items-start gap-4 min-w-0">
          <button
            onClick={() => navigate('/songs')}
            aria-label="Back to Song Library"
            className="w-9 h-9 flex flex-shrink-0 items-center justify-center rounded-full hover:bg-white/5 transition-colors text-white/50 hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col gap-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <SongActionPills song={song} />
            </div>
            <div className="flex items-center gap-4">
              <KeyCenterBadge song={song} size={160} />
              <div
                className="text-sm leading-6 text-white/55"
                style={{ minWidth: 120 }}
              >
                <p>
                  Key: <span className="text-white/85">{song.key}</span>
                </p>
                <p>
                  BPM: <span className="text-white/85">{song.tempo}</span>
                </p>
                <p>
                  Genre:{' '}
                  <span className="text-white/85">
                    {prettyGenre(song.genreTags[0])}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Center track: Title + Artist, vertically centered in the row */}
        <div className="self-center text-center min-w-0 px-4">
          <h2
            className="text-white truncate"
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(1rem, 1.6vw, 1.4rem)',
            }}
          >
            &ldquo;{song.title}&rdquo;
          </h2>
          <p className="text-white/55 text-sm">{song.artist}</p>
        </div>

        {/* Right track: YouTube embed sized to row height */}
        <div className="flex justify-end items-start min-w-0">
          <div
            className="rounded-lg overflow-hidden bg-black/40"
            style={{
              aspectRatio: '16/9',
              height: 'clamp(160px, 22vh, 220px)',
              display: videoId ? 'block' : 'none',
            }}
          >
            <div ref={ytContainerRef} className="w-full h-full" />
          </div>
          {!videoId && (
            <div
              className="rounded-lg flex items-center justify-center bg-white/5 text-white/20 text-xs"
              style={{
                aspectRatio: '16/9',
                height: 'clamp(160px, 22vh, 220px)',
              }}
            >
              No video
            </div>
          )}
        </div>
      </div>

      {/* ── Chord Chart (scrollable) ── */}
      <div
        className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 sm:px-6 pb-4 pt-4"
        style={{ background: '#222222' }}
      >
        <ChordChart
          song={song}
          loopSection={loopSection}
          onToggleLoop={(si) => setLoopSection(loopSection === si ? null : si)}
        />
      </div>
    </div>
  );
};

const SongActionPills: FC<{ song: Song }> = ({ song }) => {
  const { openInLesson, openInStudio, openInGlobe } = useSongActions(song);
  const pills: { label: string; iconSrc: string; onClick: () => void }[] = [
    {
      label: 'Open in Lesson',
      iconSrc: '/icons/learn-icon.svg',
      onClick: openInLesson,
    },
    {
      label: 'Open in Studio',
      iconSrc: '/icons/studio-icon.svg',
      onClick: openInStudio,
    },
    {
      label: 'Open in Globe',
      iconSrc: '/icons/globe-icon.svg',
      onClick: openInGlobe,
    },
  ];

  return (
    <>
      {pills.map(({ label, iconSrc, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
          style={{
            border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
            background: 'transparent',
          }}
        >
          <img src={iconSrc} alt="" draggable={false} width={13} height={13} />
          {label}
        </button>
      ))}
    </>
  );
};
