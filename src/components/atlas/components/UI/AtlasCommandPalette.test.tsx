// @vitest-environment jsdom
/**
 * The command palette: ⌘K / Ctrl+K opens it with focus in its field, typing
 * filters it, Enter runs the highlighted row, and closing hands focus back
 * to whatever opened it.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import { AtlasToolbar } from './AtlasToolbar';

afterEach(cleanup);

// cmdk keeps the highlighted row in view; jsdom has no layout to scroll.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

function setup() {
  const store = createAtlasStore();
  const where = { search: '' };
  const Where = () => {
    where.search = useLocation().search;
    return null;
  };
  render(
    <MemoryRouter initialEntries={['/atlas/globe']}>
      <AtlasStoreProvider store={store}>
        <AtlasNavigationProvider>
          <AtlasToolbar />
          <Where />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return { store, where };
}

const pressCtrlK = () =>
  act(() => {
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  });

const field = () =>
  screen.getByRole('combobox', { name: 'Search the globe or run a command' });

describe('command palette', () => {
  it('opens on Ctrl+K with focus in its field', async () => {
    setup();
    pressCtrlK();
    const dialog = await screen.findByRole('dialog', {
      name: 'Search the globe',
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(field()).toHaveFocus());
    // Opens on the actions, among the rest.
    expect(
      screen.getByRole('option', { name: /Spin the globe/ }),
    ).toBeInTheDocument();
  });

  it('filters as you type, runs an action, and returns focus', async () => {
    const { store } = setup();
    const button = screen.getByRole('button', { name: 'Search the globe' });
    button.focus();
    fireEvent.click(button);
    await screen.findByRole('dialog');

    fireEvent.change(field(), { target: { value: 'spin' } });
    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: /Copy link/ }),
      ).not.toBeInTheDocument(),
    );
    const spin = screen.getByRole('option', { name: /Spin the globe/ });
    // The first row is highlighted, and the field says so.
    await waitFor(() =>
      expect(field()).toHaveAttribute('aria-activedescendant', spin.id),
    );

    fireEvent.keyDown(field(), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(store.api.getState().globeRotating).toBe(true));
    expect(button).toHaveFocus();
  });

  it('moves the highlight with the arrow keys', async () => {
    setup();
    pressCtrlK();
    await screen.findByRole('dialog');
    const options = await screen.findAllByRole('option');
    await waitFor(() =>
      expect(field()).toHaveAttribute('aria-activedescendant', options[0].id),
    );
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    await waitFor(() =>
      expect(field()).toHaveAttribute('aria-activedescendant', options[1].id),
    );
  });

  it('opens a search result exactly as the search field did', async () => {
    const { where } = setup();
    pressCtrlK();
    await screen.findByRole('dialog');
    fireEvent.change(field(), { target: { value: 'new orleans' } });
    // The place leads; a tour of it comes further down.
    const [place] = await screen.findAllByRole('option', {
      name: /^New Orleans/,
    });
    fireEvent.click(place);
    await waitFor(() => expect(where.search).toContain('place=city'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('closes on Escape and gives focus back to the opener', async () => {
    setup();
    const button = screen.getByRole('button', { name: 'Search the globe' });
    button.focus();
    pressCtrlK();
    await screen.findByRole('dialog');
    await waitFor(() => expect(field()).toHaveFocus());
    fireEvent.keyDown(field(), { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(button).toHaveFocus();
  });

  it('opens Layers from the palette', async () => {
    const { store } = setup();
    pressCtrlK();
    await screen.findByRole('dialog');
    fireEvent.change(field(), { target: { value: 'layers' } });
    fireEvent.click(await screen.findByRole('option', { name: /Open Layers/ }));
    await waitFor(() => expect(store.api.getState().layersOpen).toBe(true));
  });
});
