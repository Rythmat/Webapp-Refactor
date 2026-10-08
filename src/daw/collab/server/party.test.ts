/**
 * The collab party's connection handshake (collab-16 and the version
 * handshake): every studio socket proves who it is and which doc schema it
 * speaks BEFORE y-partykit's Yjs sync sees it.
 *
 * Same thin fakes as classroom_session/party.test.ts: the room, connections and
 * auth are faked, and y-partykit's onConnect is a spy, so "reached the Yjs
 * sync" is observable.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COLLAB_CLOSE,
  COLLAB_DOC_SCHEMA_PARAM,
  COLLAB_DOC_SCHEMA_VERSION,
  serverVersionInReason,
} from '../types';

const validateConnection = vi.fn();
vi.mock('./auth', () => ({
  validateConnection: (...args: unknown[]) => validateConnection(...args),
}));

const yjsOnConnect = vi.fn();
vi.mock('y-partykit', () => ({
  onConnect: (...args: unknown[]) => yjsOnConnect(...args),
}));

const { default: CollabServer } = await import('./party');

interface FakeConn {
  id: string;
  uri: string;
  sent: unknown[];
  closed: { code?: number; reason?: string } | null;
  send: (text: string) => void;
  close: (code?: number, reason?: string) => void;
  setState: (state: unknown) => void;
}

let nextConnId = 0;

const makeConn = (roomId: string, query: Record<string, string>): FakeConn => {
  const conn: FakeConn = {
    // Unique per test: the party keeps connection metadata module-wide.
    id: `conn-${(nextConnId += 1)}`,
    uri: `https://party.example/parties/main/${roomId}?${new URLSearchParams(query)}`,
    sent: [],
    closed: null,
    send: (text) => {
      conn.sent.push(JSON.parse(text));
    },
    close: (code, reason) => {
      conn.closed = { code, reason };
    },
    setState: () => {},
  };
  return conn;
};

const connect = async (
  roomId: string,
  query: Record<string, string>,
): Promise<FakeConn> => {
  const room = { id: roomId, env: {}, getConnections: () => [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const party = new CollabServer(room as any);
  const conn = makeConn(roomId, query);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await party.onConnect(conn as any);
  return conn;
};

const CURRENT = {
  [COLLAB_DOC_SCHEMA_PARAM]: String(COLLAB_DOC_SCHEMA_VERSION),
};

beforeEach(() => {
  validateConnection.mockReset();
  yjsOnConnect.mockReset();
});

describe('studio room handshake', () => {
  it('closes a socket without a valid token with 4401, before any Yjs sync', async () => {
    validateConnection.mockResolvedValue(null);
    const conn = await connect('studio-abc12345', {
      role: 'owner',
      ...CURRENT,
    });

    expect(conn.closed?.code).toBe(COLLAB_CLOSE.unauthorized);
    expect(yjsOnConnect).not.toHaveBeenCalled();
  });

  it('closes a socket on another doc schema version with 4426, before any Yjs sync', async () => {
    validateConnection.mockResolvedValue({ userId: 'u1', role: 'owner' });
    const conn = await connect('studio-abc12345', {
      role: 'owner',
      token: 'tok',
      [COLLAB_DOC_SCHEMA_PARAM]: String(COLLAB_DOC_SCHEMA_VERSION + 1),
    });

    expect(conn.closed?.code).toBe(COLLAB_CLOSE.versionMismatch);
    expect(yjsOnConnect).not.toHaveBeenCalled();
    // An out-of-date app is told to update, whatever its token.
    expect(validateConnection).not.toHaveBeenCalled();
    // The reason names the server's version, so a client newer than the
    // server can say the server is being updated instead.
    expect(serverVersionInReason(conn.closed?.reason)).toBe(
      COLLAB_DOC_SCHEMA_VERSION,
    );
    // Within the WebSocket close-reason limit.
    expect(new TextEncoder().encode(conn.closed?.reason).length).toBeLessThan(
      124,
    );
  });

  it('closes a socket with a garbled version with 4426', async () => {
    validateConnection.mockResolvedValue({ userId: 'u1', role: 'owner' });
    const conn = await connect('studio-abc12345', {
      role: 'owner',
      [COLLAB_DOC_SCHEMA_PARAM]: 'not-a-number',
    });

    expect(conn.closed?.code).toBe(COLLAB_CLOSE.versionMismatch);
    expect(yjsOnConnect).not.toHaveBeenCalled();
  });

  it('hands a signed-in socket on the current version to the Yjs sync', async () => {
    validateConnection.mockResolvedValue({ userId: 'u1', role: 'owner' });
    const conn = await connect('studio-abc12345', {
      role: 'owner',
      token: 'tok',
      ...CURRENT,
    });

    expect(conn.closed).toBeNull();
    expect(yjsOnConnect).toHaveBeenCalledTimes(1);
  });

  // Builds from before the handshake send no version; they lay the document
  // out as schema 1. Once COLLAB_DOC_SCHEMA_VERSION moves past 1 they must be
  // turned away like any other old build.
  it.runIf(COLLAB_DOC_SCHEMA_VERSION === 1)(
    'reads a socket that sends no version as schema 1',
    async () => {
      validateConnection.mockResolvedValue({ userId: 'u1', role: 'owner' });
      const conn = await connect('studio-abc12345', { role: 'owner' });

      expect(conn.closed).toBeNull();
      expect(yjsOnConnect).toHaveBeenCalledTimes(1);
    },
  );
  it.skipIf(COLLAB_DOC_SCHEMA_VERSION === 1)(
    'turns away a socket that sends no version once the schema has moved on',
    async () => {
      validateConnection.mockResolvedValue({ userId: 'u1', role: 'owner' });
      const conn = await connect('studio-abc12345', { role: 'owner' });

      expect(conn.closed?.code).toBe(COLLAB_CLOSE.versionMismatch);
    },
  );
});

describe('jam room handshake', () => {
  it('skips the doc schema check: jam rooms never sync a document', async () => {
    validateConnection.mockResolvedValue({ userId: 'u1', role: 'owner' });
    const conn = await connect('jam-abc12345', { role: 'owner', token: 'tok' });

    expect(conn.closed).toBeNull();
    expect(yjsOnConnect).toHaveBeenCalledTimes(1);
  });

  // Until JamRoomProvider fetches a fresh token per connect and stops after
  // repeated 4401s, a 4401 would put an expired-token jam player into
  // y-partykit's ~10/s reconnect loop. The old path stays for them.
  it('still admits a socket without a valid token, as before', async () => {
    validateConnection.mockResolvedValue(null);
    const conn = await connect('jam-abc12345', { role: 'editor' });

    expect(conn.closed).toBeNull();
    expect(yjsOnConnect).toHaveBeenCalledTimes(1);
  });

  it('still turns a non-host away from a room with no host', async () => {
    validateConnection.mockResolvedValue({ userId: 'u2', role: 'editor' });
    const conn = await connect('jam-abc12345', { role: 'editor', token: 't' });

    expect(conn.closed?.code).toBe(COLLAB_CLOSE.notFound);
    expect(yjsOnConnect).not.toHaveBeenCalled();
  });
});
