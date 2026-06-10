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

import type { TransportCommand } from '../types';
import { validateConnection } from './auth';

// Track connection metadata (role, userId)
const connectionMeta = new Map<string, { userId: string; role: string }>();

export default class CollabServer implements Party.Server {
  // The connection ID of the room host (first 'owner' to connect)
  private hostConnectionId: string | null = null;
  private hostUserId: string | null = null;
  // Users the host has kicked. Kept in memory for the life of the room (the
  // Durable Object) — when the host leaves and the room is disposed, the bans
  // go with it.
  private bannedUserIds = new Set<string>();

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
   * Validates auth, tags viewer connections, then hands off to y-partykit
   * for Yjs sync and awareness protocol.
   */
  async onConnect(conn: Party.Connection) {
    // Validate auth token from connection URL (pass env for JWKS config)
    const auth = await validateConnection(conn.uri, this.room.env);
    // DEBUG (temporary): what identity did this connection get?
    console.log('[collab] onConnect', {
      connId: conn.id,
      userId: auth?.userId,
      role: auth?.role,
      hostConnectionId: this.hostConnectionId,
    });
    if (auth) {
      // Reject users the host has kicked from this room.
      if (this.bannedUserIds.has(auth.userId)) {
        conn.send(JSON.stringify({ type: 'kicked', reason: 'banned' }));
        conn.close(4403, 'You have been removed from this room');
        return;
      }

      connectionMeta.set(conn.id, { userId: auth.userId, role: auth.role });

      // Tag viewer connections so we can filter Yjs updates
      if (auth.role === 'viewer') {
        conn.setState({ readOnly: true });
      }

      // Track the host connection (first owner to connect)
      if (auth.role === 'owner' && !this.hostConnectionId) {
        this.hostConnectionId = conn.id;
        this.hostUserId = auth.userId;
      }

      // Reject non-owner connections when there is no host
      if (auth.role !== 'owner' && !this.hostConnectionId) {
        conn.send(
          JSON.stringify({ type: 'room:not-found', reason: 'no_host' }),
        );
        conn.close(4404, 'Room does not exist');
        connectionMeta.delete(conn.id);
        return;
      }
    }

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

    // Notify all remaining clients that the room is closing, then kick them
    const closingMsg = JSON.stringify({
      type: 'room:closing',
      reason: 'host_disconnected',
    });
    for (const conn of this.room.getConnections()) {
      conn.send(closingMsg);
      conn.close(4410, 'Host disconnected');
    }
    connectionMeta.clear();
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
            conn.close(4403, 'Kicked by host');
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
