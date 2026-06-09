// ── CollabProvider ────────────────────────────────────────────────────────
// React context that manages the Yjs document lifecycle, PartyKit WebSocket
// connection, presence awareness, and the Zustand ↔ Yjs bridge.
//
// Wrap the DAW component tree with <CollabProvider> to enable collaboration.
// When no room is joined, the provider is inert (no WebSocket, no Yjs sync).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import YPartyKitProvider from 'y-partykit/provider';
import { Awareness } from 'y-protocols/awareness.js';
import { Env } from '@/constants/env';

import { useStore } from '@/daw/store/index';
import {
  getOrCreateDoc,
  destroyDoc,
  hydrateDocFromStore,
  getYChat,
} from './YjsDocManager';
import { ZustandYjsBridge } from './ZustandYjsBridge';
import { setBridge } from './collabMiddleware';
import { initCollabUndo, destroyCollabUndo } from '@/daw/store/undoMiddleware';
import {
  PRESENCE_COLORS,
  type CollabRole,
  type UserPresence,
  type TransportCommand,
  type ChatMessage,
} from './types';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { toast } from '@/hooks/use-toast';

// ── Context ─────────────────────────────────────────────────────────────

interface CollabContextValue {
  /** Create an ephemeral room (client-generated id) and join it as host. */
  createAndJoinRoom: () => void;
  /** Join an existing room by ID. */
  joinRoomById: (roomId: string, role?: CollabRole) => void;
  /** Join using pre-fetched room info (partykitHost + partykitRoom). */
  joinRoom: (
    roomId: string,
    role?: CollabRole,
    partykitHost?: string,
    partykitRoom?: string,
    roomCode?: string,
  ) => void;
  /** Leave the current room and tear down all sync infrastructure. */
  leaveRoom: () => void;
  /** Send a transport command to all peers. */
  sendTransportCommand: (
    cmd: Omit<TransportCommand, 'serverTimestamp' | 'userId'>,
  ) => void;
  /** Send a chat message to the room (synced + persisted via the Yjs doc). */
  sendChatMessage: (text: string) => void;
  /** Host-only: remove a user from the room and block them from rejoining. */
  kickUser: (userId: string) => void;
  /** The Yjs awareness instance (for presence). Null if not connected. */
  awareness: Awareness | null;
}

const CollabContext = createContext<CollabContextValue>({
  createAndJoinRoom: () => {},
  joinRoomById: () => {},
  joinRoom: () => {},
  leaveRoom: () => {},
  sendTransportCommand: () => {},
  sendChatMessage: () => {},
  kickUser: () => {},
  awareness: null,
});

export function useCollab() {
  return useContext(CollabContext);
}

// ── Provider ────────────────────────────────────────────────────────────

const DEFAULT_PARTYKIT_HOST =
  Env.get('VITE_PARTYKIT_HOST', { nullable: true }) ?? 'localhost:1999';

interface CollabProviderProps {
  children: ReactNode;
}

