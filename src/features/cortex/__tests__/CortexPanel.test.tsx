// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CortexPanel } from '../CortexPanel';
import type { CortexWeb, WebNode } from '../buildWeb';

const state = vi.hoisted(() => ({
  web: null as unknown,
  loading: false,
}));

vi.mock('../useCortexWeb', () => ({
  useCortexWeb: () => ({ web: state.web, loading: state.loading }),
}));
vi.mock('@/lib/local-store/userScope', () => ({
  getLocalStoreUserKey: () => 'student-1',
}));
// The map's own drawing is tried in the browser; here, a dot is a button.
vi.mock('../CortexMap', () => ({
  CortexMap: ({
    web,
    onSelect,
  }: {
    web: CortexWeb;
    onSelect: (id: string | null) => void;
  }) => (
    <div data-testid="whole-map">
      {web.nodes.map((n) => (
        <button key={n.id} data-node={n.id} onClick={() => onSelect(n.id)}>
          {n.label}
        </button>
      ))}
    </div>
  ),
}));

const node = (id: string, role: WebNode['role'] = 'activity'): WebNode => ({
  id,
  role,
  kind: role === 'activity' ? 'song' : 'genre',
  label: id,
  done: true,
  hollow: false,
  lastAt: 1,
  doneAt: 1,
  route: '/somewhere',
});

const smallWeb: CortexWeb = {
  nodes: [node('song:a'), node('song:b'), node('genre:funk', 'concept')],
  links: [
    {
      id: 'song:a>genre:funk',
      source: 'song:a',
      target: 'genre:funk',
      hollow: false,
    },
    {
      id: 'song:b>genre:funk',
      source: 'song:b',
      target: 'genre:funk',
      hollow: false,
    },
  ],
  activityCount: 2,
  connectionCount: 2,
};

const emptyWeb: CortexWeb = {
  nodes: [],
  links: [],
  activityCount: 0,
  connectionCount: 0,
};

const renderPanel = () =>
  render(
    <MemoryRouter>
      <CortexPanel />
    </MemoryRouter>,
  );

const nodeButton = (id: string) =>
  document.querySelector<HTMLElement>(`[data-node="${id}"]`)!;

beforeEach(() => {
  localStorage.clear();
  state.web = smallWeb;
  state.loading = false;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the Cortex panel', () => {
  it('opens on the map, the only view, with no switch and no core', () => {
    renderPanel();
    expect(screen.getByTestId('whole-map')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Orbit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Whole map' })).toBeNull();
  });

  it('says how much a node connects to, without inventing a score', () => {
    renderPanel();
    fireEvent.click(nodeButton('genre:funk'));
    expect(screen.getByText('Connected to 2 things')).toBeInTheDocument();
  });

  it('shows nothing while the account is loading', () => {
    state.web = emptyWeb;
    state.loading = true;
    renderPanel();
    expect(document.querySelector('[data-cortex-empty]')).not.toBeNull();
    expect(screen.queryByText('Your Cortex starts here')).toBeNull();
  });

  it('shows how it starts when there’s nothing yet', () => {
    state.web = emptyWeb;
    renderPanel();
    expect(screen.getByText('Your Cortex starts here')).toBeInTheDocument();
    expect(screen.queryByTestId('whole-map')).toBeNull();
  });

  it('reads the connections out, and the caption live', () => {
    renderPanel();
    expect(screen.getByText('song:a connects to genre:funk')).toBeTruthy();
    expect(screen.getByText('2 activities · 2 connections')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('closes the card on Escape when focus has left the panel', () => {
    renderPanel();
    fireEvent.click(nodeButton('song:a'));
    expect(screen.getByRole('complementary', { name: 'song:a' })).toBeTruthy();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'song:a' })).toBeNull();
  });

  it('closes the card on Escape, wherever focus is in the panel', () => {
    renderPanel();
    fireEvent.click(nodeButton('song:a'));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close' }), {
      key: 'Escape',
    });
    expect(screen.queryByRole('complementary', { name: 'song:a' })).toBeNull();
  });
});
