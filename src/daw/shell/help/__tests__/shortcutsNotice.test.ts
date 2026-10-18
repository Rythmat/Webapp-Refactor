// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/util/toast', () => ({
  showNotice: vi.fn(() => 'notice-1'),
  dismissToast: vi.fn(),
}));

import { dismissToast, showNotice } from '@/util/toast';
import { showShortcutsNotice } from '../shortcutsNotice';
import { useShortcutSheetStore } from '../useShortcutSheetStore';

// ── "Shortcuts changed", once per student (milestones 1.6 and 2.11) ─────────
// The notice goes as soon as the '?' sheet opens, however it opens: it
// would cover the sheet's footer, and its Show shortcuts is done.
//
// Run: npx vitest run src/daw/shell/help/__tests__/shortcutsNotice.test.ts

afterEach(() => {
  vi.mocked(showNotice).mockClear();
  vi.mocked(dismissToast).mockClear();
  useShortcutSheetStore.setState({ isOpen: false });
});

describe('the shortcuts notice', () => {
  it('is dismissed when the sheet opens, and only once', () => {
    showShortcutsNotice();
    expect(showNotice).toHaveBeenCalledTimes(1);
    expect(dismissToast).not.toHaveBeenCalled();
    // '?' while it is up.
    useShortcutSheetStore.getState().open();
    expect(dismissToast).toHaveBeenCalledWith('notice-1');
    useShortcutSheetStore.getState().close();
    useShortcutSheetStore.getState().open();
    expect(dismissToast).toHaveBeenCalledTimes(1);
  });

  it('opens the sheet from its action, which dismisses it too', () => {
    showShortcutsNotice();
    const options = vi.mocked(showNotice).mock.calls[0]![1]!;
    options.action!.onClick();
    expect(useShortcutSheetStore.getState().isOpen).toBe(true);
    expect(dismissToast).toHaveBeenCalledWith('notice-1');
  });
});
