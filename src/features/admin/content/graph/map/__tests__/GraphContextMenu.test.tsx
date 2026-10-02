// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityId, GraphNode } from '@/content/graph/types';
import {
  GraphContextMenu,
  type GraphContextMenuProps,
  localGraphLink,
} from '../GraphContextMenu';

/**
 * The right-click menu over a stand-in stage. The hit test is a stub: Toto
 * sits left of x = 100, Mellow (a vibe, which no table holds) right of
 * x = 400, Ghost (an artist something links to but nothing defines) below
 * y = 900, and between them is empty background.
 */

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const node = (id: string, label: string, status = 'published'): GraphNode =>
  ({
    id,
    kind: id.split(':')[0],
    label,
    status,
    origin: 'code',
  }) as GraphNode;

const nodes = new Map<EntityId, GraphNode>(
  [
    node('artist:toto', 'Toto'),
    node('vibe:mellow', 'Mellow'),
    node('artist:ghost', 'Ghost', 'missing'),
  ].map((n) => [n.id, n]),
);

const hitTest = vi.fn((x: number, y: number): string | null =>
  y > 900
    ? 'artist:ghost'
    : x < 100
      ? 'artist:toto'
      : x > 400
        ? 'vibe:mellow'
        : null,
);

let location = '';
const Where = () => {
  const { pathname, search } = useLocation();
  location = `${pathname}${search}`;
  return null;
};

const show = (props: Partial<GraphContextMenuProps> = {}) => {
  const handlers = {
    onLocalGraph: vi.fn(),
    onFit: vi.fn(),
    onResetZoom: vi.fn(),
  };
  render(
    <MemoryRouter initialEntries={['/console/cortex']}>
      <GraphContextMenu
        hitTest={hitTest}
        nodes={nodes}
        {...handlers}
        {...props}
      >
        <div data-testid="stage" tabIndex={0} />
      </GraphContextMenu>
      <Where />
    </MemoryRouter>,
  );
  return handlers;
};

const rightClick = (clientX: number, clientY = 50) =>
  fireEvent.contextMenu(screen.getByTestId('stage'), {
    clientX,
    clientY,
    button: 2,
  });

const items = () =>
  screen.getAllByRole('menuitem').map((item) => item.textContent);

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  hitTest.mockClear();
  toast.success.mockClear();
  toast.error.mockClear();
});

