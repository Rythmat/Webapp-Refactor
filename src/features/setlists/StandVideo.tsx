import type { FC } from 'react';
import { RecordingPill } from '@/components/media/RecordingPill';
import type { Song } from '@/curriculum/types/songLibrary';
import { extractYouTubeId } from '@/hooks/media/useYouTubeIframePlayer';

/**
 * The recording, one click away from the stand.
 *
 * A player checking a tempo or a feel before counting off wants the record,
 * not a video player in the way of the chart. So it is shut until asked for
 * (`RecordingPill`, which a lesson's slide uses too), and the iframe is not
 * created until then. Moving to another song in the set changes the video and
 * stops it.
 */

export const StandVideo: FC<{
  song: Song | null;
  /** The key the recording is in, when the set plays it in another one. */
  recordedKey?: string;
}> = ({ song, recordedKey }) => {
  const source = song?.audioSources.find((s) => s.provider === 'youtube');
  const videoId = source?.uri ? extractYouTubeId(source.uri) : null;
  if (!videoId) return null;
  return (
    <RecordingPill
      videoId={videoId}
      startSec={source?.startOffsetSec}
      note={
        recordedKey
          ? `The recording is in ${recordedKey} — this set plays it in ${song?.key}.`
          : undefined
      }
    />
  );
};
