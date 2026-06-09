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
  roomCode: string | null;
  connectionStatus: ConnectionStatus;

  // ── Presence ──
  /** Remote users, keyed by Yjs awareness client ID. */
  remoteUsers: Map<number, UserPresence>;

  // ── Permissions ──
  localRole: CollabRole;
  collabRole: CollabRole;

  // ── Leave flow ──
  /** When true, the "save project before leaving?" prompt is shown. Set when
   *  the local user clicks Leave, or when the host disconnects. */
  leavePromptPending: boolean;
  /** Error shown when a Join-by-id attempt targets a room that does not exist. */
  roomError: string | null;
  /** When true, the "you were kicked" popup is shown. */
  kickedNotice: boolean;

  // ── Chat ──
  chatMessages: ChatMessage[];
  unreadChatCount: number;

  // ── Actions ──
  /** Called by CollabProvider when the WebSocket connects. */
  _setConnectionStatus: (status: ConnectionStatus) => void;
  /** Called by CollabProvider when joining a room. */
  _setRoomInfo: (roomId: string, role: CollabRole, roomCode?: string) => void;
  /** Called by CollabProvider on disconnect or leave. */
  _clearCollab: () => void;
  /** Called by the presence observer when remote awareness changes. */
  _setRemoteUsers: (users: Map<number, UserPresence>) => void;
  /** Open/close the save-before-leaving prompt. */
  _setLeavePrompt: (pending: boolean) => void;
  /** Set/clear the Join-room error message. */
  _setRoomError: (error: string | null) => void;
  /** Show/hide the "you were kicked from the session" popup. */
  _setKickedNotice: (kicked: boolean) => void;
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
  roomCode: null,
  connectionStatus: 'disconnected',
  remoteUsers: new Map(),
  localRole: 'editor',
  collabRole: 'editor',
  leavePromptPending: false,
  roomError: null,
  kickedNotice: false,
  chatMessages: [],
  unreadChatCount: 0,

  _setConnectionStatus: (status) =>
    set({
      connectionStatus: status,
      isCollabActive: status === 'connected',
    }),

  _setRoomInfo: (roomId, role, roomCode) =>
    set({
      roomId,
      localRole: role,
      collabRole: role,
      roomCode: roomCode ?? null,
    }),

  _clearCollab: () =>
    set({
      isCollabActive: false,
      roomId: null,
      roomCode: null,
      connectionStatus: 'disconnected',
      remoteUsers: new Map(),
      localRole: 'editor',
      collabRole: 'editor',
      leavePromptPending: false,
      roomError: null,
      kickedNotice: false,
      chatMessages: [],
      unreadChatCount: 0,
    }),

  _setRemoteUsers: (users) => set({ remoteUsers: users }),

  _setLeavePrompt: (pending) => set({ leavePromptPending: pending }),

  _setRoomError: (error) => set({ roomError: error }),

  _setKickedNotice: (kicked) => set({ kickedNotice: kicked }),

  _appendChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, msg],
      unreadChatCount: s.unreadChatCount + 1,
    })),

  markChatRead: () => set({ unreadChatCount: 0 }),
});
