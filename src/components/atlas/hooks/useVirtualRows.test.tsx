// @vitest-environment jsdom
/**
 * A long list renders only the rows near the viewport, yet the keyboard still
 * reaches every row — including ones that were never in the page.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { useVirtualRows, VIRTUALIZE_OVER } from './useVirtualRows';

// jsdom has no layout: give the scroller a height and each row one, which is
// all the virtualizer reads (offsetHeight).
const ROW = 40;
const VIEWPORT = 400;
let restore: () => void;
beforeAll(() => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight',
  );
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.hasAttribute('data-index')) return ROW;
      if (this.dataset.testid === 'scroller') return VIEWPORT;
      return 0;
    },
  });
  restore = () => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', original);
    }
  };
});
afterAll(() => restore());
afterEach(cleanup);

function List({ count, keep }: { count: number; keep?: number[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const list = useVirtualRows({
    count,
    enabled: count > VIRTUALIZE_OVER,
    scrollRef,
    listRef,
    estimateSize: ROW,
    keep,
  });
  return (
    <div ref={scrollRef} data-testid="scroller" style={{ overflowY: 'auto' }}>
      <ul
        ref={listRef}
        style={list.virtual ? { height: list.totalSize } : undefined}
        {...list.listProps}
      >
        {list.rows.map(({ index, top }) => (
          <li
            key={index}
            ref={list.measureElement}
            data-index={index}
            style={list.virtual ? { transform: `translateY(${top}px)` } : {}}
          >
            <button type="button">Row {index}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const rendered = (container: HTMLElement) =>
  container.querySelectorAll('[data-index]').length;
const focusedRow = () =>
  document.activeElement?.closest('[data-index]')?.getAttribute('data-index');

describe('useVirtualRows', () => {
  it('renders every row of a short list', () => {
    const { container } = render(<List count={VIRTUALIZE_OVER} />);
    expect(rendered(container)).toBe(VIRTUALIZE_OVER);
  });

  it('renders far fewer rows than a long list has', () => {
    const { container } = render(<List count={1000} />);
    const count = rendered(container);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(40);
  });

  it('keeps rows it is told to keep, wherever they are', () => {
    const { container } = render(<List count={1000} keep={[700]} />);
    expect(container.querySelector('[data-index="700"]')).not.toBeNull();
  });

  it('walks the keyboard from the first row to the last', async () => {
    const { container, getByText } = render(<List count={1000} />);
    getByText('Row 0').focus();

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(focusedRow()).toBe('1');

    await act(async () => {
      fireEvent.keyDown(document.activeElement!, { key: 'End' });
    });
    expect(focusedRow()).toBe('999');
    expect(rendered(container)).toBeLessThan(60);

    await act(async () => {
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    });
    expect(focusedRow()).toBe('998');

    await act(async () => {
      fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    });
    expect(focusedRow()).toBe('0');
  });
});
