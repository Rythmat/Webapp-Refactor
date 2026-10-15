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
  /** When true, a join is retrying because the host hasn't created the room yet
   *  (a jam→studio joiner beat the host to it). Drives the waiting popup. */
  awaitingSessionCreation: boolean;
  /** True once the local user has saved this collab session to their account.
   *  Gates the "delete the unsaved draft project on leave" cleanup — we only
   *  reclaim the auto-created draft + its assets when NO save was made. Reset
   *  when a new session starts. */
  sessionSaved: boolean;
  /** Whether the open project held no tracks or chord regions when this
   *  session started. Only then is everything in it session work: a host's
   *  room is seeded from their own project, and a joiner's project is their own
   *  until the first sync, so a session that began with work may be holding
   *  the student's earlier work, saved or not. */
  sessionStartedEmpty: boolean;
  /** The draft project this session minted (ensureProjectId creates one on the
   *  first record-stop or upload when no project is open). The only project the
   *  leave prompt may delete: only if the session started empty and nothing
   *  was saved. */
  sessionDraftProjectId: string | null;

  /** When true, an external flow (e.g. the Studio Dashboard "Start a Session")
   *  has requested the Invite Collaborators modal be opened. CollabToolbar owns
   *  the modal; it consumes + clears this flag. Avoids a second modal instance. */
  inviteRequested: boolean;

  // ── Chat ──
  chatMessages: ChatMessage[];
  unreadChatCount: number;

  // ── Actions ──
  /** Called by CollabProvider when the WebSocket connects. */
  _setConnectionStatus: (status: ConnectionStatus) => void;
  /** Called by CollabProvider when joining a room. Joining a different room
   *  starts a new session (see sessionStartedEmpty); joining the room we
   *  already belong to — an SPA return or an await-host retry — continues the
   *  current one. */
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
  /** Show/hide the "waiting on session creation" popup while a join retries. */
  _setAwaitingSession: (waiting: boolean) => void;
  /** Record that the local user has saved this session (see sessionSaved). */
  _markSessionSaved: () => void;
  /** Record the draft project this session minted (see sessionDraftProjectId). */
  _setSessionDraftProjectId: (projectId: string) => void;
  /** Append a chat message (from local send or remote receive). */
  _appendChatMessage: (msg: ChatMessage) => void;
  /** Reset unread count (user opened chat panel). */
  markChatRead: () => void;
  /** Request (or clear) opening the Invite Collaborators modal. */
  _setInviteRequested: (requested: boolean) => void;
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
  awaitingSessionCreation: false,
  sessionSaved: false,
  sessionStartedEmpty: false,
  sessionDraftProjectId: null,
  inviteRequested: false,
  chatMessages: [],
  unreadChatCount: 0,

  _setConnectionStatus: (status) =>
    set({
      connectionStatus: status,
      isCollabActive: status === 'connected',
      // A successful connect resolves any pending "waiting for host" retry.
      ...(status === 'connected' ? { awaitingSessionCreation: false } : {}),
    }),

  _setRoomInfo: (roomId, role, roomCode) =>
    set((s) => ({
      roomId,
      localRole: role,
      collabRole: role,
      roomCode: roomCode ?? null,
      // A new session: no save yet, no draft yet, and whatever the open
      // project holds now predates it. Rejoining the same room keeps all
      // three: by then a joiner's project is the room's, and a draft saved
      // before an SPA round trip must not become deletable again.
      ...(s.roomId === roomId
        ? {}
        : {
            sessionSaved: false,
            sessionStartedEmpty:
              s.tracks.length === 0 && s.chordRegions.length === 0,
            sessionDraftProjectId: null,
          }),
    })),

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
      awaitingSessionCreation: false,
      sessionSaved: false,
      sessionStartedEmpty: false,
      sessionDraftProjectId: null,
      inviteRequested: false,
      chatMessages: [],
      unreadChatCount: 0,
    }),

  _setRemoteUsers: (users) => set({ remoteUsers: users }),

  _setLeavePrompt: (pending) => set({ leavePromptPending: pending }),

  _setRoomError: (error) => set({ roomError: error }),

  _setKickedNotice: (kicked) => set({ kickedNotice: kicked }),

  _setAwaitingSession: (waiting) => set({ awaitingSessionCreation: waiting }),

  _markSessionSaved: () => set({ sessionSaved: true }),

  _setSessionDraftProjectId: (projectId) =>
    set({ sessionDraftProjectId: projectId }),

  _appendChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, msg],
      unreadChatCount: s.unreadChatCount + 1,
    })),

  markChatRead: () => set({ unreadChatCount: 0 }),

  _setInviteRequested: (requested) => set({ inviteRequested: requested }),
});