describe('the graph’s right-click menu', () => {
  it('offers a dot’s row, its page, its local graph and its link', () => {
    show();
    rightClick(50, 60);
    expect(hitTest).toHaveBeenCalledWith(50, 60);
    expect(screen.getByRole('menu', { name: 'Toto, Artist' })).toBeTruthy();
    expect(items()).toEqual([
      'Open in Table',
      'Open page',
      'Local graph',
      'Copy link',
      'Copy id',
    ]);
    expect(
      screen
        .getByRole('menuitem', { name: 'Open in Table' })
        .getAttribute('href'),
    ).toBe('/console/table/artists/toto');
    expect(
      screen.getByRole('menuitem', { name: 'Open page' }).getAttribute('href'),
    ).toBe('/console/content/atlas/globe?artist=Toto');
  });

  it('opens the row it names', () => {
    show();
    rightClick(50);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open in Table' }));
    expect(location).toBe('/console/table/artists/toto');
  });

  it('opens the local graph of the dot', () => {
    const { onLocalGraph } = show();
    rightClick(50);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Local graph' }));
    expect(onLocalGraph).toHaveBeenCalledWith('artist:toto');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('copies an absolute link to the local graph, and the id', async () => {
    show();
    rightClick(50);
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Copy link' }));
    });
    const link = `${window.location.origin}/console/cortex?focus=artist%3Atoto`;
    expect(localGraphLink('artist:toto')).toBe(link);
    expect(writeText).toHaveBeenLastCalledWith(link);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Link copied'),
    );

    rightClick(50);
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Copy id' }));
    });
    expect(writeText).toHaveBeenLastCalledWith('artist:toto');
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Id copied'),
    );
  });

  it('says so when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    show();
    rightClick(50);
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Copy id' }));
    });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not copy the id'),
    );
  });

  it('leaves out what a dot does not have', () => {
    show();
    rightClick(500);
    // A vibe has no row in the Table and no page in the app.
    expect(items()).toEqual(['Local graph', 'Copy link', 'Copy id']);
  });

  it('offers no page for a missing item, which has none', () => {
    show();
    rightClick(250, 950);
    expect(screen.getByRole('menu', { name: 'Ghost, Artist' })).toBeTruthy();
    // Its row is still in the Table (as a missing row), but no page exists.
    expect(items()).toEqual([
      'Open in Table',
      'Local graph',
      'Copy link',
      'Copy id',
    ]);
  });

  it('offers no page for an id the graph does not hold', () => {
    hitTest.mockReturnValueOnce('song:nowhere');
    show();
    rightClick(250);
    expect(items()).toEqual([
      'Open in Table',
      'Local graph',
      'Copy link',
      'Copy id',
    ]);
  });

  it('offers Fit and Reset zoom on empty background', () => {
    const { onFit, onResetZoom } = show();
    rightClick(250);
    expect(screen.getByRole('menu', { name: 'The graph' })).toBeTruthy();
    expect(items()).toEqual(['Fit', 'Reset zoom']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Fit' }));
    expect(onFit).toHaveBeenCalled();

    rightClick(250);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reset zoom' }));
    expect(onResetZoom).toHaveBeenCalled();
  });

  it('is for the current node when opened from the keyboard', () => {
    show({ currentId: 'artist:toto' });
    // The Menu key in Firefox: button 0 with no button held, at no pointer.
    fireEvent.contextMenu(screen.getByTestId('stage'), {
      clientX: 0,
      clientY: 0,
      button: 0,
      buttons: 0,
    });
    expect(hitTest).not.toHaveBeenCalled();
    expect(screen.getByRole('menu', { name: 'Toto, Artist' })).toBeTruthy();
  });

  it('is for the current node from Chrome’s Menu key too (button -1)', () => {
    show({ currentId: 'artist:toto' });
    // Chrome puts a keyboard menu at the middle of the focused element.
    fireEvent.contextMenu(screen.getByTestId('stage'), {
      clientX: 500,
      clientY: 50,
      button: -1,
      buttons: 0,
    });
    expect(hitTest).not.toHaveBeenCalled();
    expect(screen.getByRole('menu', { name: 'Toto, Artist' })).toBeTruthy();
  });

  it('hit-tests a Mac Control-click, whatever the keyboard’s current node', () => {
    show({ currentId: 'artist:toto' });
    // Control-click on a Mac: the main button, held down, with Control.
    fireEvent.contextMenu(screen.getByTestId('stage'), {
      clientX: 500,
      clientY: 60,
      button: 0,
      buttons: 1,
      ctrlKey: true,
    });
    expect(hitTest).toHaveBeenCalledWith(500, 60);
    expect(screen.getByRole('menu', { name: 'Mellow, Vibe' })).toBeTruthy();
  });

  it('hit-tests a right-click already released (Windows), whatever the current node', () => {
    show({ currentId: 'artist:toto' });
    fireEvent.contextMenu(screen.getByTestId('stage'), {
      clientX: 500,
      clientY: 60,
      button: 2,
      buttons: 0,
    });
    expect(hitTest).toHaveBeenCalledWith(500, 60);
    expect(screen.getByRole('menu', { name: 'Mellow, Vibe' })).toBeTruthy();
  });

  it('stays shut while the graph is not drawn', () => {
    show({ disabled: true });
    rightClick(50);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('on a progression’s dot', () => {
  const progressions = new Map<EntityId, GraphNode>([
    ...nodes,
    [
      'progression:12' as EntityId,
      node('progression:12', '1 major7 - 4 major7'),
    ],
  ]);

  it('offers Tesseract, where a click goes, and the row here, where Cmd-click opens it', () => {
    const onOpenRow = vi.fn();
    show({
      nodes: progressions,
      currentId: 'progression:12',
      tesseractHref: (id) =>
        id.startsWith('progression:')
          ? '/console/cortex/tesseract/progressions/12?key=Eb&depth=2'
          : null,
      onOpenRow,
    });
    // From the keyboard: the current dot.
    fireEvent.contextMenu(screen.getByTestId('stage'), {
      button: -1,
      buttons: 0,
    });
    expect(items()).toEqual([
      'Open in Tesseract',
      'Open row here',
      'Open in Table',
      'Local graph',
      'Copy link',
      'Copy id',
    ]);
    expect(
      screen
        .getByRole('menuitem', { name: 'Open in Tesseract' })
        .getAttribute('href'),
    ).toBe('/console/cortex/tesseract/progressions/12?key=Eb&depth=2');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open row here' }));
    expect(onOpenRow).toHaveBeenCalledWith('progression:12');
  });

  it('offers neither on any other dot', () => {
    show({
      nodes: progressions,
      tesseractHref: () => null,
      onOpenRow: vi.fn(),
    });
    rightClick(50, 60);
    expect(items()).not.toContain('Open in Tesseract');
    expect(items()).not.toContain('Open row here');
  });
});
