// @vitest-environment jsdom
/**
 * The People panel's Join with a code (milestone 1.4; the Share pill's until
 * the floating frame's top bar, 2026-10-21): it opens the room's session
 * through openSession, off while a room is joined (E15). The code the
 * student typed is cleared only once the session opened, so a refused join
 * leaves it there to fix; a pasted session link joins by the code it
 * carries. Start a session needs no dialog: in the session its button is
 * the session's code, which a click copies; the panel offers Leave.
 *
 * Run: npx vitest run src/daw/shell/inspector/panels/__tests__/PeopleBody.join.test.tsx
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
  createAndJoinRoom: vi.fn(),
  sendChatMessage: vi.fn(),
}));

vi.mock('@/daw/session/openSession', () => ({ openSession: h.openSession }));
vi.mock('@/daw/collab/CollabProvider', () => ({
  useCollab: () => ({
    createAndJoinRoom: h.createAndJoinRoom,
    sendChatMessage: h.sendChatMessage,
  }),
}));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ userId: 'me' }),
}));
vi.mock('@/daw/collab/presence', () => ({ useRemoteUsers: () => [] }));

import { useStore } from '@/daw/store';
import { PeopleBody } from '../PeopleBody';

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

async function join(code: string): Promise<void> {
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
  h.createAndJoinRoom.mockReset();
  h.sendChatMessage.mockReset();
});

afterEach(() => cleanup());

describe('People ▸ Join with a code', () => {
  it('opens the room through openSession and clears the code once open', async () => {
    h.openSession.mockResolvedValue(ready);
    render(<PeopleBody />);
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
    expect(screen.getByPlaceholderText('Code or link')).toHaveValue('');
  });

  it('keeps what was typed when the join is refused', async () => {
    h.openSession.mockResolvedValue(refused);
    render(<PeopleBody />);
    await join('room-typo');
    expect(screen.getByPlaceholderText('Code or link')).toHaveValue(
      'room-typo',
    );
  });

  it('joins by the code a pasted session link carries', async () => {
    h.openSession.mockResolvedValue(ready);
    render(<PeopleBody />);
    await join('https://app.musicatlas.io/studio?collab=abc-123');

    expect(h.openSession).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'collab', code: 'abc-123' }),
      { source: 'toolbar' },
    );
  });

  it('is off in a room', () => {
    // A room identity with no bridge yet (a guest's): still a room (E15).
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });
    render(<PeopleBody />);
    expect(screen.getByPlaceholderText('Code or link')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled();
  });

  it('starts a session with no invite dialog', () => {
    render(<PeopleBody />);
    fireEvent.click(screen.getByTestId('people-start-session'));
    expect(h.createAndJoinRoom).toHaveBeenCalledOnce();
    expect(useStore.getState().inviteRequested).toBe(false);
  });
});

describe('People in a session', () => {
  it("shows the session's code in Start a session's place; a click copies it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    useStore.setState({ isCollabActive: true, roomCode: 'abcd1234' });
    render(<PeopleBody />);

    expect(screen.queryByTestId('people-start-session')).toBeNull();
    const code = screen.getByTestId('people-invite-code');
    expect(code).toHaveTextContent('abcd1234');
    await act(async () => {
      fireEvent.click(code);
    });
    expect(writeText).toHaveBeenCalledWith('abcd1234');
    expect(code).toHaveAccessibleName('Invite code copied');
  });

  it('offers Leave', () => {
    useStore.setState({ isCollabActive: true, roomCode: 'ABCD' });
    render(<PeopleBody />);
    fireEvent.click(screen.getByTestId('people-leave'));
    expect(useStore.getState().leavePromptPending).toBe(true);
  });

  it("holds the session's chat, read once it shows", () => {
    useStore.setState({
      isCollabActive: true,
      roomCode: 'ABCD',
      unreadChatCount: 2,
      chatMessages: [
        { id: 'm1', userId: 'ana', userName: 'Ana', text: 'Hi!', timestamp: 0 },
      ],
    });
    render(<PeopleBody />);
    expect(screen.getByRole('log', { name: 'Messages' })).toHaveTextContent(
      'Hi!',
    );
    expect(useStore.getState().unreadChatCount).toBe(0);

    fireEvent.change(screen.getByTestId('chat-input'), {
      target: { value: ' Hello ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(h.sendChatMessage).toHaveBeenCalledWith('Hello');
  });

  it('has no chat out of a session', () => {
    render(<PeopleBody />);
    expect(screen.queryByTestId('people-chat')).toBeNull();
  });
});
