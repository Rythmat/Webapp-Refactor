import * as Dialog from '@radix-ui/react-dialog';
import { useDawBodyTokens } from '@/daw/hooks/useDawBodyTokens';

// ── ConfirmModal ────────────────────────────────────────────────────────────
// Small confirmation dialog. Renders a Cancel + Confirm pair, or a single
// dismiss button when `cancelLabel` is omitted (informational use). The
// confirm is the app's white pill, or red when it destroys something.
//
// Radix portals it to <body>, outside .daw-root, so it holds the DAW tokens
// there itself (useDawBodyTokens). The card is an opaque surface rather than
// see-through glass, so its text never sits on whatever the editor shows
// behind it.

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Omit for a single-button (acknowledge-only) dialog. */
  cancelLabel?: string;
  /** Fired when the confirm button is pressed (after the dialog closes). */
  onConfirm?: () => void;
  /** Tint the confirm button as a destructive action. */
  destructive?: boolean;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive,
}: ConfirmModalProps) {
  useDawBodyTokens();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 outline-none"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow:
              '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
        >
          <Dialog.Title
            className="mb-2 text-base font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {title}
          </Dialog.Title>
          <Dialog.Description
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {description}
          </Dialog.Description>

          <div className="mt-5 flex justify-end gap-2">
            {cancelLabel && (
              <button
                onClick={() => onOpenChange(false)}
                className="h-8 cursor-pointer rounded-full bg-white/10 px-4 text-xs font-semibold transition-colors hover:bg-white/15"
                style={{ color: 'var(--color-text)', border: 'none' }}
              >
                {cancelLabel}
              </button>
            )}
            <button
              onClick={() => {
                onOpenChange(false);
                onConfirm?.();
              }}
              className="h-8 cursor-pointer rounded-full px-4 text-xs font-semibold transition-transform hover:scale-[1.03] active:scale-[0.97]"
              style={
                destructive
                  ? {
                      backgroundColor: 'var(--color-record, #ef4444)',
                      color: '#fff',
                      border: 'none',
                    }
                  : {
                      backgroundColor: '#fff',
                      color: '#101012',
                      border: 'none',
                    }
              }
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
