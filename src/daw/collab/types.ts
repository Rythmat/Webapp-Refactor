// ── Real-Time Collaboration Types ────────────────────────────────────────
// Shared type definitions for the Yjs-based collaboration layer.

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
