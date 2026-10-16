import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { Button } from './Button';
import { TYPE_CLASS } from './styles';
import { useReturnFocus } from './useReturnFocus';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** The question, as a heading ('Delete this track?'). */
  title: string;
  /**
   * What happens, in a sentence or two ('Its clips go too. You can undo
   * this.'). Required: an alert dialog is read out by its description.
   */
  description: ReactNode;
  /** The action's name ('Delete', 'Replace'). Default 'OK'. */
  confirmLabel?: string;
  /**
   * Default 'Cancel'. null leaves Cancel out: a notice with one way out
   * ('OK'), which Escape also takes.
   */
  cancelLabel?: string | null;
  /** The action destroys work: a red button, and focus starts on Cancel. */
  danger?: boolean;
  onConfirm(): void;
  /** Cancel, Escape or closing any other way. */
  onCancel?(): void;
  /**
   * A second way through, between Cancel and the action ('Overwrite' beside
   * 'Save as a copy'): a secondary button that closes the dialog too.
   */
  alternative?: { label: string; onSelect(): void };
}

/**
 * Asks before acting, on Radix's alert dialog (role="alertdialog"): focus is
 * trapped, Escape cancels, and a click outside does nothing, so the choice
 * is always deliberate. Focus starts on Cancel when the action is
 * destructive and on the action otherwise. It replaces window.confirm in
 * the editor (milestone 2.3 moves the callers over). Its root is Radix's own,
 * not the kit's AlertDialog, for the reason DawDialog gives.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
  alternative,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Set when the action is chosen, so the close that follows is not also
  // reported as a cancel.
  const confirmed = useRef(false);
  const focus = useReturnFocus();

  return (
    <AlertDialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (!confirmed.current) onCancel?.();
          confirmed.current = false;
        }
        onOpenChange(next);
      }}
    >
      <AlertDialogPrimitive.Portal>
        {/* A plain scrim, as DawDialog's: no backdrop blur. */}
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[var(--daw-z-modal)] bg-daw-scrim" />
        <AlertDialogPrimitive.Content
          data-ds="v2"
          onOpenAutoFocus={(event) => {
            focus.capture();
            // Radix starts on Cancel; a harmless action starts on itself.
            if (danger || !confirmRef.current) return;
            event.preventDefault();
            confirmRef.current.focus();
          }}
          onCloseAutoFocus={focus.restore}
          className={cn(
            'fixed left-1/2 top-1/2 z-[var(--daw-z-modal)] w-[calc(100vw-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--daw-radius-lg)] border border-daw-hairline bg-daw-popover p-5 text-daw-text shadow-2xl shadow-black/60 outline-none',
            TYPE_CLASS.body,
          )}
        >
          <AlertDialogPrimitive.Title
            className={cn(TYPE_CLASS.heading, 'text-daw-text')}
          >
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description
            className={cn(TYPE_CLASS.body, 'mt-2 text-daw-text-2')}
          >
            {description}
          </AlertDialogPrimitive.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {cancelLabel !== null && (
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="secondary">{cancelLabel}</Button>
              </AlertDialogPrimitive.Cancel>
            )}
            {alternative ? (
              <AlertDialogPrimitive.Action asChild>
                <Button
                  variant="secondary"
                  onClick={() => {
                    confirmed.current = true;
                    alternative.onSelect();
                  }}
                >
                  {alternative.label}
                </Button>
              </AlertDialogPrimitive.Action>
            ) : null}
            <AlertDialogPrimitive.Action asChild>
              <Button
                ref={confirmRef}
                variant={danger ? 'danger' : 'primary'}
                onClick={() => {
                  confirmed.current = true;
                  onConfirm();
                }}
              >
                {confirmLabel}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
