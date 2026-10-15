import { useRef } from 'react';

/**
 * Gives focus back to whatever had it when a dialog opened.
 *
 * Radix returns focus only to the dialog's own Trigger. The editor opens
 * most dialogs from somewhere else (a menu item, a shortcut, a button in
 * another region), and then focus fell to <body>, so a keyboard user lost
 * their place. `capture` runs as the dialog opens, before focus moves in;
 * `restore` runs as it closes, and defers to Radix (its Trigger) when the
 * opener has gone or was <body>.
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    capture() {
      const active = document.activeElement;
      opener.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
    },
    restore(event: Event) {
      const target = opener.current;
      opener.current = null;
      if (!target?.isConnected) return;
      event.preventDefault();
      target.focus();
    },
  };
}
