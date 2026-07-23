/**
 * MediaRemote — the teacher's remote play/pause for the projector video
 * (Phase 4). Sends a `media` command scoped to the current slide.
 */
import { Pause, Play } from 'lucide-react';

export interface MediaRemoteProps {
  onPlay: () => void;
  onPause: () => void;
}

export const MediaRemote = ({ onPlay, onPause }: MediaRemoteProps) => (
  <div className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.02] p-0.5">
    <button
      type="button"
      onClick={onPlay}
      title="Play on projector"
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white"
    >
      <Play className="h-3.5 w-3.5" />
    </button>
    <button
      type="button"
      onClick={onPause}
      title="Pause on projector"
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white"
    >
      <Pause className="h-3.5 w-3.5" />
    </button>
  </div>
);
