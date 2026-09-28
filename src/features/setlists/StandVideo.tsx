import { ChevronDown, Youtube } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  extractYouTubeId,
  useYouTubeIframePlayer,
} from '@/hooks/media/useYouTubeIframePlayer';

/**
 * The recording, one click away from the stand.
 *
 * A player checking a tempo or a feel before counting off wants the record,
 * not a video player in the way of the chart. So it is shut until asked for,
 * and the iframe is not even created until then — at a gig nobody wants every
 * chart in the set quietly loading YouTube.
 *
 * Once opened it stays mounted, hidden rather than unmounted, so collapsing
 * the panel does not cut off a recording someone is listening to while they
 * read. Moving to another song in the set changes the video and stops it.
 */

export const StandVideo: FC<{
  song: Song | null;
  /** The key the recording is in, when the set plays it in another one. */
  recordedKey?: string;
}> = ({ song, recordedKey }) => {
  const source = song?.audioSources.find((s) => s.provider === 'youtube');
  const videoId = source?.uri ? extractYouTubeId(source.uri) : null;

  const [open, setOpen] = useState(false);
  // Armed on first open and never disarmed: that is what keeps the player
  // alive across a collapse.
  const [armed, setArmed] = useState(false);

  // Each song gets its own panel state — a new chart starts shut and silent.
  useEffect(() => {
    setOpen(false);
    setArmed(false);
  }, [videoId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const { containerRef, isPlaying } = useYouTubeIframePlayer({
    videoId: armed ? videoId : null,
    startSec: source?.startOffsetSec,
  });

  if (!videoId) return null;

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setArmed(true);
          setOpen((v) => !v);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors ${
          isPlaying
            ? 'border-[#7ecfcf]/50 text-[#7ecfcf]'
            : 'border-white/15 text-white/60 hover:border-white/30'
        }`}
        title={open ? 'Hide the recording' : 'Listen to the recording'}
      >
        <Youtube size={13} />
        Recording
        {isPlaying && !open && (
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-[#7ecfcf]"
            title="Playing"
          />
        )}
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Rendered from the start so the player has something to replace, and
          only hidden when shut — never unmounted. */}
      <div
        className="absolute right-0 top-full z-20 mt-2 w-[min(28rem,80vw)] overflow-hidden rounded-xl border border-white/10 bg-[#161618] shadow-2xl"
        style={{ display: open ? 'block' : 'none' }}
      >
        <div className="aspect-video w-full bg-black">
          <div ref={containerRef} className="h-full w-full" />
        </div>
        {recordedKey && (
          <p className="px-3 py-1.5 text-[11px] text-white/45">
            The recording is in {recordedKey} — this set plays it in {song?.key}
            .
          </p>
        )}
      </div>
    </div>
  );
};
