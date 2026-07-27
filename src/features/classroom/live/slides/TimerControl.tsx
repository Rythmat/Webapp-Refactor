/**
 * TimerControl — the teacher's Start/Stop for the current slide's timer.
 * Seeds the duration from `Slide.timerSec` (default 60s). On start it builds a
 * SessionTimer with an absolute `endsAt` deadline; the teacher client's
 * auto-advance effect fires the nav at zero.
 */
import { Play, Square } from 'lucide-react';
import { useState } from 'react';
import type { SessionTimer } from '../sessionsStore';
import { TimerCountdown } from './TimerCountdown';

export interface TimerControlProps {
  slideId: string;
  defaultSec: number;
  timer: SessionTimer | null | undefined;
  onStart: (timer: SessionTimer) => void;
  onClear: () => void;
}

export const TimerControl = ({
  slideId,
  defaultSec,
  timer,
  onStart,
  onClear,
}: TimerControlProps) => {
  const [autoAdvance, setAutoAdvance] = useState(true);
  const running = Boolean(timer && timer.slideId === slideId);

  if (running && timer) {
    return (
      <div className="inline-flex items-center gap-2">
        <TimerCountdown endsAt={timer.endsAt} />
        {timer.autoAdvance && (
          <span className="text-[10px] uppercase tracking-wide text-[#7ecfcf]/80">
            auto
          </span>
        )}
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() =>
          onStart({
            slideId,
            endsAt: Date.now() + defaultSec * 1000,
            durationSec: defaultSec,
            autoAdvance,
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
      >
        <Play className="h-3.5 w-3.5" />
        {defaultSec}s timer
      </button>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-white/60">
        <input
          type="checkbox"
          checked={autoAdvance}
          onChange={(e) => setAutoAdvance(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#7ecfcf]"
        />
        auto-advance
      </label>
    </div>
  );
};
