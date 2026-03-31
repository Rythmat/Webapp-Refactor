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
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { RttMeasurer } from '@/daw/collab/transportSync';
import { PRESENCE_COLORS } from '@/daw/collab/types';
import { useJamRoomStore } from './jamRoomStore';
import type {
  JamInstrument,
  JamNoteMessage,
  JamChatMessage,
  JamPresence,
} from './types';

// ── Context ──────────────────────────────────────────────────────────────

interface JamRoomContextValue {
  isConnected: boolean;
  roomId: string | null;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  sendNote: (msg: Omit<JamNoteMessage, 'userId' | 'color'>) => void;
  sendChat: (text: string) => void;
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
  joinRoom: () => {},
  leaveRoom: () => {},
  sendNote: () => {},
  sendChat: () => {},
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

const PARTYKIT_HOST =
  (import.meta as Record<string, Record<string, string>>).env
    ?.VITE_PARTYKIT_HOST ?? 'localhost:1999';

interface JamRoomProviderProps {
  children: ReactNode;
}

export function JamRoomProvider({ children }: JamRoomProviderProps) {
  const { userId, appUser, token } = useAuthContext();

  const providerRef = useRef<YPartyKitProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const rttRef = useRef(new RttMeasurer());
  const colorRef = useRef(PRESENCE_COLORS[0]);
  const noteListenersRef = useRef<Set<(msg: JamNoteMessage) => void>>(
    new Set(),
  );

  // Reactive state (triggers re-renders for UI)
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<JamPresence[]>([]);
  const [latencyMs, setLatencyMs] = useState(0);

  // ── Message handler ────────────────────────────────────────────────────

  const handleMessage = useCallback((event: MessageEvent) => {
    if (typeof event.data !== 'string') return;
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'jam:note') {
        const msg = data as JamNoteMessage;
        // Dispatch to audio listeners (low-latency path, no React re-render)
        noteListenersRef.current.forEach((handler) => handler(msg));
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

      if (data.type === 'pong') {
        rttRef.current.handlePong(data.clientTimestamp);
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
    setRemotePlayers([]);
    setLatencyMs(0);
    useJamRoomStore.getState().reset();
  }, []);

  // ── Join ───────────────────────────────────────────────────────────────

  const joinRoom = useCallback(
    (newRoomId: string) => {
      teardown();

      // Minimal Yjs doc (only for awareness protocol, not synced)
      const doc = new Y.Doc();
      docRef.current = doc;
      setRoomId(newRoomId);

      // Connect to PartyKit with jam-prefixed room name
      const params: Record<string, string> = {};
      if (token) params.token = token;

      const provider = new YPartyKitProvider(
        PARTYKIT_HOST,
        `jam-${newRoomId}`,
        doc,
        { connect: true, params },
      );
      providerRef.current = provider;

      // Assign color from client ID
      const colorIndex = provider.awareness.clientID % PRESENCE_COLORS.length;
      colorRef.current = PRESENCE_COLORS[colorIndex];

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
      provider.on('sync', () => setIsConnected(true));
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

  // ── Leave ──────────────────────────────────────────────────────────────

  const leaveRoom = useCallback(() => teardown(), [teardown]);

  // Cleanup on unmount
  useEffect(() => teardown, [teardown]);

  // ── Send note ──────────────────────────────────────────────────────────

  const sendNote = useCallback(
    (msg: Omit<JamNoteMessage, 'userId' | 'color'>) => {
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
      joinRoom,
      leaveRoom,
      sendNote,
      sendChat,
      localColor: colorRef.current,
      setLocalInstrument,
      remotePlayers,
      onNoteMessage,
      latencyMs,
    }),
    [
      isConnected,
      roomId,
      joinRoom,
      leaveRoom,
      sendNote,
      sendChat,
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
