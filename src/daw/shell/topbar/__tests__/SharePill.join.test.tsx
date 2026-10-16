// @vitest-environment jsdom
/**
 * The Share pill's Join (milestone 1.4, in the collab toolbar until 2.5
 * made it the Share pill): it opens the room's session through
 * openSession (source 'toolbar'), off while a room is joined (E15). The
 * code the student typed is cleared only once the session opened, so a
 * refused join leaves it there to fix; a pasted session link joins by the
 * code it carries.
 *
 * Run: npx vitest run src/daw/shell/topbar/__tests__/SharePill.join.test.tsx
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  openSession: vi.fn(),
}));

vi.mock('@/daw/session/openSession', () => ({ openSession: h.openSession }));
vi.mock('@/daw/collab/ui/InviteModal', () => ({ InviteModal: () => null }));

import { useStore } from '@/daw/store';
import { SharePill } from '../SharePill';

const refused = {
  status: 'refused',
  error: {
    kind: 'not-found',
    message: 'That session wasn’t found',
    retryable: false,
    surface: 'toast',
  },
};
const ready = {
  status: 'ready',
  draftId: 'd1',
  kept: null,
  forked: false,
  generation: 1,
};

function renderToolbar() {
  return render(<SharePill />);
}

function openPopover(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
}

async function join(code: string): Promise<void> {
  openPopover();
  fireEvent.change(screen.getByPlaceholderText('Code or link'), {
    target: { value: code },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
  });
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  h.openSession.mockReset();
});

afterEach(() => cleanup());

describe('Share ▸ Join with a code', () => {
  it('opens the room through openSession and closes the popover', async () => {
    h.openSession.mockResolvedValue(ready);
    renderToolbar();
    await join('  room-42 ');

    expect(h.openSession).toHaveBeenCalledWith(
      {
        kind: 'collab',
        code: 'room-42',
        host: false,
        jamImport: false,
        awaitHost: false,
      },
      { source: 'toolbar' },
    );
    expect(screen.queryByPlaceholderText('Code or link')).toBeNull();

    // Opened: the code is gone next time.
    openPopover();
    expect(screen.getByPlaceholderText('Code or link')).toHaveValue('');
  });

  it('keeps what was typed when the join is refused', async () => {
    h.openSession.mockResolvedValue(refused);
    renderToolbar();
    await join('room-typo');

    openPopover();
    expect(screen.getByPlaceholderText('Code or link')).toHaveValue(
      'room-typo',
    );
  });

  it('joins by the code a pasted session link carries', async () => {
    h.openSession.mockResolvedValue(ready);
    renderToolbar();
    await join('https://app.musicatlas.io/studio/editor?collab=abc-123');

    expect(h.openSession).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'collab', code: 'abc-123' }),
      { source: 'toolbar' },
    );
  });

  it('is off in a room', () => {
    // A room identity with no bridge yet (a guest's): still a room (E15).
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });
    renderToolbar();
    openPopover();

    expect(screen.getByPlaceholderText('Code or link')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled();
  });
});
