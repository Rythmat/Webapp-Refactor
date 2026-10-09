import {
  AudioLines,
  CircleDot,
  CloudCheck,
  HardDrive,
  Loader2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { memo, useCallback, useId } from 'react';
import { cn } from '@/components/utilities';
import { saveProject } from '@/daw/commands/saveProject';
import { useDraftStatusStore } from '@/daw/persistence/drafts/draftStatusStore';
import { isBusyPhase, useSessionStore } from '@/daw/session/sessionStore';
import { Chip } from '@/daw/ui/Chip';
import { FOCUS_RING } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';
import {
  SAVE_CHIP_ERROR_LEAD,
  SAVE_CHIP_WIDTH_PX,
  type SaveChipState,
} from './saveChipModel';
import { useSaveChipState } from './useSaveChipState';

// ── The save chip (milestone 1.4, spec E13) ────────────────────────────────
//
// Where the project stands, in one fixed-width chip: Saved, Saving…,
// Unsaved, Saved on this device, Couldn't save – Retry, Audio not saved yet.
// Neutral (white/10, 12 px Glacial regular, a 14 px icon); amber only on
// the icon of the two warnings. The chip itself is not a control: clicking
// it does nothing. In the error state it holds a real Retry button.
//
// A visually hidden live region announces only Saved, Couldn't save and
// Audio not saved yet, never the Unsaved / Saved on this device toggling
// that every edit causes.
//
// Retry: a device failure retries the draft write (and, with no writer
// retry registered, falls back to saving to the account, as the tooltip
// advises); a cloud failure saves again. Both when both failed. Off while
// a session opens (the chip shows its frozen previous state then).
//
// Stage A mounts it in the TopRail's leading slot and in the Practice
// header; milestone 2.5 moves it into the editor's own top bar. The TopRail
// is hidden below 768 px, so its chip passes announce={false} and the
// editor renders SaveChipAnnouncer outside the rail.

const ICON: Readonly<Record<SaveChipState, LucideIcon>> = {
  saved: CloudCheck,
  saving: Loader2,
  unsaved: CircleDot,
  local: HardDrive,
  error: TriangleAlert,
  'audio-pending': AudioLines,
};

/** Retry what failed: the device write, the cloud save, or both. */
export function retrySave(
  reason: 'cloud' | 'device' | 'partial' | null,
  deviceFailing: boolean,
): void {
  const deviceRetry = useDraftStatusStore.getState().retry;
  if (deviceFailing && deviceRetry !== null) deviceRetry();
  if (reason !== 'device' || deviceRetry === null) {
    void saveProject({ source: 'chip' });
  }
}

/**
 * The chip's polite live region on its own: only Saved, Couldn't save and
 * Audio not saved yet. Rendered where it stays in the accessibility tree
 * when the chip's container is hidden.
 */
export const SaveChipAnnouncer = memo(function SaveChipAnnouncer() {
  const chip = useSaveChipState();
  return (
    <span
      role="status"
      aria-live="polite"
      className="sr-only"
      data-testid="save-chip-announcer"
    >
      {chip.announce ?? ''}
    </span>
  );
});

export const SaveStatusChip = memo(function SaveStatusChip({
  className,
  announce = true,
}: {
  className?: string;
  /** Render the live region here (false: a SaveChipAnnouncer elsewhere). */
  announce?: boolean;
}) {
  const chip = useSaveChipState();
  const opening = useSessionStore((s) => isBusyPhase(s.phase));
  const reasonId = useId();
  const Icon = ICON[chip.state];
  const warning = chip.state === 'error' || chip.state === 'audio-pending';
  const { reason, deviceFailing } = chip;

  const retry = useCallback(() => {
    if (isBusyPhase(useSessionStore.getState().phase)) return;
    retrySave(reason, deviceFailing);
  }, [reason, deviceFailing]);

  return (
    <>
      <Tooltip content={chip.tooltip} side="bottom">
        <Chip
          size="md"
          data-testid="save-chip"
          data-state={chip.state}
          data-reason={reason ?? 'none'}
          className={cn(
            'justify-start bg-white/10 font-normal text-daw-text-2',
            className,
          )}
          style={{ width: SAVE_CHIP_WIDTH_PX }}
        >
          <Icon
            aria-hidden
            className={cn(
              warning && 'text-daw-warning',
              chip.state === 'saving' &&
                'animate-spin motion-reduce:animate-none',
            )}
          />
          {chip.retry ? (
            <>
              <span className="min-w-0 truncate">{SAVE_CHIP_ERROR_LEAD}</span>
              <button
                type="button"
                aria-label="Retry save"
                aria-describedby={reasonId}
                disabled={opening}
                onClick={retry}
                className={cn(
                  'inline-flex min-h-6 shrink-0 items-center rounded-sm px-0 text-daw-text underline underline-offset-2 hover:text-daw-text disabled:cursor-default disabled:opacity-50',
                  FOCUS_RING,
                  'focus-visible:outline-offset-0',
                )}
              >
                Retry
              </button>
              <span id={reasonId} className="sr-only">
                {chip.tooltip}
              </span>
            </>
          ) : (
            <span className="min-w-0 truncate">{chip.label}</span>
          )}
        </Chip>
      </Tooltip>
      {announce ? (
        <span role="status" aria-live="polite" className="sr-only">
          {chip.announce ?? ''}
        </span>
      ) : null}
    </>
  );
});
