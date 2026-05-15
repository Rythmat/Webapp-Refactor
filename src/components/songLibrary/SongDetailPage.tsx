/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Music, Globe, ChevronLeft } from 'lucide-react';
import { getSong } from '@/curriculum/data/songs';
import { ChordChart } from './ChordChart';
import { useUISound } from '@/hooks/useUISound';
import { StudioRoutes } from '@/constants/routes';
import {
  exportSongToChordRegions,
  chordRegionsToMidiClip,
} from '@/curriculum/songLibrary/exportToStudio';
import {
  getSectionTimeRange,
  getSectionTimeRangeFromBeats,
} from '@/curriculum/songLibrary/timing';
import { useBeatGrid } from '@/curriculum/songLibrary/useBeatGrid';
import { useStore } from '@/daw/store';

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
  const { play } = useUISound();
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

  // Export to Studio handler
  const handleOpenInStudio = useCallback(() => {
    if (!song) return;
    play('select');
    const { regions, restMap, fermatas, rowSizes } = exportSongToChordRegions(
      song,
      { voicingMode: 'auto', bassLine: false },
    );
    const store = useStore.getState();
    store.setRootNote(song.keyRoot % 12);
    store.setMode(song.mode === 'major' ? 'ionian' : song.mode);
    store.setBpm(song.tempo);
    store.setChordRegions(regions);
    if (rowSizes) store.setMeasureRowSizes(rowSizes);
    if (restMap && Object.keys(restMap).length > 0)
      store.setMeasureRestMap(restMap);
    if (fermatas && fermatas.length > 0) store.setMeasureFermatas(fermatas);
    const clip = chordRegionsToMidiClip(regions);
    if (clip) {
      const trackId = store.addTrack(
        'midi',
        'piano-sampler',
        `${song.title} — Chords`,
      );
      store.addMidiClip(trackId, clip);
      store.setLoopRange(0, clip.durationTicks ?? 7680);
    }
    store.setCurrentView('arrange');
    navigate(StudioRoutes.root.definition);
  }, [song, navigate, play]);

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
      {/* ── Sub-header: Back + Action Pills ── */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-2 flex-shrink-0">
        <button
          onClick={() => navigate('/songs')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-white/50 hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>

        {[
          { label: 'Open in Lesson', icon: BookOpen, route: '/learn' },
          { label: 'Open in Studio', icon: Music, action: handleOpenInStudio },
          {
            label: 'Open in Globe',
            icon: Globe,
            route: `/atlas?event=song-${songId}`,
          },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => {
              play('click');
              if (btn.action) btn.action();
              else if (btn.route) navigate(btn.route);
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
            style={{
              border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
              background: 'transparent',
            }}
          >
            <btn.icon size={13} />
            {btn.label}
          </button>
        ))}
      </div>

      {/* ── Metadata + YouTube Player ── */}
      <div className="flex items-start justify-between px-4 sm:px-6 pb-3 flex-shrink-0 gap-4">
        {/* Left: BPM + Key */}
        <div className="flex-shrink-0">
          <p className="text-white/50 text-sm">{song.tempo} BPM</p>
          <p className="text-white/50 text-sm">{song.key}</p>
        </div>

        {/* Center: Title + Artist */}
        <div className="text-center flex-1 min-w-0">
          <h2
            className="text-white truncate"
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(1rem, 1.6vw, 1.3rem)',
            }}
          >
            &ldquo;{song.title}&rdquo;
          </h2>
          <p className="text-white/40 text-sm">{song.artist}</p>
        </div>

        {/* Right: YouTube Player — container always mounted to avoid React/YT DOM conflict */}
        <div className="flex-shrink-0 w-[200px] lg:w-[240px]">
          <div
            className="rounded-lg overflow-hidden bg-black/40"
            style={{ aspectRatio: '16/9', display: videoId ? 'block' : 'none' }}
          >
            {/* This div is managed by YT.Player — React must not touch its children.
                We use suppressHydrationWarning and keep it as the sole child. */}
            <div ref={ytContainerRef} className="w-full h-full" />
          </div>
          {!videoId && (
            <div
              className="rounded-lg flex items-center justify-center bg-white/5 text-white/20 text-xs"
              style={{ aspectRatio: '16/9' }}
            >
              No video
            </div>
          )}
        </div>
      </div>

      {/* ── Chord Chart (scrollable) ── */}
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 sm:px-6 pb-4">
        <ChordChart
          song={song}
          loopSection={loopSection}
          onToggleLoop={(si) => setLoopSection(loopSection === si ? null : si)}
        />
      </div>
    </div>
  );
};
