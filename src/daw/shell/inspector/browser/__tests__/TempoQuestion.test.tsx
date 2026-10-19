// @vitest-environment jsdom
/**
 * A groove at another tempo asks first (milestone 2.14): Change · Keep ·
 * Cancel, asked in the panel. Escape is Cancel and stays the question's (the
 * editor's Escape, Stop, never sees it); any other key goes on as usual. An
 * answer takes the question down and puts focus back on the row's +, or on
 * the search when the row is gone.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { useBrowserStore } from '../browserStore';
import { TempoQuestion } from '../TempoQuestion';

const ITEM = 'groove:groove-hiphop-1';

function Panel({
  onKeyDown,
  withRow = true,
}: {
  onKeyDown?: (e: React.KeyboardEvent) => void;
  withRow?: boolean;
}) {
  return (
    <div onKeyDown={onKeyDown}>
      <input data-testid="library-search" type="search" />
      {withRow ? (
        <ul>
          <li data-item-id={ITEM}>
            <button type="button" data-testid="library-add">
              +
            </button>
          </li>
        </ul>
      ) : null}
      <TempoQuestion />
    </div>
  );
}

function ask() {
  const answer = vi.fn();
  act(() =>
    useBrowserStore.getState().ask({
      itemId: ITEM,
      name: 'Hip Hop 1',
      itemBpm: 60,
      songBpm: 120,
      answer,
    }),
  );
  return answer;
}

beforeAll(() => {
  installDomShims();
  // jsdom has no CSS.escape, which the focus return uses.
  if (typeof globalThis.CSS === 'undefined') {
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: { escape: (s: string) => s.replace(/["\\]/g, '\\$&') },
    });
  }
});

beforeEach(() => {
  useBrowserStore.setState({ question: null });
});

afterEach(cleanup);

describe('the tempo question', () => {
  it('cancels on Escape, and the Escape goes no further', () => {
    const parent = vi.fn();
    render(<Panel onKeyDown={parent} />);
    const answer = ask();
    const change = screen.getByTestId('library-tempo-change');

    // Any other key goes on as usual.
    fireEvent.keyDown(change, { key: 'ArrowDown' });
    expect(parent).toHaveBeenCalledTimes(1);
    expect(answer).not.toHaveBeenCalled();

    fireEvent.keyDown(change, { key: 'Escape' });
    expect(answer).toHaveBeenCalledTimes(1);
    expect(answer).toHaveBeenCalledWith(null);
    expect(useBrowserStore.getState().question).toBeNull();
    expect(screen.queryByTestId('library-tempo-question')).toBeNull();
    expect(parent).toHaveBeenCalledTimes(1);
  });

  it('puts focus back on the row’s + after an answer', async () => {
    render(<Panel />);
    const answer = ask();
    fireEvent.click(screen.getByTestId('library-tempo-keep'));
    expect(answer).toHaveBeenCalledWith(false);
    expect(useBrowserStore.getState().question).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId('library-add')),
    );
  });

  it('puts focus on the search when the row is gone', async () => {
    render(<Panel withRow={false} />);
    const answer = ask();
    fireEvent.click(screen.getByTestId('library-tempo-cancel'));
    expect(answer).toHaveBeenCalledWith(null);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId('library-search')),
    );
  });
});
