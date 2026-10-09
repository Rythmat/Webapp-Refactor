import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { TriangleAlert } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/components/utilities';
import { Button } from '@/daw/ui/Button';
import { OVERLAY_MOTION, TYPE_CLASS } from '@/daw/ui/styles';
import { useReturnFocus } from '@/daw/ui/useReturnFocus';

// ── The open error panel (milestone 1.4, spec E14) ─────────────────────────
//
// What failed while opening a session, when it's worth more than a toast:
// a transient failure before anything changed (offline, the server, a
// timeout, an expired sign-in) or anything after the switch. A Radix alert
// dialog: focus starts on the primary action, Escape means 'Back to my
// work', a click outside does nothing. Retry (the white pill) only when
// retrying can help. A link whose id names nothing stays a toast (R5).

export interface OpenErrorPanelProps {
  open: boolean;
  /** 'Couldn’t open ‘X’' or 'Couldn’t join the session'. */
  title: string;
  /** One plain line: no ids, no codes. */
  reason: string;
  retryable: boolean;
  onRetry(): void;
  onBack(): void;
}

export function OpenErrorPanel({
  open,
  title,
  reason,
  retryable,
  onRetry,
  onBack,
}: OpenErrorPanelProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const focus = useReturnFocus();

  return (
    <AlertDialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onBack();
      }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[var(--daw-z-modal)] bg-daw-scrim',
            'data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            OVERLAY_MOTION.base,
          )}
        />
        <AlertDialogPrimitive.Content
          data-testid="open-error"
          onOpenAutoFocus={(event) => {
            focus.capture();
            event.preventDefault();
            primaryRef.current?.focus();
          }}
          onCloseAutoFocus={focus.restore}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            onBack();
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-[var(--daw-z-modal)] w-[calc(100vw-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--daw-radius-lg)] border border-daw-hairline bg-daw-popover p-5 text-daw-text shadow-2xl shadow-black/60 outline-none',
            'data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            OVERLAY_MOTION.base,
            TYPE_CLASS.body,
          )}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10"
            >
              <TriangleAlert className="size-4 text-daw-warning" />
            </span>
            <div className="min-w-0">
              <AlertDialogPrimitive.Title
                className={cn(TYPE_CLASS.heading, 'text-daw-text')}
              >
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description
                data-testid="open-error-reason"
                className={cn(TYPE_CLASS.body, 'mt-1.5 text-daw-text-2')}
              >
                {reason}
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {retryable ? (
              <>
                <Button variant="secondary" onClick={onBack}>
                  Back to my work
                </Button>
                <Button ref={primaryRef} variant="primary" onClick={onRetry}>
                  Retry
                </Button>
              </>
            ) : (
              <Button ref={primaryRef} variant="primary" onClick={onBack}>
                Back to my work
              </Button>
            )}
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
