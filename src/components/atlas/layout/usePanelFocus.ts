import { useLayoutEffect, useRef, type RefObject } from 'react';

/** The heading a panel takes focus on. AtlasPanel marks its title. */
export const PANEL_HEADING_SELECTOR = '[data-atlas-panel-heading]';

/**
 * Controls that keep focus when a panel opens because of them: Back, Forward
 * and the trail. Someone walking their history with the keyboard stays on
 * the arrows instead of being pulled into each panel along the way.
 */
const KEEP_FOCUS_SELECTOR = '[data-atlas-keep-focus]';

const focusLost = () =>
  !document.activeElement || document.activeElement === document.body;

/**
 * Focus for a panel zone (the left column, the phone sheet):
 *
 * - opening moves focus to the panel's heading, remembering what had it;
 * - closing gives focus back to that opener, if focus went down with the
 *   panel (a Close button, Escape) rather than somewhere else on purpose;
 * - when the content changes under the focus (an artist link in an event
 *   card opens that artist's panel, unmounting the link), the new heading
 *   takes it, so the keyboard is never dropped on the page body.
 *
 * Opening moves focus only when something on the page had it: a keyboard or
 * screen-reader user always has a focused control when they open a panel.
 * A deep link opening a panel as the page loads, or a click on the globe's
 * canvas (which takes no focus), leaves focus where it is.
 */
export function usePanelFocus(
  zoneRef: RefObject<HTMLElement>,
  open: boolean,
  contentKey: string | null,
): void {
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(open);
  const lastKey = useRef(contentKey);

  useLayoutEffect(() => {
    const zone = zoneRef.current;
    const heading = () =>
      zone?.querySelector<HTMLElement>(PANEL_HEADING_SELECTOR) ?? null;

    if (open && !wasOpen.current) {
      const active = document.activeElement as HTMLElement | null;
      opener.current = active && active !== document.body ? active : null;
      if (opener.current && !active?.closest(KEEP_FOCUS_SELECTOR)) {
        heading()?.focus({ preventScroll: true });
      }
    } else if (!open && wasOpen.current) {
      const back = opener.current;
      opener.current = null;
      const focusInZone =
        !!zone && zone.contains(document.activeElement as Node | null);
      if (back?.isConnected && (focusLost() || focusInZone)) {
        back.focus({ preventScroll: true });
      }
    } else if (open && contentKey !== lastKey.current && focusLost()) {
      heading()?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
    lastKey.current = contentKey;
  }, [open, contentKey, zoneRef]);
}
