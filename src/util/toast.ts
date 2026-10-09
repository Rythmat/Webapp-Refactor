import type { CSSProperties } from 'react';
import { toast } from 'sonner';

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export interface ToastAction {
  label: string;
  onClick: () => void;
}

// The neutral primary: the pill inverts the toast (white on a dark toast,
// dark on a light one) instead of the Toaster's brand-yellow `bg-primary`.
const ACTION_PILL: CSSProperties = {
  background: 'hsl(var(--foreground))',
  color: 'hsl(var(--background))',
  borderRadius: 9999,
  fontWeight: 600,
};

// The neutral secondary: a quiet outlined button in the toast's own colours
// (sonner's `cancel`), never the brand yellow and never a second pill.
const SECONDARY_BUTTON: CSSProperties = {
  background: 'transparent',
  color: 'hsl(var(--foreground))',
  border: '1px solid hsl(var(--foreground) / 0.24)',
  borderRadius: 9999,
  fontWeight: 500,
};

/**
 * A plain notice, optionally with one action such as Restore and a quieter
 * second one such as View. It stays up long enough to reach the buttons
 * (hovering pauses it, as with every toast). Returns the toast's id.
 */
export const showNotice = (
  message: string,
  options: {
    description?: string;
    action?: ToastAction;
    secondaryAction?: ToastAction;
  } = {},
): string | number => {
  const { action, secondaryAction } = options;
  const hasButton = Boolean(action || secondaryAction);
  return toast(message, {
    description: options.description,
    duration: hasButton ? 10_000 : undefined,
    action,
    actionButtonStyle: action ? ACTION_PILL : undefined,
    cancel: secondaryAction,
    cancelButtonStyle: secondaryAction ? SECONDARY_BUTTON : undefined,
  });
};
