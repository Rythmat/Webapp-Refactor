// ── JamRoomProvider ───────────────────────────────────────────────────────
// React context managing a PartyKit WebSocket connection for real-time
// jam sessions. Uses y-partykit for the awareness protocol (presence)
// but does NOT sync a Yjs document — notes are ephemeral messages.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import YPartyKitProvider from 'y-partykit/provider';
import * as Y from 'yjs';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { RttMeasurer } from '@/daw/collab/transportSync';
import { PRESENCE_COLORS } from '@/daw/collab/types';
import { jamRecorder } from './jamRecorder';
import { useJamRoomStore } from './jamRoomStore';
import type {
  DrumGrid,
  DrumMode,
  DrumTransport,
  JamInstrument,
  JamNoteMessage,
  JamChatMessage,
  JamPresence,
} from './types';

// ── Context ──────────────────────────────────────────────────────────────

interface JamRoomContextValue {
  isConnected: boolean;
  roomId: string | null;
  roomCode: string | null;
  /** Error string when room cannot be joined (e.g. room does not exist). */
  roomError: string | null;
  /** Create a new jam room and connect to PartyKit. */
  createAndJoinRoom: (name: string) => void;
  /** Join an existing jam room by room ID. */
  joinRoomByCode: (code: string) => void;
  /** Join using pre-fetched PartyKit connection info. */
  joinRoom: (
    roomId: string,
    role?: 'owner' | 'editor',
    partykitHost?: string,
    partykitRoom?: string,
  ) => void;
  leaveRoom: () => void;
  sendNote: (msg: Omit<JamNoteMessage, 'userId' | 'color'>) => void;
  sendChat: (text: string) => void;
  /** True when the local user is the room host (connected as `owner`). */
  isHost: boolean;
  /** Broadcast the full shared drum grid to the room. */
  sendDrumGrid: (grid: DrumGrid) => void;
  /** Broadcast the drum-edit permission mode to the room (host only). */
  sendDrumMode: (mode: DrumMode, drummerId: string | null) => void;
  /** Broadcast the shared sequencer transport (play / stop / tempo). */
  sendDrumTransport: (transport: DrumTransport) => void;
  /** Host-only: invite the room to a collaborative Studio session by room code. */
  sendStudioInvite: (roomCode: string) => void;
  /** Best estimate of the server's current wall-clock time (ms). */
  serverNow: () => number;
  localColor: string;
  setLocalInstrument: (inst: JamInstrument) => void;
  remotePlayers: JamPresence[];
  /** Subscribe to incoming note messages (for audio playback). Returns unsubscribe fn. */
  onNoteMessage: (handler: (msg: JamNoteMessage) => void) => () => void;
  latencyMs: number;
}

const JamRoomContext = createContext<JamRoomContextValue>({
  isConnected: false,
  roomId: null,
  roomCode: null,
  roomError: null,
  createAndJoinRoom: () => {},
  joinRoomByCode: () => {},
  joinRoom: () => {},
  leaveRoom: () => {},
  sendNote: () => {},
  sendChat: () => {},
  isHost: false,
  sendDrumGrid: () => {},
  sendDrumMode: () => {},
  sendDrumTransport: () => {},
  sendStudioInvite: () => {},
  serverNow: () => Date.now(),
  localColor: PRESENCE_COLORS[0],
  setLocalInstrument: () => {},
  remotePlayers: [],
  onNoteMessage: () => () => {},
  latencyMs: 0,
});

export function useJamRoom() {
  return useContext(JamRoomContext);
}

// ── Provider ─────────────────────────────────────────────────────────────

const DEFAULT_PARTYKIT_HOST =
  Env.get('VITE_PARTYKIT_HOST', { nullable: true }) ?? 'localhost:1999';

interface JamRoomProviderProps {
  children: ReactNode;
}

