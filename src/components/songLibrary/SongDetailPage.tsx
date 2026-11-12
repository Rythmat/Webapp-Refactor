import { useEffect, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SongThumb } from '@/components/explore/songArt';
import { getSong } from '@/curriculum/data/songs';
import type { Song } from '@/curriculum/types/songLibrary';
import { isSongOpen, useSongLights } from '@/features/songs/songGate';
import { useViewedSongsStore } from '@/features/songs/useViewedSongsStore';
import { SongDetailView } from './SongDetailView';
import { ComingSoonBadge } from './SongLight';

/**
 * The app's song page: `/songs/:songId`. It finds the song and records the
 * visit; the page itself is `SongDetailView`, which the console's song
 * editor renders too. A song whose chart is not ready (its red light,
 * songGate.ts) is Coming soon here, wherever the link came from; the
 * console opens it.
 */
export const SongDetailPage: FC = () => {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const song = songId ? getSong(songId) : null;
  const lights = useSongLights();
  const open = !!song && (lights || isSongOpen(song));

  // Record that the user looked at this song (opened its detail page) so it can
  // feed the Learn hub's "Continue" bar — saved or not. Not a song that is
  // only Coming soon: there was nothing to look at.
  const recordSongView = useViewedSongsStore((s) => s.recordView);
  useEffect(() => {
    if (song && open) recordSongView(song.id);
  }, [song, open, recordSongView]);

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

  if (!open) return <SongComingSoon song={song} />;

  return <SongDetailView song={song} />;
};

/** A song whose chart is not ready yet: its art, greyed, and a way back. */
const SongComingSoon: FC<{ song: Song }> = ({ song }) => {
  const navigate = useNavigate();
  return (
    <div
      data-coming-soon=""
      className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <span className="relative block size-40 overflow-hidden rounded-xl">
        <span className="block size-full opacity-50 grayscale">
          <SongThumb song={song} />
        </span>
        <ComingSoonBadge className="absolute left-2.5 top-2.5" />
      </span>
      <div>
        <h1 className="text-xl font-semibold text-white/80">{song.title}</h1>
        <p className="text-white/45">{song.artist}</p>
      </div>
      <p className="max-w-sm text-sm text-white/50">
        This song’s chart is coming soon. It isn’t ready to play yet.
      </p>
      <button
        onClick={() => navigate('/songs')}
        className="rounded-full px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        Back to Song Library
      </button>
    </div>
  );
};
