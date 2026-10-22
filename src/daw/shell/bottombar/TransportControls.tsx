import { memo, useCallback } from 'react';
import { cn } from '@/components/utilities';
import { requestRecord } from '@/daw/commands/requestRecord';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { goToStart } from '@/daw/commands/transportSkip';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import {
  BackToStartGlyph,
  LoopGlyph,
  PauseGlyph,
  PlayGlyph,
  RecordGlyph,
} from '@/daw/ui/icons/frameIcons';
import { PILL_TOGGLE, PillGroup } from '@/daw/ui/Pill';
import { Toggle } from '@/daw/ui/Toggle';
import { ClickToggle } from './ClickToggle';
import { PositionReadout } from './PositionReadout';

// ── The transport, in the top bar's centre (2.5, B4a, 2.8; S0) ──────────
//
// Two pills, as the floating frame's transport (owner, 2026-10-21):
// Metronome, Back to start, Record, Play and Loop in one; the position in
// the next. Every icon is a solid glyph at white/50 until hovered
// (ui/icons/frameIcons); Record fills red while it records. Rewind and Fast-forward a bar left the bar
// with it, but keep their keys (commands/transportSkip), as Esc, Home and
// End do; the ruler seeks anywhere. Each control reads only its own state,
// so playback re-renders none of them: the readout and the metronome's
// dots move by ref.

const KEYS = {
  playPause: shortcutKeys('transport.playPause'),
  record: shortcutKeys('transport.record'),
  toStart: shortcutKeys('transport.toStart'),
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

  const recordState = isRecording
    ? 'recording'
    : isCountingIn
      ? 'count-in'
      : 'idle';

  return (
    <>
      <PillGroup label="Transport controls" data-testid="transport-pill">
        <ClickToggle />
        <IconButton
          variant="bare"
          size="lg"
          label="Back to start"
          icon={<BackToStartGlyph />}
          shortcut={KEYS.toStart.label}
          aria-keyshortcuts={KEYS.toStart.aria}
          tooltipSide="bottom"
          data-hint={hintText(
            'Back to start',
            'Move the playhead back to the beginning',
            KEYS.toStart.label,
          )}
          data-testid="transport-to-start"
          onClick={goToStart}
        />
        <IconButton
          variant="bare"
          size="lg"
          label={isRecording ? 'Recording' : 'Record'}
          icon={
            <span className="relative inline-flex">
              <RecordGlyph className="size-3" />
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
              : '',
          )}
          onClick={handleRecord}
        />
        <IconButton
          label={isPlaying ? 'Pause' : 'Play'}
          icon={isPlaying ? <PauseGlyph /> : <PlayGlyph />}
          variant="bare"
          size="lg"
          shortcut={KEYS.playPause.label}
          aria-keyshortcuts={KEYS.playPause.aria}
          tooltipSide="bottom"
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
        <Toggle
          label="Loop"
          tooltipSide="bottom"
          className={PILL_TOGGLE}
          icon={<LoopGlyph />}
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
      </PillGroup>
      <PillGroup label="Position" className="px-3">
        <PositionReadout />
      </PillGroup>
    </>
  );
});
