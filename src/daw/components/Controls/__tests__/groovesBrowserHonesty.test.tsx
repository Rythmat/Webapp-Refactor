// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { GROOVES, GROOVE_GENRES } from '@/daw/data/groovesLibrary';

// ── The Grooves browser shows only controls that do something ──────────────
// "Your Library", the row checkboxes, the preview's Loop and Volume, the row
// ⋮ button and the Name sort arrows changed nothing, and four genres had no
// grooves at all (dock-instruments-11).

// No engine: previewing a groove only opens the preview bar.
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: new Map(),
}));

import { GroovesBrowser } from '../GroovesBrowser';

afterEach(cleanup);

const firstRow = () =>
  screen.getAllByTitle('Add to track')[0].closest('div.group') as HTMLElement;

describe('GroovesBrowser', () => {
  it('has no Your Library filter and no Selection column', () => {
    render(<GroovesBrowser trackId="drums" />);
    expect(screen.queryByText('Your Library')).toBeNull();
    expect(screen.queryByText('Selection')).toBeNull();
    // Saved still filters the list, so it stays.
    expect(screen.getByRole('button', { name: /Saved/ })).toBeInTheDocument();
  });

  it('gives each groove only Play, Save and Add', () => {
    render(<GroovesBrowser trackId="drums" />);
    const buttons = within(firstRow()).getAllByRole('button');
    // Play, the heart and Add to track: no checkbox, no ⋮ menu.
    expect(buttons).toHaveLength(3);
    expect(buttons[2]).toHaveAttribute('title', 'Add to track');
  });

  it('opens a preview bar without Loop or Volume', () => {
    const { container } = render(<GroovesBrowser trackId="drums" />);
    fireEvent.click(within(firstRow()).getAllByRole('button')[0]);

    // The bar shows the groove's name a second time, with its own Add.
    expect(screen.getAllByText(GROOVES[0].name)).toHaveLength(2);
    expect(screen.getAllByTitle('Add to track')).toHaveLength(
      GROOVES.length + 1,
    );
    expect(screen.queryByTitle('Loop')).toBeNull();
    expect(container.querySelector('input[type="range"]')).toBeNull();
  });

  it('offers only genres that have grooves, and each one lists some', () => {
    render(<GroovesBrowser trackId="drums" />);
    const genre = screen.getByRole('combobox', { name: 'Genre' });
    const options = within(genre)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(GROOVE_GENRES);
    for (const empty of ['Pop', 'Jazz', 'House', 'Afrobeat']) {
      expect(options).not.toContain(empty);
    }

    for (const name of options.filter((g) => g !== 'All')) {
      fireEvent.change(genre, { target: { value: name } });
      expect(screen.queryByText('No grooves found')).toBeNull();
    }
  });

  it('names the BPM filter, so it keeps a name once a tempo is chosen', () => {
    render(<GroovesBrowser trackId="drums" />);
    const bpm = screen.getByRole('combobox', { name: 'BPM' });
    const tempo = within(bpm).getAllByRole('option')[1] as HTMLOptionElement;
    fireEvent.change(bpm, { target: { value: tempo.value } });
    expect(screen.getByRole('combobox', { name: 'BPM' })).toHaveValue(
      tempo.value,
    );
  });

  it('has one Sort option per order, and shows the one chosen', () => {
    render(<GroovesBrowser trackId="drums" />);
    const sort = screen.getByRole('combobox', {
      name: 'Sort grooves',
    }) as HTMLSelectElement;
    expect(
      within(sort)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Newest', 'Oldest', 'Alphabetical']);

    fireEvent.change(sort, { target: { value: 'oldest' } });
    fireEvent.change(sort, { target: { value: 'newest' } });
    expect(sort.selectedOptions[0].textContent).toBe('Newest');
  });
});

describe('GROOVE_GENRES', () => {
  it('lists every genre in the catalog, once, after All', () => {
    const inCatalog = new Set(GROOVES.map((g) => g.genre));
    expect(GROOVE_GENRES[0]).toBe('All');
    expect(new Set(GROOVE_GENRES.slice(1))).toEqual(inCatalog);
    expect(GROOVE_GENRES).toHaveLength(inCatalog.size + 1);
  });
});
