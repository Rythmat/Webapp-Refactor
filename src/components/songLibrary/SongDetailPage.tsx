/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useState, useEffect, useRef, useMemo, type FC } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Gauge, Clock, Signal, Star } from 'lucide-react';
import {
  getKeyColor,
  prettyGenre,
} from '@/components/common/CircleOfFifthsSvg';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { GenreBadge } from '@/components/atlas/components/UI/GenreBadge';
import { getSong } from '@/curriculum/data/songs';
import { LearnRoutes } from '@/constants/routes';
import { ChordChart } from './ChordChart';
import { TransposeKeyButton } from './TransposeKeyButton';
import { useChartNotation } from './chartNotationPreference';
import { SegmentedControl } from '@/features/classroom/presentation/SegmentedControl';
import { SaveVersionDialog } from '@/features/setlists/SaveVersionDialog';
import { useSetListFavorite } from '@/features/setlists/useSetLists';
import { transposeSong } from '@/curriculum/songLibrary/transpose';
import {
  getSectionTimeRange,
  getSectionTimeRangeFromBeats,
} from '@/curriculum/songLibrary/timing';
import { useBeatGrid } from '@/curriculum/songLibrary/useBeatGrid';
import { useSongActions } from '@/features/songs/useSongActions';
import { useViewedSongsStore } from '@/features/songs/useViewedSongsStore';
import type { Song } from '@/curriculum/types/songLibrary';

