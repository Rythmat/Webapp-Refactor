// ── Shortcut labels for the student's keyboard (milestone 1.4) ─────────────
//
// The editor's shortcuts take either modifier (the dispatcher reads
// metaKey || ctrlKey), but a label should name the key the student has:
// ⌘ on a Mac, Ctrl on a Chromebook or a Windows laptop. Tooltips and
// aria-keyshortcuts get theirs from the command registry
// (commands/shortcuts.ts), which asks this which keyboard it is.

interface NavigatorLike {
  platform?: string;
  userAgent?: string;
  userAgentData?: { platform?: string };
}

/** Whether the keyboard has ⌘ (macOS, iPadOS, iOS). */
export function isApplePlatform(
  nav: NavigatorLike | undefined = readNavigator(),
): boolean {
  if (!nav) return false;
  const platform = nav.userAgentData?.platform || nav.platform || '';
  if (platform) return /mac|iphone|ipad|ipod/i.test(platform);
  return /Macintosh|iPhone|iPad|iPod/.test(nav.userAgent ?? '');
}

function readNavigator(): NavigatorLike | undefined {
  return typeof navigator === 'undefined'
    ? undefined
    : (navigator as unknown as NavigatorLike);
}

export interface ShortcutKeys {
  /** The visible label: '⌘Z', '⇧⌘Z', 'Ctrl+Z', 'Ctrl+Shift+Z'. */
  label: string;
  /** The aria-keyshortcuts value: 'Meta+Z', 'Control+Shift+Z'. */
  aria: string;
}
