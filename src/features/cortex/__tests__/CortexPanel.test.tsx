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
vi.mock('../CortexMap', () => ({
  CortexMap: () => <div data-testid="whole-map" />,
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

const manySongs: CortexWeb = {
  nodes: Array.from({ length: 60 }, (_, i) => node(`song:${i}`)),
  links: [],
  activityCount: 60,
  connectionCount: 0,
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

const pick = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));

const nodeButton = (id: string) =>
  document.querySelector<HTMLElement>(`[data-node="${id}"]`)!;

beforeEach(() => {
  localStorage.clear();
  state.web = smallWeb;
  state.loading = false;
  // jsdom lays nothing out, and the stage waits for a real size.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(480);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the Cortex panel', () => {
  it('opens on the Orbit, and lays out nothing it isn’t showing', () => {
    renderPanel();
    expect(screen.getByTestId('orbital-stage')).toBeInTheDocument();
    expect(screen.queryByTestId('whole-map')).toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Orbit' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    const saved = JSON.parse(
      localStorage.getItem('music-atlas-cortex-view:student-1') ?? '{}',
    );
    expect(saved.positions).toEqual({});
  });

  it('switches between the Orbit and the whole map', () => {
    renderPanel();
    pick('Orbit');
    expect(screen.getByTestId('orbital-stage')).toBeInTheDocument();
    expect(screen.queryByTestId('whole-map')).toBeNull();
    pick('Whole map');
    expect(screen.getByTestId('whole-map')).toBeInTheDocument();
    expect(screen.queryByTestId('orbital-stage')).toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Whole map' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('remembers the choice, and copes when it can’t', () => {
    renderPanel();
    pick('Orbit');
    cleanup();
    renderPanel();
    expect(screen.getByTestId('orbital-stage')).toBeInTheDocument();
    cleanup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderPanel();
    pick('Orbit');
    expect(screen.getByTestId('orbital-stage')).toBeInTheDocument();
  });

  it('keeps the selection across a switch', () => {
    renderPanel();
    pick('Orbit');
    fireEvent.click(nodeButton('song:a'));
    expect(screen.getByRole('complementary', { name: 'song:a' })).toBeTruthy();
    pick('Whole map');
    expect(screen.getByRole('complementary', { name: 'song:a' })).toBeTruthy();
  });

  it('says how much a node connects to, without inventing a score', () => {
    renderPanel();
    pick('Orbit');
    fireEvent.click(nodeButton('genre:funk'));
    expect(screen.getByText('Connected to 2 things')).toBeInTheDocument();
  });

  it('offers the whole map when the rings can’t hold everything', () => {
    state.web = manySongs;
    renderPanel();
    pick('Orbit');
    const more = screen.getByRole('button', { name: /in whole map$/ });
    fireEvent.click(more);
    expect(screen.getByTestId('whole-map')).toBeInTheDocument();
  });

  it('offers nothing more when everything is on the rings', () => {
    renderPanel();
    pick('Orbit');
    expect(screen.queryByRole('button', { name: /in whole map$/ })).toBeNull();
  });

  it('shows the core alone while the account is loading', () => {
    state.web = emptyWeb;
    state.loading = true;
    renderPanel();
    expect(document.querySelector('[data-orbital-core]')).not.toBeNull();
    expect(screen.queryByText('Your Cortex starts here')).toBeNull();
  });

  it('shows how it starts when there’s nothing yet', () => {
    state.web = emptyWeb;
    renderPanel();
    expect(document.querySelector('[data-orbital-core]')).not.toBeNull();
    expect(screen.getByText('Your Cortex starts here')).toBeInTheDocument();
  });

  it('reads the connections out in either view, and the caption live', () => {
    renderPanel();
    pick('Orbit');
    expect(screen.getByText('song:a connects to genre:funk')).toBeTruthy();
    expect(screen.getByText('2 activities · 2 connections')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    pick('Whole map');
    expect(screen.getByText('song:a connects to genre:funk')).toBeTruthy();
  });

  it('closes the card on Escape when focus has left the panel', () => {
    renderPanel();
    pick('Orbit');
    fireEvent.click(nodeButton('song:a'));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'song:a' })).toBeNull();
  });

  it('closes the card on Escape, wherever focus is in the panel', () => {
    renderPanel();
    pick('Orbit');
    fireEvent.click(nodeButton('song:a'));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close' }), {
      key: 'Escape',
    });
    expect(screen.queryByRole('complementary', { name: 'song:a' })).toBeNull();
  });
});
