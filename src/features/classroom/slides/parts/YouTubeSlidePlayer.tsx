/**
 * Thin slide-scale wrapper over `useYouTubeIframePlayer` — a rounded-3xl
 * 16:9 frame around the IFrame-API player. Default export so
 * SlideMediaPanel can `React.lazy` it (the IFrame API script only loads on
 * surfaces that actually play video, i.e. the projector).
 */
import { useEffect } from 'react';
import { useYouTubeIframePlayer } from '@/hooks/media/useYouTubeIframePlayer';

/** Remote play/pause command from the teacher (Phase 4). `cmdId` is a nonce so
 *  repeated identical commands still re-fire; the effect queues until ready. */
export interface MediaSlideCommand {
  action: 'play' | 'pause';
  atSec?: number;
  cmdId: number;
}

interface YouTubeSlidePlayerProps {
  videoId: string;
  startSec?: number;
  endSec?: number;
  loop?: boolean;
  className?: string;
  command?: MediaSlideCommand;
}

const YouTubeSlidePlayer = ({
  videoId,
  startSec,
  endSec,
  loop,
  className,
  command,
}: YouTubeSlidePlayerProps) => {
  const { containerRef, isReady, play, pause, seekTo } = useYouTubeIframePlayer(
    {
      videoId,
      startSec,
      endSec,
      loop,
    },
  );

  // Apply a remote command once the player is ready (early calls no-op against
  // an un-ready player, so the effect re-runs when isReady flips).
  useEffect(() => {
    if (!command || !isReady) return;
    if (command.atSec !== undefined) seekTo(command.atSec);
    if (command.action === 'play') play();
    else pause();
  }, [command?.cmdId, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 ${className ?? ''}`}
    >
      <div ref={containerRef} className="size-full" />
      {!isReady && (
        <div
          aria-hidden
          className="slide-media__skeleton pointer-events-none absolute inset-0 bg-white/[0.03]"
        />
      )}
    </div>
  );
};

export default YouTubeSlidePlayer;
