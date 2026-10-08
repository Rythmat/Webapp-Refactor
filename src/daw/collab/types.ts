// ── Real-Time Collaboration Types ────────────────────────────────────────
// Shared type definitions for the Yjs-based collaboration layer. The PartyKit
// server bundles this file too, so keep it free of imports.

/** Connection lifecycle states. */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/** Room-level permission roles. */
export type CollabRole = 'owner' | 'editor' | 'viewer';

/** User activity indicator shown in the presence panel. */
export type UserActivity =
  | 'idle'
  | 'editing'
  | 'recording'
  | 'playing'
  | 'mixing';

/**
 * Presence state broadcast to all clients via the Yjs awareness protocol.
 * Each field is published to the shared awareness map and read by remote
 * clients to render cursors, track indicators, and the user list.
 */
export interface UserPresence {
  /** Auth0 user ID. */
  userId: string;
  /** Display name. */
  userName: string;
  /** Avatar image URL. */
  avatarUrl: string;
  /** Unique colour assigned from the palette on room join. */
  color: string;

  // ── Location ──────────────────────────────────────────────────────────
  /** Currently selected track (coloured dot on track header). */
  selectedTrackId: string | null;
  /** Currently selected clip (coloured border). */
  selectedClipId: string | null;
  /** Playhead position on the timeline ruler (tick). */
  cursorTick: number | null;
  /** Which track lane the cursor is hovering over. */
  cursorTrackIndex: number | null;

  // ── Piano roll ────────────────────────────────────────────────────────
  /** Ghost cursor position when editing inside a clip. */
  pianoRollCursor: { tick: number; note: number } | null;

  // ── Activity ──────────────────────────────────────────────────────────
  activity: UserActivity;
  /** Unix timestamp of the last meaningful action. */
  lastActiveAt: number;
}

/** A single chat message stored in the Yjs `chat` Y.Array. */
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  /** Unix ms timestamp. */
  timestamp: number;
}

/** Metadata about a shared audio asset stored in the Yjs `assets` Y.Map. */
export interface SharedAudioAsset {
  /** Cloudflare R2 object URL. */
  url: string;
  filename: string;
  sampleRate: number;
  /** Duration in seconds. */
  duration: number;
  /** Auth0 user ID of the uploader. */
  uploadedBy: string;
}

/** Room metadata stored in Upstash Redis (not in the Yjs doc). */
export interface RoomMetadata {
  id: string;
  projectName: string;
  ownerId: string;
  members: RoomMember[];
  createdAt: number;
  lastActiveAt: number;
}

export interface RoomMember {
  userId: string;
  role: CollabRole;
  joinedAt: number;
}

/**
 * Ephemeral transport command sent over the PartyKit WebSocket as a plain
 * JSON message (NOT stored in the Yjs document).
 */
export interface TransportCommand {
  type: 'transport';
  action: 'play' | 'pause' | 'stop' | 'seek';
  /** Tick position (for seek, or starting position for play). */
  tick?: number;
  /** BPM at the time the command was issued. */
  bpm?: number;
  /** Server-assigned timestamp for latency compensation. */
  serverTimestamp: number;
  /** Auth0 user ID of the sender. */
  userId: string;
}

/**
 * Colours assigned round-robin to collaborators.
 * Designed for visibility against both dark and light DAW themes.
 */
export const PRESENCE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
] as const;

/** Transaction origin tags for the Zustand ↔ Yjs bridge loop prevention. */
export const ORIGIN_LOCAL = 'local-zustand' as const;
export const ORIGIN_REMOTE = 'remote-yjs' as const;

// ── Connection handshake (shared by the web client and server/party.ts) ────

/**
 * Shape version of the shared studio Y.Doc. The client sends it on every
 * (re)connect and the server turns away a socket whose version differs from
 * its own, so two builds that lay the document out differently never edit the
 * same room. Bump it with every Y.Doc shape change.
 *
 * Shipping a bump: deploy the web app first, then `npm run partykit:deploy`
 * straight after. In between, the old server turns updated tabs away and
 * they say the session server is being updated (the 4426 reason names the
 * server's version), while older tabs carry on. Once the new server is live,
 * older tabs are told to update, and a refresh lets them back in.
 */
export const COLLAB_DOC_SCHEMA_VERSION = 1;

/** Connection URL query parameter that carries COLLAB_DOC_SCHEMA_VERSION. */
export const COLLAB_DOC_SCHEMA_PARAM = 'docSchemaVersion';

/** The reason the server closes a 4426 with. It names the server's version,
 *  so a client can tell an out-of-date app from a server not yet updated. */
export function versionMismatchReason(
  clientVersion: number,
  serverVersion: number,
): string {
  return `Doc schema mismatch (client=${clientVersion}, server=${serverVersion})`;
}

/** The server's doc schema version named in a 4426 close reason, or null. */
export function serverVersionInReason(
  reason: string | null | undefined,
): number | null {
  const match = /\bserver=(\d+)\b/.exec(reason ?? '');
  return match ? Number(match[1]) : null;
}

/**
 * WebSocket close codes the collab server uses (4000–4999 are app-defined).
 * The server also sends a JSON message before closing for the room states
 * (kicked, full, not found, host left); the handshake failures carry only the
 * code.
 */
export const COLLAB_CLOSE = {
  /** Missing, invalid or expired auth token. */
  unauthorized: 4401,
  /** Kicked by the host, or banned from rejoining. */
  kicked: 4403,
  /** No host is in the room. */
  notFound: 4404,
  /** The room is at capacity. */
  full: 4408,
  /** The host disconnected and the room closed. */
  hostLeft: 4410,
  /** The client's COLLAB_DOC_SCHEMA_VERSION differs from the server's. */
  versionMismatch: 4426,
} as const;
