import { useEffect, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSong } from '@/curriculum/data/songs';
import { useViewedSongsStore } from '@/features/songs/useViewedSongsStore';
import { SongDetailView } from './SongDetailView';

/**
 * The app's song page: `/songs/:songId`. It finds the song and records the
 * visit; the page itself is `SongDetailView`, which the console's song
 * editor renders too.
 */
export const SongDetailPage: FC = () => {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const song = songId ? getSong(songId) : null;

  // Record that the user looked at this song (opened its detail page) so it can
  // feed the Learn hub's "Continue" bar — saved or not.
  const recordSongView = useViewedSongsStore((s) => s.recordView);
  useEffect(() => {
    if (song) recordSongView(song.id);
  }, [song, recordSongView]);

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

  return <SongDetailView song={song} />;
};
