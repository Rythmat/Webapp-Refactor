// ── Jam Room Store ────────────────────────────────────────────────────────
// Lightweight Zustand store scoped to the JamRoom component tree.

import { create } from 'zustand';
import type { JamChatMessage, JamInstrument } from './types';

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

  // --- Actions ---
  addRemoteNote: (userId: string, note: ActiveNote) => void;
  removeRemoteNote: (userId: string, midi: number) => void;
  clearUserNotes: (userId: string) => void;
  addChatMessage: (msg: JamChatMessage) => void;
  setLocalInstrument: (instrument: JamInstrument) => void;
  setLocalGmProgram: (program: number) => void;
  reset: () => void;
}

export const useJamRoomStore = create<JamRoomState>((set) => ({
  activeRemoteNotes: new Map(),
  chatMessages: [],
  localInstrument: 'piano',
  localGmProgram: 0,

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

  reset: () =>
    set({
      activeRemoteNotes: new Map(),
      chatMessages: [],
      localInstrument: 'piano',
      localGmProgram: 0,
    }),
}));