export function CollabProvider({ children }: CollabProviderProps) {
  const { userId, appUser, token } = useAuthContext();
  const bridgeRef = useRef<ZustandYjsBridge | null>(null);
  const providerRef = useRef<YPartyKitProvider | null>(null);
  const idbRef = useRef<IndexeddbPersistence | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const chatUnobserveRef = useRef<(() => void) | null>(null);
  // Points at leaveRoom so the (stable) message handler can tear down on kick.
  const leaveRoomRef = useRef<() => void>(() => {});

  // ── Transport + room:closing message handler ──────────────────────────

  const handleServerMessage = useCallback((event: MessageEvent) => {
    if (typeof event.data !== 'string') return;
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'room:closing') {
        // Host disconnected. Remaining (non-owner) users are offered the chance
        // to save the project to their own account before the session ends.
        const store = useStore.getState();
        store._setConnectionStatus('disconnected');
        if (store.collabRole !== 'owner') store._setLeavePrompt(true);
        return;
      }

      if (data.type === 'room:not-found') {
        // Join-by-id targeted a room with no active host, or a room the user
        // has been kicked from (the server rejects banned users up front).
        useStore
          .getState()
          ._setRoomError(
            'That room is not active. Check the room id and try again.',
          );
        return;
      }

      if (data.type === 'kicked') {
        // The host removed us (or we tried to rejoin after being kicked). Tear
        // down the session — the project stays loaded, so the user lands in a
        // local studio — and show the "you were kicked" popup. The notice is set
        // AFTER leaveRoom (which clears collab state) so it survives.
        leaveRoomRef.current();
        useStore.getState()._setKickedNotice(true);
        return;
      }

      // Transport commands are intentionally ignored: in a collab session each
      // user runs an independent transport and hears only their own playback.
    } catch {
      // Ignore non-JSON or malformed messages
    }
  }, []);

  // ── Teardown ─────────────────────────────────────────────────────────

  const teardown = useCallback(() => {
    bridgeRef.current?.destroy();
    bridgeRef.current = null;
    setBridge(null);

    destroyCollabUndo();

    chatUnobserveRef.current?.();
    chatUnobserveRef.current = null;

    providerRef.current?.destroy();
    providerRef.current = null;

    idbRef.current?.destroy();
    idbRef.current = null;

    awarenessRef.current = null;

    destroyDoc();
    docRef.current = null;
    currentRoomIdRef.current = null;
  }, []);

  // ── Core join (connects to PartyKit given host + room) ──────────────

  const joinRoom = useCallback(
    (
      roomId: string,
      role: CollabRole = 'editor',
      partykitHost?: string,
      partykitRoom?: string,
      roomCode?: string,
    ) => {
      // Tear down any existing session first
      teardown();

      const host = partykitHost ?? DEFAULT_PARTYKIT_HOST;
      // Mirror the jam room's naming so every entry point lands on the same
      // ephemeral PartyKit room: `studio-${id}`.
      const pkRoom = partykitRoom ?? `studio-${roomId}`;

      const doc = getOrCreateDoc();
      docRef.current = doc;
      currentRoomIdRef.current = roomId;

      // Only the room creator seeds the shared doc from their local project.
      // Joiners must NOT hydrate — doing so would push their (often blank, since
      // leaving reloads into an empty project) state into the shared doc and
      // clobber the host's project. Joiners receive the project via the pull on
      // initial sync below.
      if (role === 'owner') {
        hydrateDocFromStore(doc, useStore.getState());
      }

      // Chat: append every message in the shared chat array (local or remote,
      // deduped by id) to the store. Attached before connecting so the initial
      // sync's existing messages are captured too.
      const yChat = getYChat(doc);
      const onChat = () => {
        const store = useStore.getState();
        const seen = new Set(store.chatMessages.map((m) => m.id));
        for (const msg of yChat.toArray()) {
          if (!seen.has(msg.id)) store._appendChatMessage(msg);
        }
      };
      yChat.observe(onChat);
      chatUnobserveRef.current = () => yChat.unobserve(onChat);

      // Set up the bridge
      const bridge = new ZustandYjsBridge(
        doc,
        (partial) => useStore.setState(partial),
        () => useStore.getState(),
      );
      bridgeRef.current = bridge;
      setBridge(bridge);

      // Initialize Yjs-based undo for collab mode
      initCollabUndo(doc);

      // Connect to PartyKit with auth token and role
      const params: Record<string, string> = { role };
      if (token) params.token = token;

      const provider = new YPartyKitProvider(host, pkRoom, doc, {
        connect: true,
        params,
      });
      providerRef.current = provider;
      awarenessRef.current = provider.awareness;

      // Offline persistence
      const idb = new IndexeddbPersistence(`collab-${roomId}`, doc);
      idbRef.current = idb;

      // Update store with connection info
      useStore.getState()._setRoomInfo(roomId, role, roomCode);
      useStore.getState()._setConnectionStatus('connecting');

      // Listen for connection status
      provider.on('sync', (synced: boolean) => {
        if (synced) {
          useStore.getState()._setConnectionStatus('connected');
          // Seed the store from the synced document so a joiner sees the
          // existing project. (The owner already has it locally — pulling would
          // also reset their local-only input routing — so skip it for them.)
          // Must run BEFORE startObserving so the one-time pull isn't a no-op.
          if (role !== 'owner') bridge.pullFromYjs();
          // Start observing Yjs for remote changes AFTER initial sync
          bridge.startObserving();
        }
      });

      provider.on('connection-close', () => {
        useStore.getState()._setConnectionStatus('disconnected');
      });

      provider.on('connection-error', () => {
        useStore.getState()._setConnectionStatus('disconnected');
      });

      // Set up local presence with Auth0 user info
      const colorIndex = provider.awareness.clientID % PRESENCE_COLORS.length;

      provider.awareness.setLocalState({
        userId: userId ?? '',
        userName: appUser?.nickname ?? appUser?.fullName ?? 'Anonymous',
        avatarUrl: appUser?.avatarUrl ?? '',
        color: PRESENCE_COLORS[colorIndex],
        selectedTrackId: null,
        selectedClipId: null,
        cursorTick: null,
        cursorTrackIndex: null,
        pianoRollCursor: null,
        activity: 'idle',
        lastActiveAt: Date.now(),
      } satisfies UserPresence);

      // Observe remote presence changes
      const onAwarenessChange = () => {
        const states = provider.awareness.getStates();
        const remoteUsers = new Map<number, UserPresence>();
        states.forEach((state, clientId) => {
          if (
            clientId !== provider.awareness.clientID &&
            state.userId !== undefined
          ) {
            remoteUsers.set(clientId, state as UserPresence);
          }
        });
        useStore.getState()._setRemoteUsers(remoteUsers);

        // Tiebreaker for simultaneous selection of the same free track: the
        // exclusive lock is optimistic, so two users can briefly hold the same
        // track. Both sides run the same comparison; whoever has the higher
        // clientID yields, so exactly one releases.
        const mySelected = useStore.getState().selectedTrackId;
        if (mySelected) {
          const myId = provider.awareness.clientID;
          for (const [clientId, u] of remoteUsers) {
            if (u.selectedTrackId === mySelected && clientId < myId) {
              useStore.getState().setSelectedTrackId(null);
              toast({
                title: 'Track taken',
                description: `${u.userName} selected this track first`,
                variant: 'destructive',
              });
              break;
            }
          }
        }
      };
      provider.awareness.on('change', onAwarenessChange);

      // Listen for ephemeral server messages (room:closing, room:not-found,
      // kicked). `provider.ws` may not exist on the very first tick, so retry
      // until it does — otherwise these notifications are silently never
      // received. Bail if the session was torn down while we waited.
      const attachWs = () => {
        if (providerRef.current !== provider) return;
        const ws = provider.ws;
        if (ws) {
          ws.addEventListener('message', handleServerMessage);
        } else {
          setTimeout(attachWs, 100);
        }
      };
      attachWs();
    },
    [userId, appUser, token, handleServerMessage, teardown],
  );

  // ── Create & join ────────────────────────────────────────────────────

  const createAndJoinRoom = useCallback(() => {
    // Ephemeral, jam-room style: short client-generated id, no backend record.
    // The room lives only as long as the host's PartyKit connection.
    const newRoomId = crypto.randomUUID().slice(0, 8);
    joinRoom(newRoomId, 'owner', undefined, `studio-${newRoomId}`, newRoomId);
  }, [joinRoom]);

  // ── Join by ID ──────────────────────────────────────────────────────

  const joinRoomById = useCallback(
    (roomId: string, role: CollabRole = 'editor') => {
      const id = roomId.trim().toLowerCase();
      joinRoom(id, role, undefined, `studio-${id}`, id);
    },
    [joinRoom],
  );

  // ── Leave ─────────────────────────────────────────────────────────────

  const leaveRoom = useCallback(() => {
    // Ephemeral rooms have no backend record to delete — the room dies when the
    // host's PartyKit connection closes (mirrors the jam room). Just tear down.
    teardown();
    useStore.getState()._clearCollab();
  }, [teardown]);
  leaveRoomRef.current = leaveRoom;

  // Clean up on unmount
  useEffect(() => teardown, [teardown]);

  // ── Transport sync ────────────────────────────────────────────────────

  const sendTransportCommand = useCallback(
    (cmd: Omit<TransportCommand, 'serverTimestamp' | 'userId'>) => {
      const ws = providerRef.current?.ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          ...cmd,
          userId: userId ?? '',
          serverTimestamp: 0, // server will overwrite
        }),
      );
    },
    [userId],
  );

  // ── Chat ──────────────────────────────────────────────────────────────

  const sendChatMessage = useCallback(
    (text: string) => {
      const doc = docRef.current;
      const trimmed = text.trim();
      if (!doc || !trimmed) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        userId: userId ?? '',
        userName: appUser?.nickname ?? appUser?.fullName ?? 'Anonymous',
        text: trimmed,
        timestamp: Date.now(),
      };
      // Append to the shared chat array — the observer (set up in joinRoom)
      // mirrors it into the store for us and every peer.
      getYChat(doc).push([msg]);
    },
    [userId, appUser],
  );

  // ── Kick (host only) ──────────────────────────────────────────────────

  const kickUser = useCallback((targetUserId: string) => {
    const ws = providerRef.current?.ws;
    // DEBUG (temporary): trace the kick send path.
    console.log('[kick] kickUser', {
      targetUserId,
      hasWs: !!ws,
      readyState: ws?.readyState,
      open: ws?.readyState === WebSocket.OPEN,
    });
    if (!ws || ws.readyState !== WebSocket.OPEN || !targetUserId) return;
    // The server enforces that only the host may kick.
    ws.send(JSON.stringify({ type: 'collab:kick', targetUserId }));
    console.log('[kick] collab:kick SENT', targetUserId);
  }, []);

  // ── Presence sync from Zustand UI state ───────────────────────────────

  useEffect(() => {
    return useStore.subscribe(
      (state) => ({
        // Broadcast the header-track selection (prismSlice) — this is what the
        // exclusive lock and the rainbow-neon border key off of.
        selectedTrackId: state.selectedTrackId,
        selectedClipId: state.selectedClipId,
        editingClipId: state.editingClipId,
      }),
      (selection) => {
        const awareness = awarenessRef.current;
        if (!awareness) return;
        const current = awareness.getLocalState() as UserPresence | null;
        if (!current) return;
        awareness.setLocalState({
          ...current,
          selectedTrackId: selection.selectedTrackId,
          selectedClipId: selection.selectedClipId,
          lastActiveAt: Date.now(),
          activity: selection.editingClipId ? 'editing' : 'idle',
        });
      },
    );
  }, []);

  // ── Context value ─────────────────────────────────────────────────────

  const value = useMemo<CollabContextValue>(
    () => ({
      createAndJoinRoom,
      joinRoomById,
      joinRoom,
      leaveRoom,
      sendTransportCommand,
      sendChatMessage,
      kickUser,
      awareness: awarenessRef.current,
    }),
    [
      createAndJoinRoom,
      joinRoomById,
      joinRoom,
      leaveRoom,
      sendTransportCommand,
      sendChatMessage,
      kickUser,
    ],
  );

  return (
    <CollabContext.Provider value={value}>{children}</CollabContext.Provider>
  );
}
