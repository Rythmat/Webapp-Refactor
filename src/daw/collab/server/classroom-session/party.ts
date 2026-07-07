// ── Classroom Session — PartyKit server ───────────────────────────────────
// Realtime fan-out for a live classroom session (one room per sessionId, party
// name `classroom-session`). This is the transport half of Classroom v2:
//
//   • Teacher state (nav / lock / share / mode / end) and student responses are
//     persisted by the Music Atlas API over REST, then POSTed to this party's
//     onRequest (authenticated by PARTYKIT_WEBHOOK_SECRET) for fan-out. The
//     socket never accepts state mutations from clients — it is pure fan-out.
//   • Role routing enforces Rule 2: teachers see full `response` events;
//     projectors see identifier-stripped events, and only for the currently
//     shared interaction; students never receive peer responses.
//
// Deploy: `npx partykit deploy` from src/daw/collab/server (registered as a
// secondary party in partykit.json). Auth is resolved server-side via the API
// (see auth.ts) — the socket `role` param is only a request.

import type * as Party from 'partykit/server';

import { authorizeClassroomConnection, type Role } from './auth';
import { stripForProjector, type ResponseBroadcast } from './firewall';

type PresenceState = 'joined' | 'active' | 'idle' | 'left';

interface ConnMeta {
  userId: string;
  role: Role;
  enrollmentId: string | null;
  lastSeen: number;
  lastPresence: PresenceState;
}

// Fan-out messages the API POSTs to onRequest (each also carries `at`).
type NavMsg = {
  type: 'nav';
  phase: string;
  interactionIndex: number;
  focusOpen: boolean;
};
type LockMsg = { type: 'lock'; on: boolean };
type ShareMsg = { type: 'share'; interactionId: string; on: boolean };
type ModeMsg = { type: 'mode'; value: 'teacher_paced' | 'student_paced' };
type EndMsg = { type: 'end' };
type InboundMsg =
  | NavMsg
  | LockMsg
  | ShareMsg
  | ModeMsg
  | EndMsg
  | ResponseBroadcast;

const PRESENCE_TICK_MS = 5_000;
const ACTIVE_WINDOW_MS = 15_000;
const IDLE_TIMEOUT_MS = 60_000;

export default class ClassroomSessionServer implements Party.Server {
  private meta = new Map<string, ConnMeta>();
  private currentShare: { interactionId: string; on: boolean } | null = null;
  private ended = false;
  private presenceTimer: ReturnType<typeof setInterval> | null = null;

  constructor(public room: Party.Room) {}

  // ── HTTP: server→party fan-out + status ────────────────────────────────
  async onRequest(req: Party.Request) {
    if (req.method === 'GET') {
      return this.json({ active: !this.ended, connections: this.meta.size });
    }
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const secret = this.room.env.PARTYKIT_WEBHOOK_SECRET as string | undefined;
    const provided = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!secret || provided !== secret) {
      return new Response('Unauthorized', { status: 401 });
    }

    let msg: InboundMsg;
    try {
      msg = (await req.json()) as InboundMsg;
    } catch {
      return new Response('Bad request', { status: 400 });
    }

