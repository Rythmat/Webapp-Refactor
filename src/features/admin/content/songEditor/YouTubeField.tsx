import { useState } from 'react';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { Input } from '@/components/ui/input';
import type { Song } from '@/curriculum/types/songLibrary';
import { extractYouTubeId } from '@/hooks/media/useYouTubeIframePlayer';
import { getYouTubeUri, upsertYouTubeUri } from './songDefaults';

/**
 * The header's video slot, made editable: a text box for a YouTube link that
 * drives a live embed. The full URL is stored in `audioSources` (provider
 * 'youtube'); the published page re-parses it at render time.
 */
export const YouTubeField = ({
  song,
  onPatch,
}: {
  song: Song;
  onPatch: (patch: Partial<Song>) => void;
}) => {
  const uri = getYouTubeUri(song.audioSources);
  const [value, setValue] = useState(uri);
  const videoId = value.trim() ? extractYouTubeId(value.trim()) : null;
  const invalid = value.trim().length > 0 && !videoId;

  const commit = (next: string) => {
    setValue(next);
    onPatch({ audioSources: upsertYouTubeUri(song.audioSources, next) });
  };

  return (
    <div className="flex w-64 flex-shrink-0 flex-col gap-1 md:w-72">
      <div className="aspect-video overflow-hidden rounded-lg bg-black/40">
        {videoId ? (
          <YouTubePlayer videoId={videoId} minimalUI />
        ) : (
          <div className="flex size-full items-center justify-center bg-white/5 text-xs text-white/20">
            No video
          </div>
        )}
      </div>
      <Input
        className="h-7 text-xs"
        placeholder="Paste YouTube link…"
        value={value}
        onChange={(e) => commit(e.target.value)}
      />
      {invalid && (
        <p className="text-[11px] text-amber-400">Not a valid YouTube link.</p>
      )}
    </div>
  );
};
