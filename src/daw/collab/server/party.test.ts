/**
 * The collab party's connection handshake (collab-16 and the version
 * handshake): every studio socket proves who it is and which doc schema it
 * speaks BEFORE y-partyserver's Yjs sync sees it.
 *
 * Same thin fakes as classroom_session/party.test.ts: y-partyserver's YServer,
 * the connections and auth are faked, and the sync's entry points (onConnect,
 * handleMessage) are spies, so "reached the Yjs sync" is observable.
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

// Sockets partyserver has accepted. As in partyserver, a socket is on this
// list before onConnect runs.
let accepted: FakeConn[] = [];

const yjsOnConnect = vi.fn();
const yjsHandleMessage = vi.fn();
vi.mock('y-partyserver', () => ({
  YServer: class {
    env = {};
    constructor(readonly ctx: { id: { name: string } }) {}
    get name() {
      return this.ctx.id.name;
    }
    getConnections() {
      return accepted;
    }
    onConnect(...args: unknown[]) {
      return yjsOnConnect(...args);
    }
    handleMessage(...args: unknown[]) {
      return yjsHandleMessage(...args);
    }
    onClose() {}
  },
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

const makeParty = (roomId: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new CollabServer({ id: { name: roomId } } as any, {} as any);

/** Open a socket to `party`'s room; resolves once onConnect has finished. */
const connectTo = async (
  party: InstanceType<typeof CollabServer>,
  query: Record<string, string>,
): Promise<FakeConn> => {
  const conn = makeConn(party.name, query);
  accepted.push(conn);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await party.onConnect(conn as any, { request: { url: conn.uri } } as any);
  return conn;
};

const connect = (roomId: string, query: Record<string, string>) =>
  connectTo(makeParty(roomId), query);

const CURRENT = {
  [COLLAB_DOC_SCHEMA_PARAM]: String(COLLAB_DOC_SCHEMA_VERSION),
};

beforeEach(() => {
  accepted = [];
  validateConnection.mockReset();
  yjsOnConnect.mockReset();
  yjsHandleMessage.mockReset();
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
  // out as schema 1. Since COLLAB_DOC_SCHEMA_VERSION moved past 1 (2 in
  // milestone 2.12) they are turned away like any other old build.
  it('turns away a socket that sends no version once the schema has moved on', async () => {
    expect(COLLAB_DOC_SCHEMA_VERSION).toBeGreaterThan(1);
    validateConnection.mockResolvedValue({ userId: 'u1', role: 'owner' });
    const conn = await connect('studio-abc12345', { role: 'owner' });

    expect(conn.closed?.code).toBe(COLLAB_CLOSE.versionMismatch);
  });
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

// partyserver accepts a socket before onConnect decides on it, and
// y-partyserver sends every document update to getConnections(). The party
// narrows that to sockets handed to the sync, as y-partykit did.
describe('Yjs traffic', () => {
  it('leaves a socket still waiting on auth out of the fan-out', async () => {
    const party = makeParty('studio-abc12345');
    validateConnection.mockResolvedValueOnce({ userId: 'u1', role: 'owner' });
    const host = await connectTo(party, {
      role: 'owner',
      token: 'tok',
      ...CURRENT,
    });

    validateConnection.mockReturnValueOnce(new Promise(() => {}));
    void connectTo(party, { role: 'editor', token: 'tok', ...CURRENT });

    expect(accepted).toHaveLength(2);
    expect([...party.getConnections()].map((c) => c.id)).toEqual([host.id]);
  });

  it('drops Yjs messages from a socket that was turned away', async () => {
    const party = makeParty('studio-abc12345');
    validateConnection.mockResolvedValueOnce(null);
    const stranger = await connectTo(party, { role: 'owner', ...CURRENT });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await party.onMessage(stranger as any, new Uint8Array([0, 0]).buffer);

    expect(stranger.closed?.code).toBe(COLLAB_CLOSE.unauthorized);
    expect(yjsHandleMessage).not.toHaveBeenCalled();
  });

  it('hands an admitted socket its Yjs messages, chunked ones reassembled', async () => {
    const party = makeParty('studio-abc12345');
    validateConnection.mockResolvedValueOnce({ userId: 'u1', role: 'owner' });
    const host = await connectTo(party, {
      role: 'owner',
      token: 'tok',
      ...CURRENT,
    });
    const send = (message: string | ArrayBuffer) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      party.onMessage(host as any, message);

    await send(new Uint8Array([0, 1, 2]).buffer);
    await send('y-pk-batch#{"id":"b1","type":"start","size":4,"count":2}');
    await send(new Uint8Array([0, 2]).buffer);
    await send(new Uint8Array([3, 4]).buffer);
    await send('y-pk-batch#{"id":"b1","type":"end","size":4,"count":2}');

    expect(
      yjsHandleMessage.mock.calls.map(([, message]) => [...message]),
    ).toEqual([
      [0, 1, 2],
      [0, 2, 3, 4],
    ]);
  });
});
