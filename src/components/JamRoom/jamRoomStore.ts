// ── Jam Room Store ────────────────────────────────────────────────────────
// Lightweight Zustand store scoped to the JamRoom component tree.

import { create } from 'zustand';
import {
  defaultDrumTransport,
  emptyDrumGrid,
  type DrumGrid,
  type DrumMode,
  type DrumTransport,
  type JamChatMessage,
  type JamInstrument,
} from './types';

export interface ActiveNote {
  midi: number;
  color: string;
  instrument: JamInstrument;
  timestamp: number;
}

interface JamRoomState {
  /** Remote notes currently being held, keyed by userId. */
  activeRemoteNotes: Map<string, ActiveNote[]>;
  /** Chat messages (ephemeral, not persisted). */
  chatMessages: JamChatMessage[];
  /** Local instrument choice. */
  localInstrument: JamInstrument;
  /** Local GM program number (0-127). Default 0 = Acoustic Grand Piano. */
  localGmProgram: number;
  /** Current drum-machine tempo — used to map a recorded jam onto the
   *  studio timeline when bringing it into the DAW. */
  localBpm: number;
  /** Shared drum sequencer pattern (synced across the room). */
  drumGrid: DrumGrid;
  /** Who may edit the shared drum pattern. */
  drumMode: DrumMode;
  /** Designated drummer's userId when `drumMode` is `designated`. */
  drummerId: string | null;
  /** Room-wide sequencer transport (lock-step playback across devices). */
  drumTransport: DrumTransport;
  /**
   * Set when the host moves the jam into a collaborative Studio session, so
   * other players can be offered the chance to join. `null` otherwise.
   */
  studioInvite: { roomCode: string } | null;

  // --- Actions ---
  addRemoteNote: (userId: string, note: ActiveNote) => void;
  removeRemoteNote: (userId: string, midi: number) => void;
  clearUserNotes: (userId: string) => void;
  addChatMessage: (msg: JamChatMessage) => void;
  setLocalInstrument: (instrument: JamInstrument) => void;
  setLocalGmProgram: (program: number) => void;
  setLocalBpm: (bpm: number) => void;
  setDrumGrid: (grid: DrumGrid) => void;
  setDrumMode: (mode: DrumMode, drummerId: string | null) => void;
  setDrumTransport: (transport: DrumTransport) => void;
  setStudioInvite: (invite: { roomCode: string } | null) => void;
  reset: () => void;
}

export const useJamRoomStore = create<JamRoomState>((set) => ({
  activeRemoteNotes: new Map(),
  chatMessages: [],
  localInstrument: 'piano',
  localGmProgram: 0,
  localBpm: 100,
  drumGrid: emptyDrumGrid(),
  drumMode: 'open',
  drummerId: null,
  drumTransport: defaultDrumTransport(),
  studioInvite: null,

  addRemoteNote: (userId, note) =>
    set((state) => {
      const next = new Map(state.activeRemoteNotes);
      const existing = next.get(userId) ?? [];
      next.set(userId, [...existing, note]);
      return { activeRemoteNotes: next };
    }),

  removeRemoteNote: (userId, midi) =>
    set((state) => {
      const next = new Map(state.activeRemoteNotes);
      const existing = next.get(userId);
      if (existing) {
        const filtered = existing.filter((n) => n.midi !== midi);
        if (filtered.length > 0) {
          next.set(userId, filtered);
        } else {
          next.delete(userId);
        }
      }
      return { activeRemoteNotes: next };
    }),

  clearUserNotes: (userId) =>
    set((state) => {
      const next = new Map(state.activeRemoteNotes);
      next.delete(userId);
      return { activeRemoteNotes: next };
    }),

  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-99), msg],
    })),

  setLocalInstrument: (instrument) => set({ localInstrument: instrument }),

  setLocalGmProgram: (program) => set({ localGmProgram: program }),

  setLocalBpm: (bpm) => set({ localBpm: bpm }),

  setDrumGrid: (grid) => set({ drumGrid: grid }),

  setDrumMode: (mode, drummerId) => set({ drumMode: mode, drummerId }),

  setDrumTransport: (transport) => set({ drumTransport: transport }),

  setStudioInvite: (invite) => set({ studioInvite: invite }),

  reset: () =>
    set({
      activeRemoteNotes: new Map(),
      chatMessages: [],
      localInstrument: 'piano',
      localGmProgram: 0,
      localBpm: 100,
      drumGrid: emptyDrumGrid(),
      drumMode: 'open',
      drummerId: null,
      drumTransport: defaultDrumTransport(),
      studioInvite: null,
    }),
}));
