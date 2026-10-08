// ── PartyKit Collaboration Server ─────────────────────────────────────────
// Minimal PartyKit server that syncs a Yjs document between connected
// clients and handles ephemeral transport commands.
//
// The room persists only while the host is connected. When the host
// disconnects, all remaining clients are notified and the room is closed
// via the Music Atlas API webhook.
//
// Deploy: `npx partykit deploy` from this directory.
// Dev:    `npx partykit dev` for local testing.

import type * as Party from 'partykit/server';
import { onConnect } from 'y-partykit';

import {
  COLLAB_CLOSE,
  COLLAB_DOC_SCHEMA_PARAM,
  COLLAB_DOC_SCHEMA_VERSION,
  versionMismatchReason,
  type CollabRole,
  type TransportCommand,
} from '../types';
import { validateConnection } from './auth';

// Track connection metadata (role, userId)
const connectionMeta = new Map<string, { userId: string; role: string }>();

// Maximum distinct users allowed in a room. Caps collaboration cost (PartyKit
// message fan-out) and keeps the WebRTC audio mesh within a workable size.
const MAX_ROOM_USERS = 5;

// Clients from before the version handshake send no version. They lay the
// document out as version 1, so they are read as that rather than shut out.
// Fixed forever: it describes those old builds, not the current schema.
const PRE_HANDSHAKE_DOC_SCHEMA_VERSION = 1;

/** The studio doc schema version a connection URL asks for (NaN if garbled). */
function docSchemaVersionOf(uri: string): number {
  try {
    const raw = new URL(uri).searchParams.get(COLLAB_DOC_SCHEMA_PARAM);
    return raw === null ? PRE_HANDSHAKE_DOC_SCHEMA_VERSION : Number(raw);
  } catch {
    return NaN;
  }
}

export default class CollabServer implements Party.Server {
  // The connection ID of the room host (first 'owner' to connect)
  private hostConnectionId: string | null = null;
  private hostUserId: string | null = null;
  // Users the host has kicked. Kept in memory for the life of the room (the
  // Durable Object) — when the host leaves and the room is disposed, the bans
  // go with it.
  private bannedUserIds = new Set<string>();

  // The collab_room record id for this room, set when the host registers it with
  // the Music Atlas API on connect and used to close it on host disconnect.
  // Best-effort — the live session works regardless of backend tracking.
  private backendRoomId: string | null = null;
  private roomRegistered = false;

  constructor(public room: Party.Room) {}

  /**
   * HTTP endpoint for room status checks.
   * GET → { active: boolean, connections: number }
   */
  async onRequest(req: Party.Request) {
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          active: this.hostConnectionId !== null,
          connections: connectionMeta.size,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    return new Response('Method not allowed', { status: 405 });
  }

  /**
   * Handle a new WebSocket connection.
   * Checks the client's doc schema version and auth, tags viewer connections,
   * then hands off to y-partykit for Yjs sync and awareness protocol.
   */
  async onConnect(conn: Party.Connection) {
    const isJamRoom = this.room.id.startsWith('jam-');

    // Version handshake, before any Yjs sync: a build that lays the studio
    // document out differently must not edit this room. Jam rooms are exempt —
    // they use the socket for presence and relays and never sync a document.
    // Checked before auth so an out-of-date app is told to update, not to sign
    // in again.
    if (!isJamRoom) {
      const clientVersion = docSchemaVersionOf(conn.uri);
      if (clientVersion !== COLLAB_DOC_SCHEMA_VERSION) {
        conn.close(
          COLLAB_CLOSE.versionMismatch,
          versionMismatchReason(clientVersion, COLLAB_DOC_SCHEMA_VERSION),
        );
        return;
      }
    }

    // Validate auth token from connection URL (pass env for JWKS config)
    const auth = await validateConnection(conn.uri, this.room.env);
    // DEBUG (temporary): what identity did this connection get?
    console.log('[collab] onConnect', {
      connId: conn.id,
      userId: auth?.userId,
      role: auth?.role,
      hostConnectionId: this.hostConnectionId,
    });
    if (!auth) {
      // Jam rooms keep the old path for now: an unverified socket goes
      // straight to the sync, past the checks below. JamRoomProvider still
      // reconnects with the token it joined with, through y-partykit's own
      // loop, so once that token expired a 4401 here would reopen the socket
      // about ten times a second. Close this gap once it fetches a fresh
      // token per connect and stops after repeated 4401s, as CollabProvider
      // does.
      if (isJamRoom) return this.syncDocument(conn);
      // Fail closed: a socket without a verified identity never reaches the
      // Yjs sync, so a room code alone can't read or write a session, and bans
      // and the user cap apply to everyone. The client reconnects with a fresh
      // token.
      conn.close(COLLAB_CLOSE.unauthorized, 'Unauthorized');
      return;
    }

    // Reject users the host has kicked from this room.
    if (this.bannedUserIds.has(auth.userId)) {
      conn.send(JSON.stringify({ type: 'kicked', reason: 'banned' }));
      conn.close(COLLAB_CLOSE.kicked, 'You have been removed from this room');
      return;
    }

    // Authoritative role — the client's requested role is NOT trusted for
    // 'owner'. Only the room host is owner: the user who already owns the
    // room, or (before any host exists) the first connection claiming owner,
    // which is the room's creator. Everyone else is clamped to editor/viewer
    // so a joiner can't self-assign owner. (Fine-grained editor-vs-viewer
    // enforcement per invite needs backend membership records — a follow-up.)
    const isHost =
      auth.userId === this.hostUserId ||
      (!this.hostConnectionId && auth.role === 'owner');
    const role: CollabRole = isHost
      ? 'owner'
      : auth.role === 'viewer'
        ? 'viewer'
        : 'editor';

    // Enforce room capacity (distinct users). The host is always admitted —
    // the room can't exist without them — and a reconnect / second tab from a
    // user who is already present does not consume an additional slot.
    if (role !== 'owner') {
      const users = new Set<string>();
      for (const [, m] of connectionMeta) users.add(m.userId);
      if (!users.has(auth.userId) && users.size >= MAX_ROOM_USERS) {
        conn.send(JSON.stringify({ type: 'room:full', reason: 'capacity' }));
        conn.close(COLLAB_CLOSE.full, 'Room is full');
        return;
      }
    }

    connectionMeta.set(conn.id, { userId: auth.userId, role });

    // Tag viewer connections so we can filter Yjs updates
    if (role === 'viewer') {
      conn.setState({ readOnly: true });
    }

    // Track the host connection (first owner to connect)
    if (role === 'owner' && !this.hostConnectionId) {
      this.hostConnectionId = conn.id;
      this.hostUserId = auth.userId;
      // Record this running room (+ host) in the backend, best-effort.
      void this.registerBackendRoom(auth.userId);
    }

    // Reject non-owner connections when there is no host
    if (role !== 'owner' && !this.hostConnectionId) {
      conn.send(JSON.stringify({ type: 'room:not-found', reason: 'no_host' }));
      conn.close(COLLAB_CLOSE.notFound, 'Room does not exist');
      connectionMeta.delete(conn.id);
      return;
    }

    return this.syncDocument(conn);
  }

