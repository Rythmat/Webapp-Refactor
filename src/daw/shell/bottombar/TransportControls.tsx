import { memo, useCallback } from 'react';
import {
  Circle,
  FastForward,
  Pause,
  Play,
  Repeat,
  Rewind,
  SkipBack,
} from 'lucide-react';
import { cn } from '@/components/utilities';
import { requestRecord } from '@/daw/commands/requestRecord';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import {
  fastForwardBar,
  goToStart,
  rewindBar,
} from '@/daw/commands/transportSkip';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { Toggle } from '@/daw/ui/Toggle';
import { ClickToggle } from './ClickToggle';
import { PositionReadout } from './PositionReadout';
import { useHoldRepeat } from './useHoldRepeat';

// ── The transport, in the bottom rail's centre (milestones 2.5, B4a, 2.8) ──
//
// Play (the white pill, a pause while playing), Record (red), Go to start,
// Rewind and Fast-forward, the position readout, Loop and Click with its
// menu, left to right, in one place: the old bar split them across its
// width (shell-19). It moved from the top bar to the bottom rail (B4a), and
// the three skip buttons came back there after Soundtrap's (2.8): Rewind
// and Fast-forward step a bar and repeat while held. Esc stops, Home and End
// go to the markers and the ends (commands/transportSkip), and the ruler
// seeks anywhere. Each control reads only its own state, so playback
// re-renders none of them: the readout and the click's dots move by ref.

const KEYS = {
  playPause: shortcutKeys('transport.playPause'),
  record: shortcutKeys('transport.record'),
  toStart: shortcutKeys('transport.toStart'),
  rewind: shortcutKeys('transport.rewind'),
  fastForward: shortcutKeys('transport.fastForward'),
  loop: shortcutKeys('transport.loop'),
};

export interface TransportControlsProps {
  isReady: boolean;
  onInit(): void;
}

export const TransportControls = memo(function TransportControls({
  isReady,
  onInit,
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

  const rewind = useHoldRepeat(rewindBar);
  const fastForward = useHoldRepeat(fastForwardBar);

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
        tooltipSide="top"
        data-hint={hintText(
          isPlaying ? 'Pause' : 'Play',
          isPlaying
            ? 'Stop playing and stay here'
            : 'Play the song from the playhead',
          KEYS.playPause.label,
        )}
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
        tooltipSide="top"
        data-hint={hintText(
          isRecording ? 'Recording' : 'Record',
          isRecording
            ? 'Stop recording'
            : 'Record what you play, from the playhead',
          KEYS.record.label,
        )}
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
      <IconButton
        label="Go to start"
        icon={<SkipBack fill="currentColor" />}
        shortcut={KEYS.toStart.label}
        aria-keyshortcuts={KEYS.toStart.aria}
        tooltipSide="top"
        data-hint={hintText(
          'Go to start',
          'Move the playhead back to the beginning',
          KEYS.toStart.label,
        )}
        data-testid="transport-to-start"
        onClick={goToStart}
      />
      <IconButton
        label="Rewind one bar"
        icon={<Rewind fill="currentColor" />}
        shortcut={KEYS.rewind.label}
        aria-keyshortcuts={KEYS.rewind.aria}
        tooltipSide="top"
        data-hint={hintText(
          'Rewind one bar',
          'Step back a bar; hold to keep going',
          KEYS.rewind.label,
        )}
        data-testid="transport-rewind"
        {...rewind}
      />
      <IconButton
        label="Fast-forward one bar"
        icon={<FastForward fill="currentColor" />}
        shortcut={KEYS.fastForward.label}
        aria-keyshortcuts={KEYS.fastForward.aria}
        tooltipSide="top"
        data-hint={hintText(
          'Fast-forward one bar',
          'Step on a bar; hold to keep going',
          KEYS.fastForward.label,
        )}
        data-testid="transport-fast-forward"
        {...fastForward}
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
        data-hint={hintText(
          'Loop',
          'Play the loop range over and over',
          KEYS.loop.label,
        )}
        data-testid="transport-loop"
      />
      <ClickToggle />
    </div>
  );
});
