/**
 * Rule 2 for PRESENCE — the first test against the PartyKit party.
 *
 * `emitPresence` used to broadcast `{enrollmentId, state}` to
 * ['teacher','student','projector']: the same identifier class
 * `stripForProjector` exists to remove from responses, sent to the one screen
 * the whole class is looking at. This pins the fix.
 *
 * There is no PartyKit test harness in the repo, so the room, connections and
 * auth are faked here. The fakes are deliberately thin — they model only what
 * the party actually touches (`room.id`, `room.env`, `room.getConnections()`,
 * `conn.id`, `conn.uri`, `conn.send`, `conn.close`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from './auth';

const authorizeClassroomConnection = vi.fn();
vi.mock('./auth', () => ({
  authorizeClassroomConnection: (...args: unknown[]) =>
    authorizeClassroomConnection(...args),
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
  const room = {
    id: 'sess-1',
    env: {},
    getConnections: () => conns,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const party = new ClassroomSessionServer(room as any);

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
    await party.onConnect(conn as any);
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
