import { useEffect, useRef } from 'react';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { useSyncStoreToEngine } from '@/daw/oracle-synth/hooks/useSyncStoreToEngine';
import { useStore } from '@/daw/store';

// ── Per-track state cache ────────────────────────────────────────────────
// Module-level map so state persists across React re-renders.

interface StateSnapshot {
  oscillators: unknown;
  subOscillator: unknown;
  noise: unknown;
  filters: unknown;
  envelopes: unknown;
  lfos: unknown;
  modRoutes: unknown;
  voiceMode: unknown;
  voiceCount: unknown;
  glide: unknown;
  spread: unknown;
  masterVolume: unknown;
  fx: unknown;
  fxRoutes: unknown;
  routing: unknown;
  arp: unknown;
  presetName: unknown;
  pitchBendRange: unknown;
  bpm: unknown;
}

const SNAPSHOT_KEYS: (keyof StateSnapshot)[] = [
  'oscillators',
  'subOscillator',
  'noise',
  'filters',
  'envelopes',
  'lfos',
  'modRoutes',
  'voiceMode',
  'voiceCount',
  'glide',
  'spread',
  'masterVolume',
  'fx',
  'fxRoutes',
  'routing',
  'arp',
  'presetName',
  'pitchBendRange',
  'bpm',
];

const stateCache = new Map<string, StateSnapshot>();

function takeSnapshot(): StateSnapshot {
  const s = useSynthStore.getState();
  const snap = {} as StateSnapshot;
  for (const key of SNAPSHOT_KEYS) {
    const val = (s as unknown as Record<string, unknown>)[key];
    snap[key] =
      typeof val === 'object' && val !== null ? structuredClone(val) : val;
  }
  return snap;
}

function restoreSnapshot(snap: StateSnapshot): void {
  useSynthStore.setState(
    snap as unknown as Partial<ReturnType<typeof useSynthStore.getState>>,
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * Bridges the Oracle Synth singleton zustand store to a specific DAW track's
 * SynthEngine. When the track changes, the current store state is cached and
 * the new track's state is restored (or defaults are used for first visit).
 */
export function useStoreBridge(
  engine: SynthEngine | null,
  trackId: string | null,
) {
  const prevTrackIdRef = useRef<string | null>(null);

  // Handle track switching: save outgoing state, restore incoming state
  useEffect(() => {
    const prevId = prevTrackIdRef.current;

    // Save outgoing track's state
    if (prevId && prevId !== trackId) {
      stateCache.set(prevId, takeSnapshot());
    }

    // Restore incoming track's state (if cached)
    if (trackId) {
      const cached = stateCache.get(trackId);
      if (cached) {
        restoreSnapshot(cached);
      }
    }

    prevTrackIdRef.current = trackId;
  }, [trackId]);

  // Save state on unmount so it persists when panel closes
  useEffect(() => {
    return () => {
      const id = prevTrackIdRef.current;
      if (id) {
        stateCache.set(id, takeSnapshot());
      }
    };
  }, []);

  // Bind store subscriptions to engine (handles initial sync internally)
  useSyncStoreToEngine(engine);

  // Sync DAW BPM → Oracle Synth engine (LFO rates + arpeggiator)
  const dawBpm = useStore((s) => s.bpm);

  useEffect(() => {
    if (!engine) return;
    engine.setBPM(dawBpm);
  }, [engine, dawBpm]);
}
