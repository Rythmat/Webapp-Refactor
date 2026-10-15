import { useEffect } from 'react';
import { userNamespace } from '@/daw/persistence/storageNamespace';
import { isOpening, useSessionStore } from '@/daw/session/sessionStore';
import { isApplePlatform } from '@/daw/shell/topbar/platformKeys';
import { useStore } from '@/daw/store';
import { showNotice } from '@/util/toast';
import { useShortcutSheetStore } from './useShortcutSheetStore';

// ── "Shortcuts changed", once per student (milestone 1.6) ──────────────────
//
// Keys now follow the area the student is working in, ⌘+ and ⌘− zoom the
// page again rather than the timeline, and the computer keyboard plays notes
// only once it is turned on. A student used to the old keys is told once,
// with a way to the '?' sheet. Never during a lesson, whose coach card is
// what the student should be reading; they are told the next time instead.

const NOTICE_PREFIX = 'musicAtlas:daw:shortcutsNotice:';

/** Waits this long after the editor is ready, so it isn't lost in the boot. */
const NOTICE_DELAY_MS = 1500;

export function shortcutsNoticeKey(userId: string | null): string {
  return `${NOTICE_PREFIX}${userNamespace(userId)}`;
}

function seen(userId: string | null): boolean {
  try {
    return localStorage.getItem(shortcutsNoticeKey(userId)) !== null;
  } catch {
    // Storage closed to this page: don't nag on every open.
    return true;
  }
}

function markSeen(userId: string | null): void {
  try {
    localStorage.setItem(shortcutsNoticeKey(userId), '1');
  } catch {
    // Nothing to keep it in; it shows again next time.
  }
}

export function showShortcutsNotice(): void {
  const zoom = isApplePlatform() ? '⌘+ and ⌘−' : 'Ctrl+ and Ctrl−';
  showNotice('Keyboard shortcuts now follow where you’re working', {
    description: `Delete in the Score deletes notes, not your clips. ${zoom} zoom the page again. Press \` to play notes from your keyboard.`,
    action: {
      label: 'Show shortcuts',
      onClick: () => useShortcutSheetStore.getState().open(),
    },
  });
}

/**
 * Shows the notice once the editor is ready, for a student who hasn't had
 * it. DawApp calls it with whose editor it is, once that is known.
 */
export function useShortcutsNotice(
  userId: string | null,
  ownerKnown: boolean,
): void {
  const phase = useSessionStore((s) => s.phase);
  const inLesson = useStore((s) => s.activeTutorialId !== null);
  useEffect(() => {
    if (!ownerKnown || inLesson || isOpening() || seen(userId)) return;
    const timer = window.setTimeout(() => {
      if (isOpening() || useStore.getState().activeTutorialId !== null) return;
      if (seen(userId)) return;
      markSeen(userId);
      showShortcutsNotice();
    }, NOTICE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [userId, ownerKnown, inLesson, phase]);
}
