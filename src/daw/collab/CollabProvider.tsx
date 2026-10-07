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
import { useAuth0 } from '@auth0/auth0-react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import YPartyKitProvider from 'y-partykit/provider';
import { Awareness } from 'y-protocols/awareness.js';
import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
import { showError } from '@/components/utils/toast';
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
  COLLAB_CLOSE,
  COLLAB_DOC_SCHEMA_PARAM,
  COLLAB_DOC_SCHEMA_VERSION,
  PRESENCE_COLORS,
  serverVersionInReason,
  type CollabRole,
  type UserPresence,
  type TransportCommand,
  type ChatMessage,
} from './types';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { toast } from '@/hooks/use-toast';
import { studioRealtime, isStudioMessage } from './studioRealtime';

// ── Context ─────────────────────────────────────────────────────────────

interface CollabContextValue {
  /** Create an ephemeral room (client-generated id) and join it as host. */
  createAndJoinRoom: () => void;
  /** Join an existing room by ID. */
  joinRoomById: (roomId: string, role?: CollabRole) => void;
  /** Join by ID as an editor, retrying until the host creates the room. */
  joinRoomAwaitingHost: (roomId: string) => void;
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
  joinRoomAwaitingHost: () => {},
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

// When a jam→studio joiner arrives before the host has created the room, keep
// retrying the join (the room appears the moment the host connects) for up to
// this long before surfacing a "room not active" error.
const AWAIT_HOST_TIMEOUT_MS = 20_000;
const AWAIT_HOST_RETRY_MS = 1_000;

// Reconnect backoff after a dropped socket — the same curve y-partykit uses
// (100 ms doubling to 2.5 s), but reset only by a completed sync, so a server
// that accepts the socket and then closes it can't cause a fast loop.
const RECONNECT_BASE_MS = 100;
const RECONNECT_MAX_MS = 2_500;
// A 4401 is retried with a freshly issued token this many times before the
// session ends; it can be a passing server-side key-fetch failure.
const MAX_AUTH_RETRIES = 2;
// Codes the server closes with after sending a message that says why (kicked,
// full, not found, host left). handleServerMessage acts on the message; the
// socket must just stay closed.
const SERVER_ENDED_CODES = new Set<number>([
  COLLAB_CLOSE.kicked,
  COLLAB_CLOSE.notFound,
  COLLAB_CLOSE.full,
  COLLAB_CLOSE.hostLeft,
]);

const ROOM_NOT_ACTIVE_MESSAGE =
  'That room is not active. Check the room id and try again.';
const VERSION_MISMATCH_MESSAGE = 'Update Music Atlas to join this session';
const SERVER_UPDATING_MESSAGE =
  'The session server is being updated. Try again in a few minutes.';
const AUTH_FAILED_MESSAGE =
  'Your sign-in could not be confirmed. Refresh the page and join again.';

interface CollabProviderProps {
  children: ReactNode;
}

export function CollabProvider({ children }: CollabProviderProps) {
  const { userId, appUser, token } = useAuthContext();
  const { getAccessTokenSilently } = useAuth0();
  const bridgeRef = useRef<ZustandYjsBridge | null>(null);
  const providerRef = useRef<YPartyKitProvider | null>(null);
  const idbRef = useRef<IndexeddbPersistence | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const chatUnobserveRef = useRef<(() => void) | null>(null);
  // Points at leaveRoom so the (stable) message handler can tear down on kick.
  const leaveRoomRef = useRef<() => void>(() => {});
  // "Waiting for host" retry state: whether the current join should retry on
  // room:not-found, the timer that gives up at the deadline, the pending retry
  // timer, and a closure that re-runs the same join.
  const awaitHostRef = useRef(false);
  const awaitDeadlineTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const rejoinRef = useRef<() => void>(() => {});
  // Reconnects of the current provider (see the connection-close handler in
  // joinRoom): the pending timer, attempts since the last completed sync, 4401
  // closes since then, and whether the next connect must bypass Auth0's cache.
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const authFailuresRef = useRef(0);
  const forceTokenRefreshRef = useRef(false);

  // The latest values for the next connect, read through refs so a live
  // provider never holds a stale token.
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const getFreshToken = useCallback(
    async (forceRefresh: boolean): Promise<string | null> => {
      // Auth0 serves its cached access token until it is close to expiry and
      // silently renews it after that, so a reconnect an hour into a session
      // still presents a token the server accepts. The dev bypass has no Auth0
      // session; its placeholder token is accepted only by a local
      // `partykit dev` (see server/auth.ts).
      if (!DEV_AUTH_BYPASS) {
        try {
          return await getAccessTokenSilently(
            forceRefresh ? { cacheMode: 'off' } : undefined,
          );
        } catch {
          // Fall back to the session's token; if that has expired the server
          // answers 4401 and the retry limit ends the session with a message.
        }
      }
      return tokenRef.current;
    },
    [getAccessTokenSilently],
  );
  const getFreshTokenRef = useRef(getFreshToken);
  getFreshTokenRef.current = getFreshToken;

  /** Stop treating the current join as one that waits for its host. */
  const stopAwaitingHost = useCallback(() => {
    awaitHostRef.current = false;
    if (awaitDeadlineTimerRef.current !== null) {
      clearTimeout(awaitDeadlineTimerRef.current);
      awaitDeadlineTimerRef.current = null;
    }
  }, []);

  // ── Teardown ─────────────────────────────────────────────────────────

  const teardown = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    bridgeRef.current?.destroy();
    bridgeRef.current = null;
    setBridge(null);

    destroyCollabUndo();

    chatUnobserveRef.current?.();
    chatUnobserveRef.current = null;

    studioRealtime.setSender(null);

    providerRef.current?.destroy();
    providerRef.current = null;

    idbRef.current?.destroy();
    idbRef.current = null;

    awarenessRef.current = null;

    destroyDoc();
    docRef.current = null;
    currentRoomIdRef.current = null;

    // Drop live-connection state — peers and status — so a torn-down session
    // never shows a frozen "still in the room" snapshot. The room IDENTITY
    // (roomId/roomCode/role) is left intact on purpose: when the studio route
    // unmounts on an SPA back/forward, this lets the remount tell "we were in a
    // room and got navigated away" apart from "we never joined" and rejoin. A
    // real departure (leaveRoom / kick) follows teardown with _clearCollab,
    // which wipes the identity too so no rejoin is attempted.
    const store = useStore.getState();
    store._setRemoteUsers(new Map());
    store._setConnectionStatus('disconnected');
  }, []);

  /** End the session for a reason the user can only fix outside the studio
   *  (an out-of-date app, a sign-in that can't be confirmed). The project
   *  stays open locally. */
  const endSessionWithError = useCallback(
    (message: string) => {
      stopAwaitingHost();
      teardown();
      const store = useStore.getState();
      store._clearCollab();
      // Set after _clearCollab, which resets it. The toolbar shows it only
      // while its popover is open, so the toast carries it for link joins.
      store._setRoomError(message);
      showError(message);
    },
    [stopAwaitingHost, teardown],
  );

  // ── Server message handler ───────────────────────────────────────────
  // The room states below are terminal for this socket: the server closes it
  // right after the message. Each one tears the provider down FIRST, so its
  // reconnect can't keep knocking (~10 per second) and then silently re-sync
  // a project over this one once the room comes back. The local project is
  // untouched either way.

  const handleServerMessage = useCallback(
    (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'room:closing') {
          // The host disconnected and the server closed the room; this socket
          // closes with 4410 next. A guest is offered the chance to save the
          // project to their own account. teardown keeps the room identity,
          // which the prompt's Leave path clears.
          //
          // The host hears this only when the server noticed late that an
          // earlier socket of ours had dropped (after a network blip it can
          // hold the dead one while we reconnect) and closed the room over
          // it. Nothing is torn down then: the 4410 reconnects this provider
          // (see connection-close), and the server, hostless now, makes us
          // host again on the same document.
          if (useStore.getState().collabRole === 'owner') return;
          teardown();
          useStore.getState()._setLeavePrompt(true);
          return;
        }

        if (data.type === 'room:not-found') {
          // Before the retry timer is set: teardown clears pending timers.
          teardown();
          // A jam→studio joiner can arrive before the host has registered the
          // room. Keep retrying until the host shows up; the await-host
          // deadline timer ends the wait.
          if (awaitHostRef.current) {
            retryTimerRef.current = window.setTimeout(() => {
              retryTimerRef.current = null;
              rejoinRef.current();
            }, AWAIT_HOST_RETRY_MS);
            return;
          }
          // Join-by-id targeted a room with no active host, or a room the user
          // has been kicked from (the server rejects banned users up front).
          // Forget the room so an SPA return doesn't knock again.
          useStore.getState()._clearCollab();
          useStore.getState()._setRoomError(ROOM_NOT_ACTIVE_MESSAGE);
          return;
        }

        if (data.type === 'room:full') {
          // The room is at capacity (MAX_ROOM_USERS). Stop any await-host retry
          // loop and surface a clear message; the project stays loaded locally.
          stopAwaitingHost();
          teardown();
          useStore.getState()._clearCollab();
          useStore
            .getState()
            ._setRoomError('This room is full (max 5 collaborators).');
          return;
        }

        if (data.type === 'kicked') {
          // The host removed us (or we tried to rejoin after being kicked). Tear
          // down the session — the project stays loaded, so the user lands in a
          // local studio — and show the "you were kicked" popup. The notice is
          // set AFTER leaveRoom (which clears collab state) so it survives.
          leaveRoomRef.current();
          useStore.getState()._setKickedNotice(true);
          return;
        }

        // Studio live monitoring: live MIDI notes + WebRTC signaling from peers.
        if (isStudioMessage(data)) {
          studioRealtime.dispatch(data);
          return;
        }

        // Transport commands are intentionally ignored: in a collab session each
        // user runs an independent transport and hears only their own playback.
      } catch {
        // Ignore non-JSON or malformed messages
      }
    },
    [stopAwaitingHost, teardown],
  );

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
        (listener) => useStore.subscribe(listener),
      );
      bridgeRef.current = bridge;
      setBridge(bridge);

      // Initialize Yjs-based undo for collab mode
      initCollabUndo(doc);

      // Connect to PartyKit. y-partykit resolves `params` inside every
      // connect(), so each (re)connect presents a fresh token and our doc
      // schema version. Created idle: connect() runs at the end of joinRoom,
      // once every listener below is attached.
      reconnectAttemptsRef.current = 0;
      authFailuresRef.current = 0;
      forceTokenRefreshRef.current = false;
      const provider = new YPartyKitProvider(host, pkRoom, doc, {
        connect: false,
        params: async () => {
          const freshToken = await getFreshTokenRef.current(
            forceTokenRefreshRef.current,
          );
          forceTokenRefreshRef.current = false;
          // Torn down while the token was on its way: this connect() must not
          // go on, or y-partykit would open — and keep reopening — a socket
          // for a session that no longer exists. A promise that never settles
          // stops it without an error.
          if (providerRef.current !== provider) {
            return new Promise<never>(() => {});
          }
          return {
            role,
            token: freshToken,
            [COLLAB_DOC_SCHEMA_PARAM]: String(COLLAB_DOC_SCHEMA_VERSION),
          };
        },
      });
      providerRef.current = provider;
      awarenessRef.current = provider.awareness;

      // Wire the live-monitoring bus: peers are keyed by awareness clientID, and
      // outgoing messages go over this provider's socket (read lazily so the
      // sender survives brief socket churn).
      studioRealtime.setLocalClientId(provider.awareness.clientID);
      studioRealtime.setSender((json) => {
        const ws = providerRef.current?.ws;
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(json);
      });

      // Offline persistence
      const idb = new IndexeddbPersistence(`collab-${roomId}`, doc);
      idbRef.current = idb;

      // Update store with connection info
      useStore.getState()._setRoomInfo(roomId, role, roomCode);
      useStore.getState()._setConnectionStatus('connecting');

      // Listen for connection status
      provider.on('sync', (synced: boolean) => {
        if (synced) {
          // The room exists — stop any "waiting for host" retry loop.
          stopAwaitingHost();
          if (retryTimerRef.current !== null) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          // A completed sync is the only proof the connection works.
          reconnectAttemptsRef.current = 0;
          authFailuresRef.current = 0;
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

      // y-partykit opens a new WebSocket for every (re)connect and announces it
      // with 'connecting' right after assigning provider.ws — before the socket
      // can deliver anything — so attaching here hears every server message
      // (room:closing, kicked, studio:* …) on every socket, first to last.
      provider.on('status', ({ status }: { status: string }) => {
        if (status === 'connecting') {
          provider.ws?.addEventListener('message', handleServerMessage);
        }
      });

      provider.on('connection-close', (event: CloseEvent | null) => {
        if (providerRef.current !== provider) return;
        useStore.getState()._setConnectionStatus('disconnected');
        // y-partykit would reopen the socket ~100 ms later with the previous
        // connect()'s URL — and token — forever, even after the server turned
        // the socket away. Switch that off; reconnecting is decided here.
        provider.shouldConnect = false;
        const code = event?.code ?? 0;
        if (code === COLLAB_CLOSE.versionMismatch) {
          // The reason names the server's version: an app newer than the
          // server means the server is mid-update (see
          // COLLAB_DOC_SCHEMA_VERSION), which updating can't fix.
          const serverVersion = serverVersionInReason(event?.reason);
          endSessionWithError(
            serverVersion !== null && serverVersion < COLLAB_DOC_SCHEMA_VERSION
              ? SERVER_UPDATING_MESSAGE
              : VERSION_MISMATCH_MESSAGE,
          );
          return;
        }
        if (code === COLLAB_CLOSE.unauthorized) {
          authFailuresRef.current += 1;
          if (authFailuresRef.current > MAX_AUTH_RETRIES) {
            endSessionWithError(AUTH_FAILED_MESSAGE);
            return;
          }
          forceTokenRefreshRef.current = true;
        }
        // 4410 ends a guest's session. The host gets it only when the server
        // dropped an earlier socket of ours late (see room:closing): reconnect
        // to become host again.
        if (
          SERVER_ENDED_CODES.has(code) &&
          !(code === COLLAB_CLOSE.hostLeft && role === 'owner')
        ) {
          return;
        }
        const delay = Math.min(
          RECONNECT_BASE_MS * 2 ** reconnectAttemptsRef.current,
          RECONNECT_MAX_MS,
        );
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          // connect() re-resolves params, so this socket gets a fresh token.
          if (providerRef.current === provider) provider.connect();
        }, delay);
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
        // Drives the MIDI-broadcast gate: don't send live notes to an empty room.
        studioRealtime.setPeerCount(remoteUsers.size);

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

      provider.connect();
    },
    [
      userId,
      appUser,
      handleServerMessage,
      endSessionWithError,
      stopAwaitingHost,
      teardown,
    ],
  );

  // ── Create & join ────────────────────────────────────────────────────

  const createAndJoinRoom = useCallback(() => {
    // Ephemeral, jam-room style: short client-generated id, no backend record.
    // The room lives only as long as the host's PartyKit connection.
    stopAwaitingHost();
    const newRoomId = crypto.randomUUID().slice(0, 8);
    joinRoom(newRoomId, 'owner', undefined, `studio-${newRoomId}`, newRoomId);
  }, [joinRoom, stopAwaitingHost]);

  // ── Join by ID ──────────────────────────────────────────────────────

  const joinRoomById = useCallback(
    (roomId: string, role: CollabRole = 'editor') => {
      stopAwaitingHost();
      const id = roomId.trim().toLowerCase();
      joinRoom(id, role, undefined, `studio-${id}`, id);
    },
    [joinRoom, stopAwaitingHost],
  );

  // ── Join, waiting for the host to create the room ────────────────────
  // Used when a jam-room player accepts a "moved to studio" invite: they may
  // beat the host to PartyKit, so retry the join until the room exists.

  const joinRoomAwaitingHost = useCallback(
    (roomId: string) => {
      const id = roomId.trim().toLowerCase();
      stopAwaitingHost();
      awaitHostRef.current = true;
      // The wait ends at the deadline whatever kept the room from syncing:
      // a host who never came, or a server that can't be reached, whose
      // failed sockets would otherwise just keep reconnecting.
      awaitDeadlineTimerRef.current = window.setTimeout(() => {
        awaitDeadlineTimerRef.current = null;
        awaitHostRef.current = false;
        teardown();
        const store = useStore.getState();
        store._clearCollab();
        store._setRoomError(ROOM_NOT_ACTIVE_MESSAGE);
      }, AWAIT_HOST_TIMEOUT_MS);
      useStore.getState()._setRoomError(null);
      useStore.getState()._setAwaitingSession(true);
      // Re-run on retry without resetting the deadline.
      rejoinRef.current = () =>
        joinRoom(id, 'editor', undefined, `studio-${id}`, id);
      rejoinRef.current();
    },
    [joinRoom, stopAwaitingHost, teardown],
  );

  // ── Leave ─────────────────────────────────────────────────────────────

  const leaveRoom = useCallback(() => {
    // Ephemeral rooms have no backend record to delete — the room dies when the
    // host's PartyKit connection closes (mirrors the jam room). Just tear down.
    stopAwaitingHost();
    teardown();
    useStore.getState()._clearCollab();
  }, [stopAwaitingHost, teardown]);
  leaveRoomRef.current = leaveRoom;

  // Clean up on unmount. The await-host deadline goes too: firing later, it
  // would tear down the module-wide doc and bridge of a session the next
  // mount joined.
  useEffect(
    () => () => {
      stopAwaitingHost();
      teardown();
    },
    [stopAwaitingHost, teardown],
  );

  // A save while in a room makes this session's draft a saved project, which
  // the leave prompt must never delete. The save path records this only while
  // the socket is up; a save during a reconnect counts just the same.
  useEffect(() => {
    const onProjectSaved = () => {
      const store = useStore.getState();
      if (store.roomId) store._markSessionSaved();
    };
    window.addEventListener('ma-studio-project-saved', onProjectSaved);
    return () =>
      window.removeEventListener('ma-studio-project-saved', onProjectSaved);
  }, []);

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
      joinRoomAwaitingHost,
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
      joinRoomAwaitingHost,
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
