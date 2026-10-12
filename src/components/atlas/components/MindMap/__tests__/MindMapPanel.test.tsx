// @vitest-environment jsdom
/**
 * The Promoter's mind map in the Globe: the board arrives from the slide, the
 * student adds what they find, the map draws Cortex's connections, and the
 * finished map goes to the teacher.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import type { MindMapBoard } from '@/content/graph/mindMapBoard';
import { writeMindMapHandoff } from '@/features/classroom/msp/mindMapHandoff';
import { appendMspLaunchParams } from '@/features/classroom/msp/mspLaunchParams';
import { readMspInboxForUser } from '@/features/classroom/msp/mspResponseInbox';
import MindMapPanel from '../MindMapPanel';

vi.mock('@/hooks/data', () => ({ useMe: () => ({ data: { id: 'acct-1' } }) }));

const BOARD: MindMapBoard = {
  focus: 'artist:ana-lux',
  goal: 2,
  nodes: [
    {
      id: 'artist:ana-lux',
      kind: 'artist',
      label: 'Ana Lux',
      stop: { artist: 'Ana Lux' },
    },
    {
      id: 'place:motor-city',
      kind: 'place',
      label: 'Motor City',
      stop: { place: 'city:motor-city' },
    },
    {
      id: 'artist:ben-ray',
      kind: 'artist',
      label: 'Ben Ray',
      stop: { artist: 'Ben Ray' },
    },
    {
      id: 'event:evt-far',
      kind: 'event',
      label: 'Far away event',
      stop: { event: 'evt-far' },
    },
  ],
  edges: [
    { from: 'artist:ana-lux', to: 'place:motor-city', kind: 'born_in' },
    { from: 'artist:ben-ray', to: 'place:motor-city', kind: 'based_in' },
  ],
};

const launchUrl = (stop: string) =>
  appendMspLaunchParams(`/atlas/globe?mindmap=1&${stop}`, {
    interactionId: 'ix-1',
    enrollmentId: 'enr-1',
    module: 'globe',
    activityRef: 'globe:mindmap',
    expects: 'artifact',
  });

let location = '';
const Where = () => {
  const l = useLocation();
  location = `${l.pathname}${l.search}`;
  return null;
};

const renderAt = (url: string) => {
  // The launch params are read from the real address bar too.
  window.history.replaceState({}, '', url);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AtlasNavigationProvider>
        <MindMapPanel />
      </AtlasNavigationProvider>
      <Where />
    </MemoryRouter>,
  );
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  writeMindMapHandoff({
    interactionId: 'ix-1',
    board: BOARD,
    question: { en: 'Find 2 connections to Ana Lux on the Globe.' },
  });
});
afterEach(cleanup);

describe('MindMapPanel', () => {
  it('shows the challenge, and says when the student is at the centre', () => {
    renderAt(launchUrl('artist=Ana%20Lux'));
    expect(
      screen.getByRole('heading', { name: 'Ana Lux' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Find 2 connections to Ana Lux on the Globe.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This is the centre of your map.'),
    ).toBeInTheDocument();
    expect(screen.getByText('0 of 2')).toBeInTheDocument();
  });

  it('flies to the focus when the Globe opens with nothing selected', () => {
    renderAt(launchUrl(''));
    expect(location).toContain('artist=Ana+Lux');
  });

  it('adds what the student is looking at and draws the labelled connection', () => {
    renderAt(launchUrl('place=city%3Amotor-city'));
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    // The line reads from the focus: Ana Lux — born in — Motor City.
    expect(screen.getAllByText('born in').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Ana Lux — born in — Motor City'),
    ).toBeInTheDocument();
    // Ben Ray now joins the map through Motor City, so he is a lead.
    expect(screen.getByRole('button', { name: /Ben Ray/ })).toHaveTextContent(
      'based in Motor City',
    );
  });

  it("won't add something that does not join the map yet, or is not on the board", () => {
    renderAt(launchUrl('artist=Ben%20Ray'));
    expect(
      screen.getByText(
        'Connected further out. Add what links it to your map first.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Add$/ }),
    ).not.toBeInTheDocument();
    cleanup();
    renderAt(launchUrl('artist=Someone%20Else'));
    expect(
      screen.getByText('Not on Ana Lux map. Keep exploring.'),
    ).toBeInTheDocument();
  });

  it('sends the finished map to the teacher', () => {
    renderAt(launchUrl('place=city%3Amotor-city'));
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    fireEvent.click(screen.getByRole('button', { name: /Submit map/ }));
    expect(screen.getByText('Sent to your teacher.')).toBeInTheDocument();
    const entries = Object.values(readMspInboxForUser('acct-1').entries);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      interactionId: 'ix-1',
      participant: { enrollmentId: 'enr-1' },
      payload: {
        kind: 'mindMap',
        map: {
          focus: 'artist:ana-lux',
          nodeIds: ['place:motor-city'],
          edgeCount: 1,
        },
      },
    });
  });

  it('keeps the map through a reload of the Globe tab', () => {
    renderAt(launchUrl('place=city%3Amotor-city'));
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    cleanup();
    renderAt(launchUrl('place=city%3Amotor-city'));
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Already on your map.')).toBeInTheDocument();
  });

  it('removing a node also removes what only it joined', () => {
    renderAt(launchUrl('place=city%3Amotor-city'));
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ben Ray/ }));
    // Now standing on Ben Ray: add him too.
    fireEvent.click(screen.getByRole('button', { name: /^Add$/ }));
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Motor City' }));
    expect(screen.getByText('0 of 2')).toBeInTheDocument();
  });

  it('says where to open it from when no board arrived', () => {
    window.localStorage.clear();
    renderAt(launchUrl('artist=Ana%20Lux'));
    expect(
      screen.getByText(/Open the mind map from your class's slide/),
    ).toBeInTheDocument();
  });
});
