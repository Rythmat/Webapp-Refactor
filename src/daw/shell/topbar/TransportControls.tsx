import { memo, useCallback } from 'react';
import { Circle, Pause, Play, Repeat } from 'lucide-react';
import { cn } from '@/components/utilities';
import { requestRecord } from '@/daw/commands/requestRecord';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { Toggle } from '@/daw/ui/Toggle';
import { ClickToggle } from './ClickToggle';
import { PositionReadout } from './PositionReadout';

// ── The transport, in the top bar's centre (milestone 2.5) ─────────────────
//
// Play (the white pill, a pause while playing), Record (red), the position
// readout, Loop and Click with its count-in, left to right, in one place:
// the old bar split them across its width (shell-19). Back, Forward and
// Stop left the bar when it was trimmed (2.7): Esc stops, Home and End go
// to the markers and the ends (commands/transportSkip), and the ruler
// seeks anywhere. Each control reads only its own state, so playback
// re-renders none of them: the readout and the click's dots move by ref.

const KEYS = {
  playPause: shortcutKeys('transport.playPause'),
  record: shortcutKeys('transport.record'),
  loop: shortcutKeys('transport.loop'),
};

export interface TransportControlsProps {
  isReady: boolean;
  onInit(): void;
  /** The top bar folded the count-in caret into its '⋯' menu. */
  countInFolded?: boolean;
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
  const toggleLoop = useStore((s) => s.toggleLoop);

  const withInit = useCallback(
    (action: () => void) => {
      if (!isReady) onInit();
      action();
    },
    [isReady, onInit],
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
