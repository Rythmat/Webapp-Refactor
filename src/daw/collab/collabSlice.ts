// ── Collab Slice ─────────────────────────────────────────────────────────
// Zustand slice for collaboration state: connection lifecycle, presence,
// transport linking, and chat. This is the 12th slice added to AllSlices.

import type { StateCreator } from 'zustand';
import type { AllSlices } from '@/daw/store/index';
import type {
  ConnectionStatus,
  CollabRole,
  UserPresence,
  ChatMessage,
} from './types';

// ── Slice interface ─────────────────────────────────────────────────────

export interface CollabSlice {
  // ── Connection ──
  isCollabActive: boolean;
  roomId: string | null;
  connectionStatus: ConnectionStatus;

  // ── Presence ──
  /** Remote users, keyed by Yjs awareness client ID. */
  remoteUsers: Map<number, UserPresence>;

  // ── Permissions ──
  localRole: CollabRole;

  // ── Transport sync ──
  /** When true, this client follows remote transport commands. */
  transportLinked: boolean;

  // ── Chat ──
  chatMessages: ChatMessage[];
  unreadChatCount: number;

  // ── Actions ──
  /** Called by CollabProvider when the WebSocket connects. */
  _setConnectionStatus: (status: ConnectionStatus) => void;
  /** Called by CollabProvider when joining a room. */
  _setRoomInfo: (roomId: string, role: CollabRole) => void;
  /** Called by CollabProvider on disconnect or leave. */
  _clearCollab: () => void;
  /** Called by the presence observer when remote awareness changes. */
  _setRemoteUsers: (users: Map<number, UserPresence>) => void;
  /** Toggle transport linking on/off. */
  setTransportLinked: (linked: boolean) => void;
  /** Append a chat message (from local send or remote receive). */
  _appendChatMessage: (msg: ChatMessage) => void;
  /** Reset unread count (user opened chat panel). */
  markChatRead: () => void;
}

// ── Slice creator ───────────────────────────────────────────────────────

export const createCollabSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  CollabSlice
> = (set) => ({
  isCollabActive: false,
  roomId: null,
  connectionStatus: 'disconnected',
  remoteUsers: new Map(),
  localRole: 'editor',
  transportLinked: true,
  chatMessages: [],
  unreadChatCount: 0,

  _setConnectionStatus: (status) =>
    set({
      connectionStatus: status,
      isCollabActive: status === 'connected',
    }),

  _setRoomInfo: (roomId, role) =>
    set({ roomId, localRole: role }),

  _clearCollab: () =>
    set({
      isCollabActive: false,
      roomId: null,
      connectionStatus: 'disconnected',
      remoteUsers: new Map(),
      localRole: 'editor',
      chatMessages: [],
      unreadChatCount: 0,
    }),

  _setRemoteUsers: (users) => set({ remoteUsers: users }),

  setTransportLinked: (linked) => set({ transportLinked: linked }),

  _appendChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, msg],
      unreadChatCount: s.unreadChatCount + 1,
    })),

  markChatRead: () => set({ unreadChatCount: 0 }),
});
