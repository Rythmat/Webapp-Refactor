import { memo, useCallback } from 'react';
import {
  Circle,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Square,
} from 'lucide-react';
import { cn } from '@/components/utilities';
import { projectEndTick } from '@/daw/audio/renderProject';
import { requestRecord } from '@/daw/commands/requestRecord';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import { seekTo } from '@/daw/hooks/useTransport';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { Toggle } from '@/daw/ui/Toggle';
import { ClickToggle } from './ClickToggle';
import { PositionReadout } from './PositionReadout';

// ── The transport, in the top bar's centre (milestone 2.5) ─────────────────
//
// Back, Forward, Stop, Play (the white pill, a pause while playing), Record (red),
// the position readout, Loop and Click with its count-in, left to right, in
// one place: the old bar split them across its width (shell-19). Each
// control reads only its own state, so playback re-renders none of them:
// the readout and the click's dots move by ref.

const KEYS = {
  playPause: shortcutKeys('transport.playPause'),
  record: shortcutKeys('transport.record'),
  stop: shortcutKeys('transport.stop'),
  loop: shortcutKeys('transport.loop'),
};

export interface TransportControlsProps {
  isReady: boolean;
  onInit(): void;
  /** The top bar folded the count-in caret into its '⋯' menu. */
  countInFolded?: boolean;
}

/** The marker before `pos`, or the start: where Back goes. */
export function backTargetTick(pos: number): number {
  const sorted = [...useStore.getState().markers].sort(
    (a, b) => a.tick - b.tick,
  );
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].tick < pos) return sorted[i].tick;
  }
  return 0;
}

/**
 * The marker after `pos`, else the end of the content (audio clips
 * included), else null: where Forward goes. Read when pressed, not
 * subscribed: the bar would otherwise re-render on every track edit for this
 * one button (shell-17).
 */
export function forwardTargetTick(pos: number): number | null {
  const state = useStore.getState();
  const sorted = [...state.markers].sort((a, b) => a.tick - b.tick);
  for (const m of sorted) {
    if (m.tick > pos) return m.tick;
  }
  const lastTick = projectEndTick(state);
  return lastTick > pos ? lastTick : null;
}

export const TransportControls = memo(function TransportControls({
  isReady,
  onInit,
  countInFolded = false,
}: TransportControlsProps) {
  useDevCommitCount('TransportControls');
  const isPlaying = useStore((s) => s.isPlaying);
  const isRecording = useStore((s) => s.isRecording);
  const isCountingIn = useStore((s) => s.isCountingIn);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const play = useStore((s) => s.play);
  const pause = useStore((s) => s.pause);
  const stop = useStore((s) => s.stop);
  const toggleLoop = useStore((s) => s.toggleLoop);

  const withInit = useCallback(
    (action: () => void) => {
      if (!isReady) onInit();
      action();
    },
    [isReady, onInit],
  );

  const handleStop = useCallback(() => withInit(stop), [withInit, stop]);
  const handleStopToZero = useCallback(
    () =>
      withInit(() => {
        stop();
        seekTo(0);
      }),
    [withInit, stop],
  );
  // From the live playhead: the store's position is parked while playing.
  const handleBack = useCallback(
    () => withInit(() => seekTo(backTargetTick(getPlayheadTick()))),
    [withInit],
  );
  const handleForward = useCallback(
    () =>
      withInit(() => {
        const target = forwardTargetTick(getPlayheadTick());
        if (target !== null) seekTo(target);
      }),
    [withInit],
  );
  const handlePlayPause = useCallback(
    () => withInit(isPlaying ? pause : play),
    [withInit, isPlaying, pause, play],
  );
  // The same command as the R key: a take that would record over existing
  // audio waits for RecordGuard's confirm, mounted at the editor root.
  const handleRecord = useCallback(() => {
    requestRecord(isReady ? undefined : onInit);
  }, [isReady, onInit]);

  const recordState = isRecording
    ? 'recording'
    : isCountingIn
      ? 'count-in'
      : 'idle';

  return (
    <div className="flex shrink-0 items-center gap-1">
      <IconButton
        label="Back to the previous marker or the start"
        icon={<SkipBack fill="currentColor" strokeWidth={0} />}
        tooltipSide="bottom"
        data-testid="transport-back"
        onClick={handleBack}
      />
      <IconButton
        label="Forward to the next marker or the end"
        icon={<SkipForward fill="currentColor" strokeWidth={0} />}
        tooltipSide="bottom"
        data-testid="transport-forward"
        onClick={handleForward}
      />
      <IconButton
        label="Stop (double-click: back to the start)"
        icon={<Square fill="currentColor" strokeWidth={0} />}
        shortcut={KEYS.stop.label}
        aria-keyshortcuts={KEYS.stop.aria}
        tooltipSide="bottom"
        data-testid="transport-stop"
        className="[&_svg]:size-3"
        onClick={handleStop}
        onDoubleClick={handleStopToZero}
      />
      <IconButton
        label={isPlaying ? 'Pause' : 'Play'}
        icon={
          isPlaying ? (
            <Pause fill="currentColor" strokeWidth={0} />
          ) : (
            <Play fill="currentColor" strokeWidth={0} className="ml-0.5" />
          )
        }
        variant="primary"
        size="play"
        shortcut={KEYS.playPause.label}
        aria-keyshortcuts={KEYS.playPause.aria}
        tooltipSide="bottom"
        data-testid="transport-play"
        data-playing={isPlaying || undefined}
        onClick={handlePlayPause}
      />
      <IconButton
        label={isRecording ? 'Recording' : 'Record'}
        icon={
          <span className="relative inline-flex">
            <Circle fill="currentColor" strokeWidth={0} />
            {isRecording ? (
              <span
                aria-hidden
                className="absolute inset-0 animate-ping rounded-full bg-daw-on-danger opacity-60 motion-reduce:animate-none"
              />
            ) : null}
          </span>
        }
        shortcut={KEYS.record.label}
        aria-keyshortcuts={KEYS.record.aria}
        aria-pressed={isRecording}
        tooltipSide="bottom"
        data-testid="transport-record"
        data-state={recordState}
        className={cn(
          '[&_svg]:size-3',
          isRecording
            ? 'bg-daw-danger text-daw-on-danger hover:bg-daw-danger-hover hover:text-daw-on-danger'
            : 'text-daw-record hover:text-daw-record',
        )}
        onClick={handleRecord}
      />
      <span className="mx-1 h-4 w-px shrink-0 bg-daw-hairline" aria-hidden />
      <PositionReadout />
      <Toggle
        label="Loop"
        icon={<Repeat />}
        pressed={loopEnabled}
        onPressedChange={() => toggleLoop()}
        shortcut={KEYS.loop.label}
        aria-keyshortcuts={KEYS.loop.aria}
        data-testid="transport-loop"
      />
      <ClickToggle countInFolded={countInFolded} />
    </div>
  );
});
