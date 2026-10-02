// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clampPanelWidth,
  GRAPH_DRAWER_WIDTH_KEY,
  PANEL_WIDTH,
  PanelFrame,
  usePanelWidth,
} from '../panel/PanelFrame';

/**
 * The row panel's frame: beside the grid (or the graph) from xl up, a sheet
 * below; and, where the graph shows it, a left edge that resizes it between
 * 360 and 720 px — dragged, or with the keyboard — remembered in the
 * browser. The Table's panel, given no width, is as it always was.
 */

let wide = true;

beforeEach(() => {
  wide = true;
  window.localStorage.clear();
  window.matchMedia = ((query: string) => ({
    matches: wide && query === '(min-width: 1280px)',
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Body = (heading: (text: string) => React.ReactNode) => (
  <>
    {heading('Toto')}
    <p>Body</p>
  </>
);

/** The graph's drawer: its width kept by `usePanelWidth`. */
const Resizable = ({ onClose = () => {} }: { onClose?(): void }) => {
  const [width, setWidth] = usePanelWidth(GRAPH_DRAWER_WIDTH_KEY);
  return (
    <PanelFrame onClose={onClose} width={width} onWidthChange={setWidth}>
      {(heading) => Body(heading)}
    </PanelFrame>
  );
};

const handle = () =>
  screen.getByRole('separator', { name: 'Resize the panel' });
const widthNow = () => Number(handle().getAttribute('aria-valuenow'));
const stored = () => window.localStorage.getItem(GRAPH_DRAWER_WIDTH_KEY);

describe('the frame', () => {
  it('is 440 px beside the grid, with no handle, when given no width', () => {
    render(
      <PanelFrame onClose={() => {}}>{(heading) => Body(heading)}</PanelFrame>,
    );
    const aside = screen.getByRole('complementary', { name: 'Toto' });
    expect(aside.className).toContain('w-[440px]');
    expect(aside.getAttribute('style')).toBeNull();
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('takes a width beside the graph', () => {
    render(
      <PanelFrame onClose={() => {}} width={512}>
        {(heading) => Body(heading)}
      </PanelFrame>,
    );
    const aside = screen.getByRole('complementary', { name: 'Toto' });
    expect(aside.style.width).toBe('512px');
    // A width alone does not make it resizable.
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('is the sheet below xl, at its own width and with no handle', () => {
    wide = false;
    render(<Resizable />);
    expect(screen.getByRole('dialog', { name: 'Toto' })).toBeDefined();
    expect(screen.queryByRole('separator')).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});

describe('resizing beside the graph', () => {
  it('opens at 440 px, and says its range', () => {
    render(<Resizable />);
    expect(widthNow()).toBe(PANEL_WIDTH.initial);
    expect(handle().getAttribute('aria-valuemin')).toBe('360');
    expect(handle().getAttribute('aria-valuemax')).toBe('720');
    expect(handle().getAttribute('aria-orientation')).toBe('vertical');
    expect(handle().getAttribute('aria-valuetext')).toBe('440 pixels wide');
    expect(handle().tabIndex).toBe(0);
    expect(
      screen.getByRole('complementary', { name: 'Toto' }).style.width,
    ).toBe('440px');
  });

  it('widens with ←, narrows with →, Shift for four steps, Home and End for the ends', () => {
    render(<Resizable />);
    fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
    expect(widthNow()).toBe(456);
    expect(stored()).toBe('456');
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    expect(widthNow()).toBe(424);
    fireEvent.keyDown(handle(), { key: 'ArrowLeft', shiftKey: true });
    expect(widthNow()).toBe(488);
    fireEvent.keyDown(handle(), { key: 'Home' });
    expect(widthNow()).toBe(360);
    // Never narrower than 360…
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    expect(widthNow()).toBe(360);
    fireEvent.keyDown(handle(), { key: 'End' });
    expect(widthNow()).toBe(720);
    // …nor wider than 720.
    fireEvent.keyDown(handle(), { key: 'ArrowLeft', shiftKey: true });
    expect(widthNow()).toBe(720);
    expect(stored()).toBe('720');
    expect(
      screen.getByRole('complementary', { name: 'Toto' }).style.width,
    ).toBe('720px');
  });

  it('leaves other keys alone, and Esc still closes the panel', () => {
    const onClose = vi.fn();
    render(<Resizable onClose={onClose} />);
    fireEvent.keyDown(handle(), { key: 'a' });
    expect(widthNow()).toBe(440);
    expect(stored()).toBeNull();
    fireEvent.keyDown(handle(), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('follows a drag of its left edge', () => {
    render(<Resizable />);
    // React reads pointer events by their type; a mouse event of that type
    // carries the coordinates in jsdom.
    const pointer = (type: string, clientX: number) =>
      act(() => {
        handle().dispatchEvent(
          new MouseEvent(type, { bubbles: true, clientX, button: 0 }),
        );
      });
    pointer('pointerdown', 1000);
    pointer('pointermove', 900);
    expect(widthNow()).toBe(540);
    pointer('pointermove', 1100);
    expect(widthNow()).toBe(360);
    pointer('pointerup', 1100);
    // Released: moving on does nothing.
    pointer('pointermove', 600);
    expect(widthNow()).toBe(360);
    expect(stored()).toBe('360');
  });

  it('opens at the width it was left at', () => {
    window.localStorage.setItem(GRAPH_DRAWER_WIDTH_KEY, '600');
    render(<Resizable />);
    expect(widthNow()).toBe(600);
  });

  it('falls back to 440 px on a stored value that is not a width, and brings one outside the range in', () => {
    for (const [value, width] of [
      ['abc', 440],
      ['', 440],
      ['440px', 440],
      ['9999', 720],
      ['12', 360],
      ['500.6', 501],
    ] as const) {
      window.localStorage.setItem(GRAPH_DRAWER_WIDTH_KEY, value);
      render(<Resizable />);
      expect(widthNow(), value).toBe(width);
      cleanup();
    }
  });

  it('still resizes when the browser refuses storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<Resizable />);
    expect(widthNow()).toBe(440);
    fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
    expect(widthNow()).toBe(456);
  });

  it('clamps to whole pixels inside the range', () => {
    expect(clampPanelWidth(100)).toBe(360);
    expect(clampPanelWidth(1000)).toBe(720);
    expect(clampPanelWidth(450.4)).toBe(450);
  });
});