export function JamRoomProvider({ children }: JamRoomProviderProps) {
  const { userId, appUser, token } = useAuthContext();

  const providerRef = useRef<YPartyKitProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const rttRef = useRef(new RttMeasurer());
  const colorRef = useRef<string>(PRESENCE_COLORS[0]);
  const noteListenersRef = useRef<Set<(msg: JamNoteMessage) => void>>(
    new Set(),
  );
  const currentRoomIdRef = useRef<string | null>(null);
  // Keep the local user id available to the (stable) message handler.
  const localUserIdRef = useRef('');
  localUserIdRef.current = userId ?? '';
  // Whether the local user is the room host — read inside the stable handler.
  const isHostRef = useRef(false);

  // Reactive state (triggers re-renders for UI)
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [remotePlayers, setRemotePlayers] = useState<JamPresence[]>([]);
  const [latencyMs, setLatencyMs] = useState(0);

  // ── Message handler ────────────────────────────────────────────────────

  const handleMessage = useCallback((event: MessageEvent) => {
    if (typeof event.data !== 'string') return;
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'room:not-found') {
        // Room does not exist (no host)
        setRoomError('That room does not exist');
        setIsConnected(false);
        return;
      }

      if (data.type === 'room:closing') {
        setIsConnected(false);
        // If the host moved the jam into the Studio, a `jam:studio-invite`
        // arrived just before this close. Keep the join prompt up instead of
        // bouncing the user to the lobby with a "host left" error.
        if (useJamRoomStore.getState().studioInvite) return;
        setRoomError('The host has left the room');
        return;
      }

      // Host moved the jam into a collaborative Studio session — surface the
      // join prompt (rendered by JamRoom) with the Studio room code.
      if (data.type === 'jam:studio-invite' && data.roomCode) {
        useJamRoomStore
          .getState()
          .setStudioInvite({ roomCode: String(data.roomCode) });
        return;
      }

      if (data.type === 'jam:note') {
        const msg = data as JamNoteMessage;
        // Dispatch to audio listeners (low-latency path, no React re-render)
        noteListenersRef.current.forEach((handler) => handler(msg));
        // Capture remote notes for the local recording. (Local notes are
        // captured in sendNote; the server never echoes our own back, but
        // guard against it just in case.)
        if (msg.userId !== localUserIdRef.current) {
          jamRecorder.record({
            action: msg.action,
            userId: msg.userId,
            color: msg.color,
            instrument: msg.instrument,
            gmProgram: msg.gmProgram,
            midi: msg.midi,
            velocity: msg.velocity,
          });
        }
        // Update store for visualization
        const store = useJamRoomStore.getState();
        if (msg.action === 'on') {
          store.addRemoteNote(msg.userId, {
            midi: msg.midi,
            color: msg.color,
            instrument: msg.instrument,
            timestamp: Date.now(),
          });
        } else {
          store.removeRemoteNote(msg.userId, msg.midi);
        }
      }

      if (data.type === 'jam:chat') {
        useJamRoomStore.getState().addChatMessage(data as JamChatMessage);
      }

      // Shared drum pattern — adopt the broadcast grid.
      if (data.type === 'jam:drum-grid') {
        useJamRoomStore.getState().setDrumGrid(data.grid);
      }

      // Drum-edit permission mode (host-controlled).
      if (data.type === 'jam:drum-mode') {
        useJamRoomStore
          .getState()
          .setDrumMode(data.mode, data.drummerId ?? null);
      }

      // Shared sequencer transport — adopt the room-wide play state. The
      // `startedAt` epoch is in server time, so the local scheduler maps it
      // onto this device's clock and plays in lock-step with everyone else.
      if (data.type === 'jam:drum-transport') {
        useJamRoomStore.getState().setDrumTransport({
          playing: !!data.playing,
          startedAt: data.startedAt ?? null,
          bpm: data.bpm,
        });
      }

      // A joining client asked for the current drum state — only the host
      // answers, replaying the authoritative grid and mode to the room.
      if (data.type === 'jam:drum-sync-request') {
        if (!isHostRef.current) return;
        const ws = providerRef.current?.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const store = useJamRoomStore.getState();
        ws.send(
          JSON.stringify({
            type: 'jam:drum-grid',
            grid: store.drumGrid,
            userId: localUserIdRef.current,
          }),
        );
        ws.send(
          JSON.stringify({
            type: 'jam:drum-mode',
            mode: store.drumMode,
            drummerId: store.drummerId,
            userId: localUserIdRef.current,
          }),
        );
        ws.send(
          JSON.stringify({
            type: 'jam:drum-transport',
            ...store.drumTransport,
            userId: localUserIdRef.current,
          }),
        );
      }

      if (data.type === 'pong') {
        rttRef.current.handlePong(data.clientTimestamp, data.serverTimestamp);
        setLatencyMs(Math.round(rttRef.current.rtt));
      }
    } catch {
      // Ignore malformed messages
    }
  }, []);

  // ── Teardown ───────────────────────────────────────────────────────────

  const teardown = useCallback(() => {
    rttRef.current.stop();
    providerRef.current?.destroy();
    providerRef.current = null;
    docRef.current?.destroy();
    docRef.current = null;
    setIsConnected(false);
    setRoomId(null);
    setRoomCode(null);
    setRoomError(null);
    setIsHost(false);
    setRemotePlayers([]);
    setLatencyMs(0);
    isHostRef.current = false;
    currentRoomIdRef.current = null;
    useJamRoomStore.getState().reset();
    jamRecorder.reset();
  }, []);

  // ── Core join (connects to PartyKit given host + room) ─────────────────

  const joinRoom = useCallback(
    (
      newRoomId: string,
      role: 'owner' | 'editor' = 'editor',
      partykitHost?: string,
      partykitRoom?: string,
    ) => {
      teardown();
      setRoomError(null);
      setIsHost(role === 'owner');
      isHostRef.current = role === 'owner';
      // Arm a fresh local recording for this session.
      jamRecorder.start();

      const host = partykitHost ?? DEFAULT_PARTYKIT_HOST;
      const pkRoom = partykitRoom ?? `jam-${newRoomId}`;

      // Minimal Yjs doc (only for awareness protocol, not synced)
      const doc = new Y.Doc();
      docRef.current = doc;
      setRoomId(newRoomId);
      currentRoomIdRef.current = newRoomId;

      // Connect to PartyKit
      const params: Record<string, string> = { role };
      if (token) params.token = token;

      const provider = new YPartyKitProvider(host, pkRoom, doc, {
        connect: true,
        params,
      });
      providerRef.current = provider;

      // Assign color from client ID
      const colorIndex = provider.awareness.clientID % PRESENCE_COLORS.length;
      colorRef.current = PRESENCE_COLORS[colorIndex] as string;

      // Set local presence
      const { localInstrument: instrument, localGmProgram: gmProgram } =
        useJamRoomStore.getState();
      provider.awareness.setLocalState({
        userId: userId ?? '',
        userName: appUser?.nickname ?? appUser?.fullName ?? 'Anonymous',
        avatarUrl: appUser?.avatarUrl ?? '',
        color: PRESENCE_COLORS[colorIndex],
        instrument,
        gmProgram,
        activeNotes: [],
        joinedAt: Date.now(),
      } satisfies JamPresence);

      // Connection status
      provider.on('sync', () => {
        setIsConnected(true);
        // Non-host joiners ask the host to replay the current shared drum
        // pattern and mode so late arrivals see the same beat.
        if (role !== 'owner') {
          const ws = provider.ws;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'jam:drum-sync-request',
                userId: userId ?? '',
              }),
            );
          }
        }
      });
      provider.on('connection-close', () => setIsConnected(false));

      // Observe remote presence
      provider.awareness.on('change', () => {
        const states = provider.awareness.getStates();
        const players: JamPresence[] = [];
        states.forEach((state, clientId) => {
          if (clientId !== provider.awareness.clientID && state.userId) {
            players.push(state as JamPresence);
          }
        });
        setRemotePlayers(players);
      });

      // Clean up departed players' notes
      provider.awareness.on('change', ({ removed }: { removed: number[] }) => {
        if (!removed?.length) return;
        const store = useJamRoomStore.getState();
        removed.forEach((clientId) => {
          const state = provider.awareness.getStates().get(clientId) as
            | JamPresence
            | undefined;
          if (state?.userId) store.clearUserNotes(state.userId);
        });
      });

      // Listen for ephemeral messages once WebSocket is ready
      const attachWs = () => {
        const ws = provider.ws;
        if (ws) {
          ws.addEventListener('message', handleMessage);
          rttRef.current.start(ws);
        } else {
          setTimeout(attachWs, 100);
        }
      };
      attachWs();
    },
    [userId, appUser, token, handleMessage, teardown],
  );

  // ── Create & join ─────────────────────────────────────────────────────

  const createAndJoinRoom = useCallback(
    (_name: string) => {
      const newRoomId = crypto.randomUUID().slice(0, 8);
      setRoomCode(newRoomId);
      joinRoom(newRoomId, 'owner');
    },
    [joinRoom],
  );

  // ── Join by code (room ID) ──────────────────────────────────────────

  const joinRoomByCode = useCallback(
    (code: string) => {
      setRoomCode(code);
      joinRoom(code, 'editor');
    },
    [joinRoom],
  );

  // ── Leave ──────────────────────────────────────────────────────────────

  const leaveRoom = useCallback(() => {
    // Jam rooms are ephemeral (not stored in Redis), so no API cleanup needed.
    // PartyKit handles room disposal when all clients disconnect.
    teardown();
  }, [teardown]);

  // Cleanup on unmount
  useEffect(() => teardown, [teardown]);

  // ── Send note ──────────────────────────────────────────────────────────

  const sendNote = useCallback(
    (msg: Omit<JamNoteMessage, 'userId' | 'color'>) => {
      // Capture our own note in the local recording (the server doesn't echo
      // it back to us). Recorded even if the socket is momentarily down so the
      // recording matches what the player heard.
      jamRecorder.record({
        action: msg.action,
        userId: userId ?? '',
        color: colorRef.current,
        instrument: msg.instrument,
        gmProgram: msg.gmProgram,
        midi: msg.midi,
        velocity: msg.velocity,
      });
      const ws = providerRef.current?.ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          ...msg,
          userId: userId ?? '',
          color: colorRef.current,
        }),
      );
    },
    [userId],
  );

  // ── Send chat ──────────────────────────────────────────────────────────

  const sendChat = useCallback(
    (text: string) => {
      const ws = providerRef.current?.ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const msg: JamChatMessage = {
        type: 'jam:chat',
        id: crypto.randomUUID(),
        userId: userId ?? '',
        userName: appUser?.nickname ?? appUser?.fullName ?? 'Anonymous',
        text,
        timestamp: Date.now(),
      };
      ws.send(JSON.stringify(msg));
      useJamRoomStore.getState().addChatMessage(msg);
    },
    [userId, appUser],
  );

  // ── Shared drum sync ─────────────────────────────────────────────────────

  const sendDrumGrid = useCallback(
    (grid: DrumGrid) => {
      const ws = providerRef.current?.ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: 'jam:drum-grid',
          grid,
          userId: userId ?? '',
        }),
      );
    },
    [userId],
  );

  const sendDrumMode = useCallback(
    (mode: DrumMode, drummerId: string | null) => {
      const ws = providerRef.current?.ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: 'jam:drum-mode',
          mode,
          drummerId,
          userId: userId ?? '',
        }),
      );
    },
    [userId],
  );

  const sendDrumTransport = useCallback(
    (transport: DrumTransport) => {
      const ws = providerRef.current?.ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: 'jam:drum-transport',
          ...transport,
          userId: userId ?? '',
        }),
      );
    },
    [userId],
  );

  const sendStudioInvite = useCallback(
    (roomCode: string) => {
      const ws = providerRef.current?.ws;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: 'jam:studio-invite',
          roomCode,
          userId: userId ?? '',
        }),
      );
    },
    [userId],
  );

  // Server wall-clock estimate — the shared timeline anchor for drum playback.
  const serverNow = useCallback(() => rttRef.current.serverNow(), []);

  // ── Subscribe to note messages ─────────────────────────────────────────

  const onNoteMessage = useCallback(
    (handler: (msg: JamNoteMessage) => void) => {
      noteListenersRef.current.add(handler);
      return () => {
        noteListenersRef.current.delete(handler);
      };
    },
    [],
  );

  // ── Instrument change ──────────────────────────────────────────────────

  const setLocalInstrument = useCallback((inst: JamInstrument) => {
    useJamRoomStore.getState().setLocalInstrument(inst);
    const awareness = providerRef.current?.awareness;
    if (awareness) {
      const current = awareness.getLocalState() as JamPresence | null;
      if (current) {
        awareness.setLocalState({
          ...current,
          instrument: inst,
          gmProgram: useJamRoomStore.getState().localGmProgram,
        });
      }
    }
  }, []);

  // ── Context value ──────────────────────────────────────────────────────

  const value = useMemo<JamRoomContextValue>(
    () => ({
      isConnected,
      roomId,
      roomCode,
      roomError,
      createAndJoinRoom,
      joinRoomByCode,
      joinRoom,
      leaveRoom,
      sendNote,
      sendChat,
      isHost,
      sendDrumGrid,
      sendDrumMode,
      sendDrumTransport,
      sendStudioInvite,
      serverNow,
      localColor: colorRef.current,
      setLocalInstrument,
      remotePlayers,
      onNoteMessage,
      latencyMs,
    }),
    [
      isConnected,
      roomId,
      roomCode,
      roomError,
      createAndJoinRoom,
      joinRoomByCode,
      joinRoom,
      leaveRoom,
      sendNote,
      sendChat,
      isHost,
      sendDrumGrid,
      sendDrumMode,
      sendDrumTransport,
      sendStudioInvite,
      serverNow,
      setLocalInstrument,
      remotePlayers,
      onNoteMessage,
      latencyMs,
    ],
  );

  return (
    <JamRoomContext.Provider value={value}>{children}</JamRoomContext.Provider>
  );
}
