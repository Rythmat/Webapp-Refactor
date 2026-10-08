import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactElement, type ReactNode, type RefObject } from 'react';
import {
  Dialog as KitDialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { IconButton } from './IconButton';
import { OVERLAY_MOTION, TYPE_CLASS } from './styles';
import { useReturnFocus } from './useReturnFocus';

export type DawDialogSize = 'sm' | 'md' | 'lg' | 'full';
export type SheetSide = 'right' | 'left' | 'bottom';

interface OverlayProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
  /** The element that opens it, if the dialog owns its trigger. */
  trigger?: ReactElement;
  /** The dialog's name, shown as its heading. Required. */
  title: string;
  /** Keep the title for screen readers only. */
  hideTitle?: boolean;
  description?: ReactNode;
  /** Actions, bottom right, the primary pill last. */
  footer?: ReactNode;
  children?: ReactNode;
  /**
   * What gets focus on open. Without it, the first field or button in the
   * body or footer does (the close button comes last).
   */
  initialFocus?: RefObject<HTMLElement | null>;
  /** The close button's name. Default 'Close'. */
  closeLabel?: string;
  /** A click on the scrim closes it. Default true; Escape always does. */
  dismissible?: boolean;
  className?: string;
}

export interface DawDialogProps extends OverlayProps {
  /** Width: 400, 520 (default) or 720 px, or nearly the whole window. */
  size?: DawDialogSize;
}

export interface SheetProps extends OverlayProps {
  /** The edge it slides from. Default 'right'. */
  side?: SheetSide;
}

const DIALOG_SIZE: Record<DawDialogSize, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[720px]',
  full: 'h-[calc(100dvh-48px)] max-w-[calc(100vw-48px)]',
};

const SHEET_SIDE: Record<SheetSide, string> = {
  right:
    'inset-y-0 right-0 w-[min(420px,calc(100vw-32px))] rounded-l-[var(--daw-radius-lg)] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
  left: 'inset-y-0 left-0 w-[min(420px,calc(100vw-32px))] rounded-r-[var(--daw-radius-lg)] border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  bottom:
    'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[var(--daw-radius-lg)] border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
};

/**
 * The modal frame DawDialog and Sheet share, on the shared Radix kit: it
 * portals to <body>, darkens the editor behind a black/60 scrim, traps
 * focus, closes on Escape and gives focus back to whatever opened it. The
 * panel is opaque (an overlay never shows the editor through it) and is
 * mounted only while open.
 */
function OverlayFrame({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  hideTitle = false,
  description,
  footer,
  children,
  initialFocus,
  closeLabel = 'Close',
  dismissible = true,
  className,
  panelClassName,
}: OverlayProps & { panelClassName: string }) {
  const focus = useReturnFocus();
  return (
    <KitDialog
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      {trigger && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}
      <DialogPortal>
        <DialogOverlay
          className={cn(
            'z-[var(--daw-z-modal)] bg-daw-scrim',
            OVERLAY_MOTION.base,
          )}
        />
        <DialogPrimitive.Content
          // Without a description, say so, rather than point at nothing.
          {...(description ? {} : { 'aria-describedby': undefined })}
          onOpenAutoFocus={(event) => {
            focus.capture();
            const target = initialFocus?.current;
            if (!target) return;
            event.preventDefault();
            target.focus();
            // A text field opens with its text selected, ready to retype.
            if (target instanceof HTMLInputElement) target.select();
          }}
          onCloseAutoFocus={focus.restore}
          onPointerDownOutside={(event) => {
            if (!dismissible) event.preventDefault();
          }}
          className={cn(
            'fixed z-[var(--daw-z-modal)] flex flex-col border-daw-hairline bg-daw-popover text-daw-text shadow-2xl shadow-black/60 outline-none',
            'data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            OVERLAY_MOTION.base,
            TYPE_CLASS.body,
            panelClassName,
            className,
          )}
        >
          <div className="shrink-0 px-5 pb-2 pr-12 pt-4">
            <DialogTitle
              className={cn(
                TYPE_CLASS.heading,
                'tracking-normal text-daw-text',
                hideTitle && 'sr-only',
              )}
            >
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription
                className={cn(TYPE_CLASS.body, 'mt-1 text-daw-text-2')}
              >
                {description}
              </DialogDescription>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
            {children}
          </div>
          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-2 px-5 pb-4 pt-3">
              {footer}
            </div>
          )}
          {/* Last in the tab order, so focus starts on the content. */}
          <DialogClose asChild>
            <IconButton
              label={closeLabel}
              icon={<X />}
              noTooltip
              className="absolute right-3 top-3"
            />
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </KitDialog>
  );
}

/**
 * A modal dialog: settings, export, the Projects list. Title at 16/22,
 * body at 13 px, actions bottom right with the white pill last.
 */
export function DawDialog({ size = 'md', ...props }: DawDialogProps) {
  return (
    <OverlayFrame
      {...props}
      panelClassName={cn(
        'left-1/2 top-1/2 max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--daw-radius-lg)] border',
        // The open and close keyframes replace the whole transform, so they
        // carry the -50% centring too; without it the panel opened from its
        // corner at the middle of the window and slid into place.
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2',
        DIALOG_SIZE[size],
      )}
    />
  );
}

/**
 * A modal panel along one edge: the Add-track sheet, a browser drawer. The
 * same frame as DawDialog, full height (or, from the bottom, up to 85%).
 */
export function Sheet({ side = 'right', ...props }: SheetProps) {
  return <OverlayFrame {...props} panelClassName={SHEET_SIDE[side]} />;
}
