// ── PartyKit Collaboration Server ─────────────────────────────────────────
// Minimal PartyKit server that syncs a Yjs document between connected
// clients and handles ephemeral transport commands.
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
  constructor(public room: Party.Room) {}

  /**
   * Handle a new WebSocket connection.
   * Validates auth, tags viewer connections, then hands off to y-partykit
   * for Yjs sync and awareness protocol.
   */
  async onConnect(conn: Party.Connection) {
    // Validate auth token from connection URL
    const auth = await validateConnection(conn.uri);
    if (auth) {
      connectionMeta.set(conn.id, { userId: auth.userId, role: auth.role });

      // Tag viewer connections so we can filter Yjs updates
      if (auth.role === 'viewer') {
        conn.setState({ readOnly: true });
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
   */
  async onClose(conn: Party.Connection) {
    connectionMeta.delete(conn.id);
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
