import { useMemo, useState } from 'react';
import { RecordingPill } from '@/components/media/RecordingPill';
import { useLessonSong } from './LessonSong';

/**
 * A slide's Recording pill: in a deck with one song (Present, the room's
 * screen) it drives that song, so the music plays on into the next slide;
 * anywhere else, a pill with a player of its own.
 */
export const LessonSongPill = ({ videoId }: { videoId: string }) => {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const song = useLessonSong(videoId, panel);
  const shared = useMemo(
    () => (song ? { ...song, dock: setPanel } : undefined),
    [song],
  );
  return (
    <RecordingPill
      videoId={videoId}
      quickPlay
      align="left"
      {...(shared ? { shared } : {})}
    />
  );
};
