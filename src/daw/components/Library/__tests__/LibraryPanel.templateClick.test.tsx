// @vitest-environment jsdom
/**
 * A template clicked in the Library panel replaces the project, as the
 * dashboard's template tile does (decision D10). Since milestone 1.4 it opens
 * through openSession, the one way every session opens: the work it replaces
 * is kept first as a device draft, with a Restore; a take still recording is
 * stopped and kept first; and the template opens as a new project (no cloud
 * link, nothing of the last project, not an undo step). It used to pour the
 * template's tracks into the open project as one undo step and keep the
 * rest, cloud link and all, so the next Save overwrote the previous project
 * (insight-03). What the open does is openSession's own tests'
 * (src/daw/session/__tests__); this pins the click.
 *
 * Never in a shared session (E15: membership is the room id), where it would
 * replace the room's project for everyone.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
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

const h = vi.hoisted(() => ({
  openSession: vi.fn(async () => ({ status: 'cancelled' })),
}));

// Insight analyses the project; this test is about the Library tab.
vi.mock('../InsightContent', () => ({ InsightContent: () => null }));
vi.mock('@/daw/session/openSession', () => ({ openSession: h.openSession }));

import { useStore } from '@/daw/store';
import { LibraryPanel } from '../LibraryPanel';

/** Open the Library tab and click the Pop template, as the student does. */
async function clickPopTemplate(): Promise<void> {
  render(<LibraryPanel />);
  fireEvent.click(screen.getByText('Library'));
  await act(async () => {
    fireEvent.click(screen.getByText('Pop'));
  });
}

const popRow = () => screen.getByText('Pop').closest('[draggable]')!;

beforeAll(() => {
  // framer-motion measures the panel's animation through it; jsdom has none.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  h.openSession.mockClear();
});

afterEach(cleanup);

describe('a Library template click', () => {
  it('opens the template through openSession', async () => {
    useStore.setState({ projectId: 'cloud-42', projectName: 'Blue Hour' });
    await clickPopTemplate();

    expect(h.openSession).toHaveBeenCalledTimes(1);
    expect(h.openSession).toHaveBeenCalledWith(
      { kind: 'template', templateId: 'project-pop' },
      { source: 'library' },
    );
    // Nothing changes here: the open replaces the session once it has kept
    // the work it replaces.
    expect(useStore.getState().projectName).toBe('Blue Hour');
  });

  it('opens while a take records: openSession stops and keeps it first', async () => {
    useStore.setState({ isRecording: true });
    await clickPopTemplate();

    expect(h.openSession).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['in a room the student joined', 'editor'],
    ['in a room the student hosts', 'owner'],
  ] as const)('is off %s, changing nothing', async (_, role) => {
    useStore.setState({ roomId: 'room-1', collabRole: role });
    await clickPopTemplate();

    expect(h.openSession).not.toHaveBeenCalled();
    expect(popRow()).toHaveAttribute('aria-disabled', 'true');
    expect(popRow()).toHaveAttribute(
      'title',
      'Leave the shared session to open a template',
    );
  });

  it('is on again once the room is left', async () => {
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });
    render(<LibraryPanel />);
    fireEvent.click(screen.getByText('Library'));
    expect(popRow()).toHaveAttribute('aria-disabled', 'true');

    act(() => useStore.getState()._clearCollab());
    expect(popRow()).not.toHaveAttribute('aria-disabled');
    await act(async () => {
      fireEvent.click(screen.getByText('Pop'));
    });
    expect(h.openSession).toHaveBeenCalledTimes(1);
  });
});
