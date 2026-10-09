import { afterEach, describe, expect, it } from 'vitest';
import { useProjectsDialogStore } from '../useProjectsDialogStore';

// ── The Projects dialog's open state (milestone 1.4, E16) ─────────────────
// Run: npx vitest run src/daw/shell/projects/__tests__/useProjectsDialogStore.test.ts

const s = () => useProjectsDialogStore.getState();

afterEach(() => {
  useProjectsDialogStore.setState(
    useProjectsDialogStore.getInitialState(),
    true,
  );
});

describe('useProjectsDialogStore', () => {
  it('starts closed, sorted by recent work', () => {
    expect(s().open).toBe(false);
    expect(s().sortBy).toBe('recent');
    expect(s().focusDraftId).toBeNull();
  });

  it('opens sorted by recent unless asked for size, with an optional focus', () => {
    s().openDialog({ sortBy: 'size', focusDraftId: 'd1' });
    expect(s().open).toBe(true);
    expect(s().sortBy).toBe('size');
    expect(s().focusDraftId).toBe('d1');
    s().close();
    s().openDialog();
    expect(s().open).toBe(true);
    expect(s().sortBy).toBe('recent');
    expect(s().focusDraftId).toBeNull();
  });

  it('clears the focus on close', () => {
    s().openDialog({ focusDraftId: 'd2' });
    s().close();
    expect(s().open).toBe(false);
    expect(s().focusDraftId).toBeNull();
  });
});
