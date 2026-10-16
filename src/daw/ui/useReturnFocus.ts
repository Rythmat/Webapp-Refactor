import { useRef } from 'react';

/**
 * When focus sits in a Radix menu, that menu's trigger (named by the
 * content's aria-labelledby); otherwise null. A dialog opened from a menu
 * item gives focus back there, not to the menu item that is about to go.
 */
export function menuOpener(
  active: Element | null = document.activeElement,
): HTMLElement | null {
  const menu = active?.closest('[role=menu]');
  const triggerId = menu?.getAttribute('aria-labelledby');
  if (!triggerId) return null;
  const trigger = document.getElementById(triggerId);
  return trigger instanceof HTMLElement && trigger.isConnected ? trigger : null;
}

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