    await this.route(msg);
    return this.json({ ok: true });
  }

  private async route(msg: InboundMsg): Promise<void> {
    switch (msg.type) {
      case 'share':
        this.currentShare = { interactionId: msg.interactionId, on: msg.on };
        this.broadcast(msg, ['teacher', 'student', 'projector']);
        break;
      case 'nav':
      case 'lock':
      case 'mode':
        this.broadcast(msg, ['teacher', 'student', 'projector']);
        break;
      case 'end':
        this.handleEnd();
        break;
      case 'response':
        await this.routeResponse(msg);
        break;
      default:
        break;
    }
  }

  /** Rule 2 response fan-out. */
  private async routeResponse(msg: ResponseBroadcast): Promise<void> {
    // Teachers get the full, identified event.
    this.broadcast(msg, ['teacher']);

    // Projectors get an identifier-stripped copy, but only while this exact
    // interaction is actively shared.
    const shared =
      this.currentShare?.on &&
      this.currentShare.interactionId === msg.interactionId;
    if (shared && this.hasRole('projector')) {
      const stripped = await stripForProjector(msg);
      this.broadcast(stripped, ['projector']);
    }

    // Students never receive peer responses — nothing sent here.
  }

  private handleEnd(): void {
    this.ended = true;
    this.broadcast({ type: 'end' }, ['teacher', 'student', 'projector']);
    for (const conn of this.room.getConnections()) {
      conn.close(4002, 'session ended');
    }
    this.meta.clear();
    this.stopPresence();
  }

  // ── WebSocket lifecycle ────────────────────────────────────────────────
  async onConnect(conn: Party.Connection) {
    if (this.ended) {
      conn.close(4002, 'session ended');
      return;
    }

    const result = await authorizeClassroomConnection({
      url: conn.uri,
      sessionId: this.room.id,
      env: this.room.env,
    });

    if (!result.ok) {
      if (result.reason === 'ended') {
        this.ended = true;
        conn.close(4002, 'session ended');
      } else {
        // Invalid token, not a member, or unknown session.
        conn.close(4001, 'unauthorized');
      }
      return;
    }

    const { auth } = result;
    const now = Date.now();
    this.meta.set(conn.id, {
      userId: auth.userId,
      role: auth.role,
      enrollmentId: auth.enrollmentId,
      lastSeen: now,
      lastPresence: 'joined',
    });

    // Size the initial UI without a REST round-trip.
    conn.send(
      JSON.stringify({ type: 'hello', session: auth.session, role: auth.role }),
    );

    // Announce presence for enrolled students (teachers/projectors are not
    // tracked in the roster presence stream).
    if (auth.enrollmentId) {
      this.emitPresence([{ enrollmentId: auth.enrollmentId, state: 'joined' }]);
    }

    this.startPresence();
  }

  onMessage(message: string, sender: Party.Connection) {
    if (typeof message !== 'string') return;
    const meta = this.meta.get(sender.id);
    if (!meta) return;

    meta.lastSeen = Date.now();

    // The socket accepts no state writes from clients — only heartbeats. All
    // mutations flow through the REST API, which re-broadcasts via onRequest.
    try {
      const data = JSON.parse(message) as { type?: string; t?: number };
      if (data.type === 'ping') {
        sender.send(
          JSON.stringify({ type: 'pong', t: data.t, at: this.nowIso() }),
        );
        // A heartbeat may flip an idle student back to active.
        if (meta.enrollmentId && meta.lastPresence === 'idle') {
          meta.lastPresence = 'active';
          this.emitPresence([
            { enrollmentId: meta.enrollmentId, state: 'active' },
          ]);
        }
      }
    } catch {
      // Ignore malformed messages.
    }
  }

  onClose(conn: Party.Connection) {
    const meta = this.meta.get(conn.id);
    this.meta.delete(conn.id);
    if (meta?.enrollmentId) {
      this.emitPresence([{ enrollmentId: meta.enrollmentId, state: 'left' }]);
    }
    if (this.meta.size === 0) this.stopPresence();
  }

  // ── Presence ───────────────────────────────────────────────────────────
  private startPresence() {
    if (this.presenceTimer) return;
    this.presenceTimer = setInterval(
      () => this.tickPresence(),
      PRESENCE_TICK_MS,
    );
  }

  private stopPresence() {
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
  }

  private tickPresence() {
    const now = Date.now();
    const deltas: { enrollmentId: string; state: PresenceState }[] = [];

    for (const conn of this.room.getConnections()) {
      const meta = this.meta.get(conn.id);
      if (!meta) continue;
      const age = now - meta.lastSeen;

      if (age > IDLE_TIMEOUT_MS) {
        // Drop idle sockets; the client reconnects if the session is still live.
        conn.close(4003, 'idle_timeout');
        continue;
      }
      if (!meta.enrollmentId) continue;

      const next: PresenceState = age <= ACTIVE_WINDOW_MS ? 'active' : 'idle';
      if (next !== meta.lastPresence) {
        meta.lastPresence = next;
        deltas.push({ enrollmentId: meta.enrollmentId, state: next });
      }
    }

    if (deltas.length) this.emitPresence(deltas);
  }

  private emitPresence(
    delta: { enrollmentId: string; state: PresenceState }[],
  ) {
    this.broadcast({ type: 'presence', at: this.nowIso(), delta }, [
      'teacher',
      'student',
      'projector',
    ]);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private hasRole(role: Role): boolean {
    for (const m of this.meta.values()) if (m.role === role) return true;
    return false;
  }

  private broadcast(payload: unknown, roles: Role[]) {
    const text = JSON.stringify(payload);
    for (const conn of this.room.getConnections()) {
      const meta = this.meta.get(conn.id);
      if (meta && roles.includes(meta.role)) conn.send(text);
    }
  }

  private json(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private nowIso(): string {
    return new Date().toISOString();
  }
}