/** The song list: Learn's Songs tab. */
const SONG_LIST_ROUTE = LearnRoutes.root(undefined, { tab: 'Songs' });

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

  // Transposition is a view of the published chart, not an edit of it: the
  // chart, the key line and the Studio hand-off all read `displaySong`, while
  // the recording, the beat grid and the song's id stay with the original.
  const [semitones, setSemitones] = useState(0);
  const [savingVersion, setSavingVersion] = useState(false);
  useEffect(() => setSemitones(0), [songId]);
  const displaySong = useMemo(
    () => (song ? transposeSong(song, semitones) : null),
    [song, semitones],
  );

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

  const [kr, kg, kb] = getKeyColor(displaySong ?? song);
  const [ts0, ts1] = song.timeSignature;
  const genreLabel = prettyGenre(song.genreTags[0]);

  return (
    <div
      className="flex flex-col h-full min-w-0 overflow-hidden"
      style={{ background: '#101012' }}
    >
      {/* ── Header: artwork-anchored hero ── */}
      <header className="relative overflow-hidden flex-shrink-0 px-6 md:px-10 py-4">
        {/* Subtle key-color tint behind the header content. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, rgba(${kr},${kg},${kb},0.12) 0%, rgba(${kr},${kg},${kb},0) 70%)`,
          }}
        />

        <div className="relative z-10 flex items-stretch gap-4 md:gap-5 h-36 md:h-40">
          {/* Back to the song list — the Songs tab of Learn, which is where
              the list actually lives ('/songs' itself only holds this page). */}
          <div className="flex flex-shrink-0 flex-col items-center self-start">
            <Link
              to={SONG_LIST_ROUTE}
              className="text-xs font-medium text-white/50 transition-colors hover:text-white hover:underline"
            >
              Songs
            </Link>
            <button
              onClick={() => navigate(SONG_LIST_ROUTE)}
              aria-label="Back to Song Library"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-white/50 hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          {/* Artwork anchor — fills the header height */}
          <SongArtwork song={song} />

          {/* Identity + metadata + actions */}
          <div className="flex h-full flex-1 flex-col justify-center gap-2 min-w-0">
            <h2
              className="text-white truncate"
              style={{
                fontFamily:
                  "'Glacial Indifference', 'Fraunces', system-ui, sans-serif",
                fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
                fontWeight: 600,
                lineHeight: 1.1,
              }}
            >
              &ldquo;{song.title}&rdquo;
            </h2>
            <p className="text-white/55 text-sm truncate">
              {song.artist}
              {song.year ? (
                <span className="text-white/35"> · {song.year}</span>
              ) : null}
              {song.composer ? (
                <span className="text-white/35">
                  {' '}
                  · Written by {song.composer}
                </span>
              ) : null}
            </p>

            {/* Metadata stat row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <TransposeKeyButton
                song={song}
                displaySong={displaySong ?? song}
                semitones={semitones}
                onChange={setSemitones}
                color={[kr, kg, kb]}
              />
              <StatDivider />
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <Gauge size={15} />
                <span className="text-white/90">
                  {song.tempo}
                  <span className="text-white/50"> BPM</span>
                </span>
              </span>
              <StatDivider />
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <Clock size={15} />
                <span className="text-white/90">
                  {ts0}/{ts1}
                </span>
              </span>
              <StatDivider />
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <Signal size={15} />
                <span className="text-white/90">Lvl. {song.difficulty}</span>
              </span>
              {song.genreTags[0] && (
                <span className="ml-1">
                  <GenreBadge genre={genreLabel} />
                </span>
              )}
            </div>

            {/* Action icons — placed below the metadata row */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <SongActionPills song={displaySong ?? song} />
                <FavoriteStar songId={song.id} />
                <ChartNotationSwitch />
                <button
                  type="button"
                  onClick={() => setSavingVersion(true)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    semitones === 0
                      ? 'border-white/15 text-white/70 hover:border-white/30'
                      : 'border-[#7ecfcf] bg-[#7ecfcf]/10 text-[#7ecfcf]'
                  }`}
                  title="Save this version to a set list"
                >
                  Save version
                </button>
              </div>
            </div>
          </div>

          {/* Video player — fills the header height. The ref div stays mounted
              (display toggled, never unmounted) so the YouTube player survives. */}
          <div
            className="aspect-video h-full flex-shrink-0 overflow-hidden rounded-lg bg-black/40"
            style={{ display: videoId ? 'block' : 'none' }}
          >
            <div ref={ytContainerRef} className="w-full h-full" />
          </div>
          {!videoId && (
            <div className="aspect-video h-full flex flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/20 text-xs">
              No video
            </div>
          )}
        </div>
      </header>

      <SaveVersionDialog
        open={savingVersion}
        onOpenChange={setSavingVersion}
        song={song}
        semitones={semitones}
      />

      {/* ── Chord Chart (scrollable) ── */}
      <div
        className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-6 md:px-10 pb-4 pt-4"
        style={{ background: '#101012' }}
      >
        <ChordChart
          // Remount on a key change: the chart holds the chord whose diagram
          // is open, and that chord belongs to the copy it came from.
          key={semitones}
          song={displaySong ?? song}
          loopSection={loopSection}
          onToggleLoop={(si) => setLoopSection(loopSection === si ? null : si)}
        />
      </div>
    </div>
  );
};

/** Letter chord symbols, or the hybrid numbers, for the chart below. */
const ChartNotationSwitch: FC = () => {
  const [notation, setNotation] = useChartNotation();
  return (
    <SegmentedControl
      label="Chord symbols"
      value={notation}
      onChange={setNotation}
      options={[
        { value: 'letters', label: 'B♭maj7' },
        { value: 'numbers', label: '4 maj7' },
      ]}
    />
  );
};

/** The star, as in a music app: adds the song to My Favorites as well as
 *  whatever set lists it already sits in. */
const FavoriteStar: FC<{ songId: string }> = ({ songId }) => {
  const { isFavorite, toggleFavorite, canFavorite } =
    useSetListFavorite(songId);
  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={!canFavorite}
      aria-pressed={isFavorite}
      aria-label={
        isFavorite ? 'Remove from My Favorites' : 'Add to My Favorites'
      }
      title={isFavorite ? 'In My Favorites' : 'Add to My Favorites'}
      className="rounded-full p-1.5 transition-colors disabled:opacity-40"
    >
      <Star
        size={18}
        className={
          isFavorite ? 'text-[#7ecfcf]' : 'text-white/40 hover:text-white'
        }
        fill={isFavorite ? 'currentColor' : 'none'}
      />
    </button>
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
          aria-label={label}
          title={label}
          className="flex h-10 w-10 items-center justify-center rounded-lg opacity-70 transition hover:bg-white/5 hover:opacity-100"
        >
          <img src={iconSrc} alt="" draggable={false} width={28} height={28} />
        </button>
      ))}
    </>
  );
};

/** Small middot separator between metadata stats. */
const StatDivider: FC = () => (
  <span aria-hidden className="text-white/20">
    ·
  </span>
);

/**
 * Square artwork anchor for the header — the artist image with a generated
 * hex-avatar + initials fallback (mirrors SongCard's treatment).
 */
const SongArtwork: FC<{ song: Song }> = ({ song }) => {
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
    <div className="relative aspect-square h-full flex-shrink-0 overflow-hidden rounded-2xl">
      {hasArtistImage ? (
        <img
          src={song.artistImageRef}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          onError={() => setImageBroken(true)}
        />
      ) : (
        <>
          <HexAvatarSVG
            config={avatarConfig}
            circular={false}
            className="absolute left-0 top-0 size-[120%] opacity-60"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="font-bold text-white/20"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
            >
              {initials}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
