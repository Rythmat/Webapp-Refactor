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
import { Awareness } from 'y-protocols/awareness';
import { Env } from '@/constants/env';

import { useStore } from '@/daw/store/index';
import {
  getOrCreateDoc,
  destroyDoc,
  hydrateDocFromStore,
} from './YjsDocManager';
import { ZustandYjsBridge } from './ZustandYjsBridge';
import { setBridge } from './collabMiddleware';
import { initCollabUndo, destroyCollabUndo } from '@/daw/store/undoMiddleware';
import {
  PRESENCE_COLORS,
  type CollabRole,
  type UserPresence,
  type TransportCommand,
} from './types';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  createRoom as apiCreateRoom,
  closeRoom as apiCloseRoom,
  type RoomResponse,
} from './roomManager';

// ── Context ─────────────────────────────────────────────────────────────

interface CollabContextValue {
  /** Create a new room via the API and join it as owner. */
  createAndJoinRoom: (projectName: string) => Promise<RoomResponse>;
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
  /** The Yjs awareness instance (for presence). Null if not connected. */
  awareness: Awareness | null;
}

const CollabContext = createContext<CollabContextValue>({
  createAndJoinRoom: () => Promise.reject(new Error('No CollabProvider')),
  joinRoomById: () => Promise.reject(new Error('No CollabProvider')),
  joinRoom: () => {},
  leaveRoom: () => {},
  sendTransportCommand: () => {},
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

  // ── Transport + room:closing message handler ──────────────────────────

  const handleServerMessage = useCallback((event: MessageEvent) => {
    if (typeof event.data !== 'string') return;
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'room:closing') {
        // Host disconnected — tear down the session
        useStore.getState()._setConnectionStatus('disconnected');
        return;
      }

      if (data.type === 'transport') {
        const store = useStore.getState();
        if (!store.transportLinked) return;

        const cmd = data as TransportCommand;
        switch (cmd.action) {
          case 'play':
            store.setPosition(cmd.tick ?? 0);
            store.play();
            break;
          case 'pause':
            store.pause();
            break;
          case 'stop':
            store.stop();
            break;
          case 'seek':
            if (cmd.tick !== undefined) store.setPosition(cmd.tick);
            break;
        }
      }
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
      const pkRoom = partykitRoom ?? roomId;

      const doc = getOrCreateDoc();
      docRef.current = doc;
      currentRoomIdRef.current = roomId;

      // Hydrate the Yjs doc from the current Zustand state (first write)
      const currentState = useStore.getState();
      hydrateDocFromStore(doc, currentState);

      // Set up the bridge
      const bridge = new ZustandYjsBridge(doc, (partial) =>
        useStore.setState(partial),
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
      };
      provider.awareness.on('change', onAwarenessChange);

      // Listen for ephemeral messages (transport commands, room:closing)
      provider.ws?.addEventListener('message', handleServerMessage);
    },
    [userId, appUser, token, handleServerMessage, teardown],
  );

  // ── Create & join ────────────────────────────────────────────────────

  const createAndJoinRoom = useCallback(
    async (projectName: string): Promise<RoomResponse> => {
      if (!token) throw new Error('Not authenticated');
      const room = await apiCreateRoom({ projectName }, token);
      joinRoom(room.roomId, 'owner');
      return room;
    },
    [token, joinRoom],
  );

  // ── Join by ID ──────────────────────────────────────────────────────

  const joinRoomById = useCallback(
    (roomId: string, role: CollabRole = 'editor') => {
      joinRoom(roomId, role);
    },
    [joinRoom],
  );

  // ── Leave ─────────────────────────────────────────────────────────────

  const leaveRoom = useCallback(() => {
    // If we are the host, close the room via API
    const roomId = currentRoomIdRef.current;
    const store = useStore.getState();
    if (roomId && token && store.collabRole === 'owner') {
      apiCloseRoom(roomId, token).catch(() => {
        // Best-effort — PartyKit onClose will also trigger the webhook
      });
    }

    teardown();
    useStore.getState()._clearCollab();
  }, [teardown, token]);

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

  // ── Presence sync from Zustand UI state ───────────────────────────────

  useEffect(() => {
    return useStore.subscribe(
      (state) => ({
        selectedTrackId: state.selectedClipTrackId,
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
      awareness: awarenessRef.current,
    }),
    [
      createAndJoinRoom,
      joinRoomById,
      joinRoom,
      leaveRoom,
      sendTransportCommand,
    ],
  );

  return (
    <CollabContext.Provider value={value}>{children}</CollabContext.Provider>
  );
}
