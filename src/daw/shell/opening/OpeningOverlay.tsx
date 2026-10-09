import { Loader2 } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { cn } from '@/components/utilities';
import type { WaitingFor } from '@/daw/session/types';
import { Button } from '@/daw/ui/Button';
import { TYPE_CLASS } from '@/daw/ui/styles';

// ── The Opening overlay (milestone 1.4, spec E14) ──────────────────────────
//
// Covers the editor while a session opens: absolutely positioned over
// .daw-root (every view, Practice included), under Radix dialogs, the lesson
// layer and toasts. 'dim' is the quiet scrim of the first cold boot (no
// card, nothing to read); 'full' adds a neutral card with a spinner and the
// open's line. It takes every pointer event under it; DawApp makes the rest
// of .daw-root inert while it shows, leaving this element out, so Cancel and
// 'Back to my work' stay usable. Hidden when printing (leadsheet-print.css
// hides every child of .daw-root but the lead sheet). Unmounted at ready.
// Only the line is the live region (role=status); the buttons sit beside
// it. When the card shows a button and focus was in the now-inert editor
// (or nowhere), the button takes focus, so a keyboard reaches it at once.

export interface OpeningOverlayProps {
  mode: 'dim' | 'full';
  label: string | null;
  waitingFor: WaitingFor;
  cancellable: boolean;
  onCancel(): void;
  /** Set during a collab host wait: give up and go back to the kept work. */
  onBackToMyWork?: () => void;
}

/** The line for a wait when the open didn't give one. */
const WAITING_COPY: Record<Exclude<WaitingFor, null>, string> = {
  owner: 'Signing you in…',
  token: 'Signing you in…',
  plan: 'Checking your plan…',
  host: 'Waiting for the host to open the session…',
  save: 'Finishing your save…',
  take: 'Finishing your recording…',
};

/** What the overlay says: the open's own line, else the wait's, else a default. */
export function overlayCopy(
  label: string | null,
  waitingFor: WaitingFor,
): string {
  if (waitingFor === 'host') return WAITING_COPY.host;
  return label?.trim() || (waitingFor ? WAITING_COPY[waitingFor] : 'Opening…');
}

/** The scrim: the editor's background at 72%, from its token. */
const SCRIM: CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--daw-bg) 72%, transparent)',
};

export function OpeningOverlay({
  mode,
  label,
  waitingFor,
  cancellable,
  onCancel,
  onBackToMyWork,
}: OpeningOverlayProps) {
  const text = overlayCopy(label, waitingFor);
  const full = mode === 'full';
  const showBack = Boolean(onBackToMyWork);
  const showCancel = cancellable && !showBack;
  const actionRef = useRef<HTMLButtonElement>(null);

  // Focus the card's button when it appears, unless the student is busy
  // somewhere that stays usable (the TopRail, a dialog).
  useEffect(() => {
    if (!full || (!showBack && !showCancel)) return;
    const button = actionRef.current;
    if (!button) return;
    const active = document.activeElement;
    const stranded =
      active === null ||
      active === document.body ||
      active.closest('.daw-root') !== null;
    if (stranded && active !== button) button.focus({ preventScroll: true });
  }, [full, showBack, showCancel]);

  return (
    <div
      data-testid="opening-overlay"
      data-mode={mode}
      data-waiting-for={waitingFor ?? 'none'}
      className={cn(
        // Above the editor's own layers, below dialogs (modal), the lesson
        // layer and toasts.
        'absolute inset-0 z-[calc(var(--daw-z-modal)-1)] flex items-center justify-center p-4',
        'cursor-progress select-none text-daw-text',
      )}
      style={SCRIM}
    >
      {full ? (
        <div
          className={cn(
            'flex w-full max-w-[360px] cursor-default flex-col items-center gap-4 rounded-[var(--daw-radius-lg)] border border-daw-hairline bg-daw-popover px-6 py-5 text-center shadow-2xl shadow-black/60',
            'animate-in fade-in-0 duration-daw-base motion-reduce:animate-none',
          )}
        >
          <Loader2
            aria-hidden
            className="size-6 animate-spin text-white/60 motion-reduce:animate-none"
          />
          <p
            data-testid="opening-overlay-label"
            role="status"
            aria-live="polite"
            className={cn(TYPE_CLASS.body, 'text-daw-text')}
          >
            {text}
          </p>
          {showBack || showCancel ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {showBack ? (
                <Button
                  ref={actionRef}
                  variant="secondary"
                  onClick={onBackToMyWork}
                >
                  Back to my work
                </Button>
              ) : (
                <Button ref={actionRef} variant="secondary" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        // The quiet dim shows nothing, but a screen reader still hears it.
        <span className="sr-only" role="status" aria-live="polite">
          {text}
        </span>
      )}
    </div>
  );
}
