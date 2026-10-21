/**
 * Rule 2 for PRESENCE — the first test against the PartyKit party.
 *
 * `emitPresence` used to broadcast `{enrollmentId, state}` to
 * ['teacher','student','projector']: the same identifier class
 * `stripForProjector` exists to remove from responses, sent to the one screen
 * the whole class is looking at. This pins the fix.
 *
 * There is no PartyServer test harness in the repo, so partyserver's Server,
 * the connections and auth are faked here. The fakes are deliberately thin —
 * they model only what the party actually touches (`name`, `env`,
 * `getConnections()`, `conn.id`, `conn.send`, `conn.close`, and the upgrade
 * request's URL).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from './auth';

const authorizeClassroomConnection = vi.fn();
vi.mock('./auth', () => ({
  authorizeClassroomConnection: (...args: unknown[]) =>
    authorizeClassroomConnection(...args),
}));

// The sockets connected to the party under test.
let connected: FakeConn[] = [];

vi.mock('partyserver', () => ({
  Server: class {
    env = {};
    constructor(readonly ctx: { id: { name: string } }) {}
    get name() {
      return this.ctx.id.name;
    }
    getConnections() {
      return connected;
    }
  },
}));

const { default: ClassroomSessionServer } = await import('./party');

interface FakeConn {
  id: string;
  uri: string;
  role: Role;
  sent: unknown[];
  send: (text: string) => void;
  close: (code?: number, reason?: string) => void;
}

const SESSION = {
  id: 'sess-1',
  classroomId: 'c1',
  teacherId: 't1',
  publishedDayId: 'pd1',
  code: 'ABCD',
  status: 'live',
  state: {},
  startedAt: '2026-01-01T00:00:00.000Z',
  endedAt: null,
};

const makeConn = (id: string, role: Role): FakeConn => {
  const conn: FakeConn = {
    id,
    uri: `https://party/parties/classroom_session/sess-1?role=${role}`,
    role,
    sent: [],
    send: (text: string) => {
      conn.sent.push(JSON.parse(text));
    },
    close: () => {},
  };
  return conn;
};

const messagesOf = (conn: FakeConn, type: string): Record<string, unknown>[] =>
  conn.sent.filter(
    (m): m is Record<string, unknown> =>
      !!m && typeof m === 'object' && (m as { type?: string }).type === type,
  );

/** Boot a party with the given connections already authorized + connected. */
const bootParty = async (conns: FakeConn[]) => {
  connected = conns;
  const party = new ClassroomSessionServer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { id: { name: 'sess-1' } } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any,
  );

  for (const conn of conns) {
    authorizeClassroomConnection.mockResolvedValueOnce({
      ok: true,
      auth: {
        userId: `u-${conn.id}`,
        role: conn.role,
        // Only students carry an enrollment id, exactly as auth.ts behaves.
        enrollmentId: conn.role === 'student' ? `enr-${conn.id}` : null,
        session: SESSION,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await party.onConnect(conn as any, { request: { url: conn.uri } } as any);
  }
  return party;
};

beforeEach(() => {
  authorizeClassroomConnection.mockReset();
});

describe('presence fan-out (Rule 2)', () => {
  it('never sends an identified presence body to a projector or a student', async () => {
    const teacher = makeConn('c-teacher', 'teacher');
    const student = makeConn('c-student', 'student');
    const projector = makeConn('c-projector', 'projector');
    await bootParty([teacher, student, projector]);

    for (const conn of [student, projector]) {
      const presence = messagesOf(conn, 'presence');
      expect(
        presence,
        `${conn.role} received ${presence.length} identified presence bodies`,
      ).toHaveLength(0);
    }

    // Belt: no enrollment identifier anywhere in what they received, at any depth.
    for (const conn of [student, projector]) {
      const serialized = JSON.stringify(conn.sent);
      expect(serialized).not.toContain('enrollmentId');
      expect(serialized).not.toContain('enr-c-student');
    }
  });

  it('still sends the identified presence stream to the teacher', async () => {
    const teacher = makeConn('c-teacher', 'teacher');
    const student = makeConn('c-student', 'student');
    await bootParty([teacher, student]);

    const presence = messagesOf(teacher, 'presence');
    expect(presence.length).toBeGreaterThan(0);
    expect(JSON.stringify(presence)).toContain('enr-c-student');
  });

  it('sends students and the projector a COUNT instead', async () => {
    const teacher = makeConn('c-teacher', 'teacher');
    const student = makeConn('c-student', 'student');
    const projector = makeConn('c-projector', 'projector');
    await bootParty([teacher, student, projector]);

    for (const conn of [student, projector]) {
      const counts = messagesOf(conn, 'presenceCount');
      expect(
        counts.length,
        `${conn.role} got no presenceCount`,
      ).toBeGreaterThan(0);
      const last = counts[counts.length - 1];
      expect(typeof last.joined).toBe('number');
      expect(typeof last.active).toBe('number');
    }
  });

  it('counts connected students, not enrolled ones', async () => {
    const teacher = makeConn('c-teacher', 'teacher');
    const s1 = makeConn('c-s1', 'student');
    const s2 = makeConn('c-s2', 'student');
    const projector = makeConn('c-projector', 'projector');
    await bootParty([teacher, s1, s2, projector]);

    const counts = messagesOf(projector, 'presenceCount');
    const last = counts[counts.length - 1];
    // Two student sockets connected; teacher and projector are not counted.
    expect(last.joined).toBe(2);
  });
});

describe('Echo’s round fan-out', () => {
  /** The API's POST to the party, as it relays a persisted state change. */
  const relay = async (
    party: Awaited<ReturnType<typeof bootParty>>,
    body: unknown,
  ) => {
    (party as unknown as { env: Record<string, string> }).env = {
      PARTYKIT_WEBHOOK_SECRET: 'secret',
    };
    return party.onRequest(
      new Request('https://party/parties/classroom_session/sess-1', {
        method: 'POST',
        headers: { authorization: 'Bearer secret' },
        body: JSON.stringify(body),
      }),
    );
  };

  it('relays the round to every role, the projector included', async () => {
    const teacher = makeConn('c-teacher', 'teacher');
    const student = makeConn('c-student', 'student');
    const projector = makeConn('c-projector', 'projector');
    const party = await bootParty([teacher, student, projector]);
    const echo = { slideId: 's1', run: 3, classResult: { run: 2, good: 5 } };
    const res = await relay(party, { type: 'echo', echo });
    expect(res.status).toBe(200);
    for (const conn of [teacher, student, projector]) {
      expect(messagesOf(conn, 'echo')).toEqual([{ type: 'echo', echo }]);
    }
  });

  it('keeps a student’s Echo results to the teacher (Rule 2)', async () => {
    const teacher = makeConn('c-teacher', 'teacher');
    const student = makeConn('c-student', 'student');
    const projector = makeConn('c-projector', 'projector');
    const party = await bootParty([teacher, student, projector]);
    await relay(party, {
      type: 'response',
      at: '2026-01-01T00:00:00.000Z',
      interactionId: 'ix-echo',
      sessionId: 'sess-1',
      enrollmentId: 'enr-c-student',
      displayName: 'Ana P.',
      payload: { kind: 'echo', slideId: 's1', rounds: [], bestStreak: 0 },
    });
    expect(messagesOf(teacher, 'response')).toHaveLength(1);
    expect(messagesOf(student, 'response')).toHaveLength(0);
    expect(messagesOf(projector, 'response')).toHaveLength(0);
  });
});