  /** Hand an admitted socket to y-partykit for the Yjs sync and awareness. */
  private syncDocument(conn: Party.Connection) {
    return onConnect(conn, this.room, {
      // Persist the Yjs document to Cloudflare Durable Objects.
      persist: { mode: 'snapshot' },
      // Callback to intercept Yjs update messages from viewers
      callback: {
        handler: async (yDoc) => {
          // No-op — we don't need to process Yjs updates server-side.
          // Viewer filtering is handled in onMessage below.
          void yDoc;
        },
      },
    });
  }

  /**
   * Handle disconnect — clean up metadata.
   * If the host disconnects, notify all clients and close the room via API.
   */
  onClose(conn: Party.Connection) {
    const meta = connectionMeta.get(conn.id);
    connectionMeta.delete(conn.id);

    // Check if the disconnecting connection is the host
    if (conn.id === this.hostConnectionId) {
      this.handleHostDisconnect();
    } else if (meta && meta.userId === this.hostUserId) {
      // Host may have reconnected with a different connection ID —
      // check if any remaining connection belongs to the host
      let hostStillConnected = false;
      for (const [, m] of connectionMeta) {
        if (m.userId === this.hostUserId) {
          hostStillConnected = true;
          break;
        }
      }
      if (!hostStillConnected) {
        this.handleHostDisconnect();
      }
    }
  }

  /**
   * Broadcast room:closing to all remaining clients and kick them. Studio and
   * jam rooms are ephemeral — there is no backend room record to mark closed —
   * so when the host disconnects the room simply ceases to exist.
   */
  private handleHostDisconnect(): void {
    this.hostConnectionId = null;

    // Mark the backend room record closed (best-effort).
    void this.closeBackendRoom();

    // Notify all remaining clients that the room is closing, then kick them
    const closingMsg = JSON.stringify({
      type: 'room:closing',
      reason: 'host_disconnected',
    });
    for (const conn of this.room.getConnections()) {
      conn.send(closingMsg);
      conn.close(COLLAB_CLOSE.hostLeft, 'Host disconnected');
    }
    connectionMeta.clear();
  }

