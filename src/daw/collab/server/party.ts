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
    if (auth) {
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
  async onClose(conn: Party.Connection) {
    const meta = connectionMeta.get(conn.id);
    connectionMeta.delete(conn.id);

    // Check if the disconnecting connection is the host
    if (conn.id === this.hostConnectionId) {
      await this.handleHostDisconnect();
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
        await this.handleHostDisconnect();
      }
    }
  }

  /**
   * Broadcast room:closing to all remaining clients and call the API
   * webhook to mark the room as closed in the database.
   */
  private async handleHostDisconnect(): Promise<void> {
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

    // Call the API to mark the room as closed
    // The room ID in PartyKit is the database room ID (or jam-{id})
    const rawRoomId = this.room.id;
    const roomId = rawRoomId.startsWith('jam-')
      ? rawRoomId.slice(4)
      : rawRoomId;

    const apiUrl = this.room.env.MUSIC_ATLAS_API_URL as string | undefined;
    const webhookSecret = this.room.env.PARTYKIT_WEBHOOK_SECRET as
      | string
      | undefined;

    if (apiUrl && webhookSecret) {
      try {
        await fetch(`${apiUrl}/api/collab/rooms/webhook/host-disconnected`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${webhookSecret}`,
          },
          body: JSON.stringify({ roomId }),
        });
      } catch (err) {
        console.error('Failed to notify API of host disconnect:', err);
      }
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

      // Jam Room: relay note and chat messages to all other clients
      if (data.type === 'jam:note' || data.type === 'jam:chat') {
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
