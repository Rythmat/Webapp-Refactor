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

/**
 * A plain notice, optionally with one action such as Restore. It stays up
 * long enough to reach the button (hovering pauses it, as with every toast).
 */
export const showNotice = (
  message: string,
  options: { description?: string; action?: ToastAction } = {},
) =>
  toast(message, {
    description: options.description,
    duration: options.action ? 10_000 : undefined,
    action: options.action,
    actionButtonStyle: options.action ? ACTION_PILL : undefined,
  });