  /**
   * Record this running room (+ its host) in the Music Atlas API so active
   * collab rooms and their hosts are tracked server-side. Server-to-server
   * (PARTYKIT_WEBHOOK_SECRET) and best-effort — never blocks or fails the live
   * session. The returned collab_room id is kept to close the room on disconnect.
   */
  private async registerBackendRoom(hostId: string): Promise<void> {
    if (this.roomRegistered) return;
    this.roomRegistered = true;

    const apiUrl = this.room.env.MUSIC_ATLAS_API_URL as string | undefined;
    const secret = this.room.env.PARTYKIT_WEBHOOK_SECRET as string | undefined;
    if (!apiUrl || !secret) return;

    const type = this.room.id.startsWith('jam-') ? 'jam' : 'daw';

    try {
      const res = await fetch(`${apiUrl}/rooms/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ roomKey: this.room.id, hostId, type }),
      });
      if (res.ok) {
        // API responses are SuperJSON-wrapped ({ json, meta }).
        const body = (await res.json()) as {
          json?: { id?: string };
          id?: string;
        };
        this.backendRoomId = body.json?.id ?? body.id ?? null;
      }
    } catch {
      // Best-effort: backend tracking is non-critical to the live session.
    }
  }

  /** Mark this room's backend record closed on host disconnect (best-effort). */
  private async closeBackendRoom(): Promise<void> {
    const roomId = this.backendRoomId;
    if (!roomId) return;
    this.backendRoomId = null;

    const apiUrl = this.room.env.MUSIC_ATLAS_API_URL as string | undefined;
    const secret = this.room.env.PARTYKIT_WEBHOOK_SECRET as string | undefined;
    if (!apiUrl || !secret) return;

    try {
      await fetch(`${apiUrl}/rooms/webhook/host-disconnected`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ roomId }),
      });
    } catch {
      // Best-effort.
    }
  }

  /**
   * Handle non-Yjs messages (transport commands, chat, etc.).
   * Yjs sync messages are binary and handled internally by y-partykit;
   * our custom messages are JSON strings.
   */
  async onMessage(message: string, sender: Party.Connection) {
    // Only process string messages (Yjs binary messages are handled by y-partykit)
    if (typeof message !== 'string') return;

    // Viewers cannot send transport commands
    const meta = connectionMeta.get(sender.id);
    if (meta?.role === 'viewer') return;

    try {
      const data = JSON.parse(message);

      if (data.type === 'collab:kick') {
        // DEBUG (temporary): trace the kick on the server.
        console.log('[kick] received', {
          senderId: sender.id,
          hostConnectionId: this.hostConnectionId,
          isHost: sender.id === this.hostConnectionId,
          targetUserId: data.targetUserId,
          connections: [...this.room.getConnections()].map((c) => ({
            id: c.id,
            userId: connectionMeta.get(c.id)?.userId,
          })),
        });
        // Only the host may kick, and the host can't kick themselves.
        if (sender.id !== this.hostConnectionId) return;
        const targetUserId = String(data.targetUserId ?? '');
        if (!targetUserId || targetUserId === this.hostUserId) return;
        this.bannedUserIds.add(targetUserId);
        // Close every connection belonging to the kicked user.
        let closed = 0;
        for (const conn of this.room.getConnections()) {
          if (connectionMeta.get(conn.id)?.userId === targetUserId) {
            conn.send(JSON.stringify({ type: 'kicked', reason: 'kicked' }));
            conn.close(COLLAB_CLOSE.kicked, 'Kicked by host');
            connectionMeta.delete(conn.id);
            closed += 1;
          }
        }
        console.log('[kick] closed connections:', closed);
        return;
      }

      if (data.type === 'transport') {
        // Add server timestamp for latency compensation
        const cmd: TransportCommand = {
          ...data,
          serverTimestamp: Date.now(),
        };
        // Broadcast to all OTHER clients (sender already applied locally)
        for (const conn of this.room.getConnections()) {
          if (conn.id !== sender.id) {
            conn.send(JSON.stringify(cmd));
          }
        }
      }

      // Jam Room: relay note, chat, and shared-drum messages to other clients.
      // `jam:drum-sync-request` is relayed so the host can answer a late joiner;
      // `jam:drum-grid` / `jam:drum-mode` carry the shared sequencer state;
      // `jam:drum-transport` carries the room-wide play/stop/tempo timeline;
      // `jam:studio-invite` hands the room a collaborative Studio room code.
      if (
        data.type === 'jam:note' ||
        data.type === 'jam:chat' ||
        data.type === 'jam:drum-grid' ||
        data.type === 'jam:drum-mode' ||
        data.type === 'jam:drum-sync-request' ||
        data.type === 'jam:drum-transport' ||
        data.type === 'jam:studio-invite'
      ) {
        for (const conn of this.room.getConnections()) {
          if (conn.id !== sender.id) {
            conn.send(JSON.stringify(data));
          }
        }
      }

      // Studio live monitoring: relay live MIDI notes and WebRTC signaling to
      // other clients. These are ephemeral (never touch the Yjs doc) and let a
      // user hear collaborators' live playing. Each client filters by the `to`
      // field for directed (RTC) messages.
      if (
        typeof data.type === 'string' &&
        (data.type as string).startsWith('studio:')
      ) {
        for (const conn of this.room.getConnections()) {
          if (conn.id !== sender.id) {
            conn.send(JSON.stringify(data));
          }
        }
      }

      if (data.type === 'ping') {
        // RTT measurement — echo back with server timestamp
        sender.send(
          JSON.stringify({
            type: 'pong',
            clientTimestamp: data.clientTimestamp,
            serverTimestamp: Date.now(),
          }),
        );
      }
    } catch {
      // Ignore malformed messages
    }
  }
}
