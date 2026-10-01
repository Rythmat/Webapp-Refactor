// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const MINUTE = 60_000;
const BREAK_TEXT =
  'You have worked on barre chords for 10 minutes. Shake out your hand and rest for a minute.';

// The chip's "once per session" lives in the module: a fresh copy per test is
// a fresh session.
let chip: typeof import('../HandCareChip');
beforeEach(async () => {
  vi.resetModules();
  chip = await import('../HandCareChip');
});

describe('HandCareChip', () => {
  it('appears after ten minutes of barre looping', () => {
    const { HandCareChip } = chip;
    const { rerender } = render(
      <HandCareChip loopingMsOnBarreSteps={10 * MINUTE - 1} />,
    );
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<HandCareChip loopingMsOnBarreSteps={10 * MINUTE} />);
    expect(screen.getByRole('status').textContent).toContain(BREAK_TEXT);
  });

  it('stays gone once dismissed, for the rest of the session', () => {
    const { HandCareChip } = chip;
    const { rerender, unmount } = render(
      <HandCareChip loopingMsOnBarreSteps={11 * MINUTE} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss break reminder' }),
    );
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<HandCareChip loopingMsOnBarreSteps={25 * MINUTE} />);
    expect(screen.queryByRole('status')).toBeNull();
    unmount();
    // Another step, same session.
    render(<HandCareChip loopingMsOnBarreSteps={30 * MINUTE} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('comes back after a remount until it is dismissed', () => {
    const { HandCareChip } = chip;
    const { unmount } = render(
      <HandCareChip loopingMsOnBarreSteps={10 * MINUTE} />,
    );
    unmount();
    render(<HandCareChip loopingMsOnBarreSteps={10 * MINUTE} />);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});

describe('useBarreLoopingMs', () => {
  it('adds up looping time across runs while active, for the session', () => {
    vi.useFakeTimers();
    const { useBarreLoopingMs } = chip;
    const { result, rerender, unmount } = renderHook(
      ({ active }) => useBarreLoopingMs(active),
      { initialProps: { active: true } },
    );
    act(() => vi.advanceTimersByTime(6 * MINUTE));
    expect(result.current).toBe(6 * MINUTE);

    // Stopping keeps the partial interval; time off the loop doesn't count.
    act(() => vi.advanceTimersByTime(5_000));
    rerender({ active: false });
    expect(result.current).toBe(6 * MINUTE + 5_000);
    act(() => vi.advanceTimersByTime(20 * MINUTE));
    expect(result.current).toBe(6 * MINUTE + 5_000);
    unmount();

    // A later run (another barre step) carries on from the session total.
    const next = renderHook(() => useBarreLoopingMs(true));
    expect(next.result.current).toBe(6 * MINUTE + 5_000);
    act(() => vi.advanceTimersByTime(4 * MINUTE));
    expect(next.result.current).toBeGreaterThanOrEqual(10 * MINUTE);
  });
});
