// ── Studio Listen Store ─────────────────────────────────────────────────────
// Lightweight, PER-USER-LOCAL state controlling how this user monitors other
// collaborators' live signals (live MIDI + mic/instrument audio). NONE of this
// is synced to peers — each user independently decides what they hear.
//
//   • listenMode 'all'  — hear every collaborator; the per-track button mutes.
//   • listenMode 'solo' — per-track button toggles listen (defaults to listen).
//
// Audibility of a remote-selected track (keyed by that track's id):
//   all  → audible unless explicitly muted        (allMuted)
//   solo → audible unless explicitly unlistened    (soloUnlistened)
// Both modes therefore default to "hear everything"; only the semantics of the
// per-track toggle (mute vs. listen) differ.

import { create } from 'zustand';

export type ListenMode = 'all' | 'solo';

interface StudioListenState {
  listenMode: ListenMode;
  /** trackId → true when muted in Listen-All mode. */
  allMuted: Record<string, boolean>;
  /** trackId → true when unlistened in Solo-Listen mode. */
  soloUnlistened: Record<string, boolean>;
  /** trackId → recent live-signal level (0..1) from that remote user. */
  activity: Record<string, number>;

  toggleListenMode: () => void;
  /** Flip the per-track audibility for the current mode. */
  toggleTrackAudible: (trackId: string) => void;
  setActivity: (trackId: string, level: number) => void;
}

export const useStudioListenStore = create<StudioListenState>((set) => ({
  listenMode: 'solo',
  allMuted: {},
  soloUnlistened: {},
  activity: {},

  toggleListenMode: () =>
    set((s) => ({ listenMode: s.listenMode === 'all' ? 'solo' : 'all' })),

  toggleTrackAudible: (trackId) =>
    set((s) => {
      if (s.listenMode === 'all') {
        return { allMuted: { ...s.allMuted, [trackId]: !s.allMuted[trackId] } };
      }
      return {
        soloUnlistened: {
          ...s.soloUnlistened,
          [trackId]: !s.soloUnlistened[trackId],
        },
      };
    }),

  setActivity: (trackId, level) =>
    set((s) => {
      // Avoid churn when the value is effectively unchanged.
      if (Math.abs((s.activity[trackId] ?? 0) - level) < 0.02) return s;
      return { activity: { ...s.activity, [trackId]: level } };
    }),
}));

// ── Pure selectors ─────────────────────────────────────────────────────────

/** Whether this user currently hears the given remote-selected track. */
export function isRemoteTrackAudible(
  state: StudioListenState,
  trackId: string,
): boolean {
  return state.listenMode === 'all'
    ? !state.allMuted[trackId]
    : !state.soloUnlistened[trackId];
}

/** Imperative read for non-React callers (audio routing, RTC gains). */
export function getRemoteTrackAudible(trackId: string): boolean {
  return isRemoteTrackAudible(useStudioListenStore.getState(), trackId);
}

// ── React hooks ──────────────────────────────────────────────────────────

export function useListenMode(): ListenMode {
  return useStudioListenStore((s) => s.listenMode);
}

export function useRemoteTrackAudible(trackId: string): boolean {
  return useStudioListenStore((s) => isRemoteTrackAudible(s, trackId));
}

export function useRemoteTrackActivity(trackId: string): number {
  return useStudioListenStore((s) => s.activity[trackId] ?? 0);
}
