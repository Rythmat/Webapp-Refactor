// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlertDialog } from '../alert-dialog';
import { Dialog } from '../dialog';

// ── The kit's dialog roots outlive nothing ──────────────────────────────────
// Each root clears the body's pointer-events every 100 ms for a second after
// any click on <body>. A test file whose last click came less than a second
// before its jsdom was torn down used to fail the whole run with "document
// is not defined" from that timer (StudioProduction, TableDetailPanel).

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  cleanup();
});

describe.each([
  ['Dialog', () => <Dialog />],
  ['AlertDialog', () => <AlertDialog />],
])('%s', (_, root) => {
  it('stops its timer quietly once the page is gone', () => {
    vi.useFakeTimers();
    render(root());
    fireEvent.click(document.body);
    document.body.style.pointerEvents = 'none';
    vi.advanceTimersByTime(100);
    expect(document.body.style.pointerEvents).toBe('');

    vi.stubGlobal('document', undefined);
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
