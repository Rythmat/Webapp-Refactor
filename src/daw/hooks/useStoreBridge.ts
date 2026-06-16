import { useEffect, useRef } from 'react';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useSyncStoreToEngine } from '@/daw/oracle-synth/hooks/useSyncStoreToEngine';
import {
  captureSynthState,
  restoreCachedSynthState,
  cacheSynthState,
  setActiveSynthTrack,
} from '@/daw/oracle-synth/synthTrackState';
import { useStore } from '@/daw/store';

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * Bridges the Oracle Synth singleton zustand store to a specific DAW track's
 * SynthEngine. When the track changes, the current store state is cached and
 * the new track's state is restored (or defaults are used for first visit).
 *
 * The per-track patch cache is owned by synthTrackState.ts so the session
 * serializer can persist the same patches that live editing reads/writes.
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
      cacheSynthState(prevId, captureSynthState());
    }

    // Restore incoming track's state (if cached — including patches seeded from
    // a freshly loaded project)
    if (trackId) {
      restoreCachedSynthState(trackId);
    }

    // Mark which track's patch is now live in the shared store so the
    // serializer reads the store (not a stale cache entry) when saving it.
    setActiveSynthTrack(trackId);
    prevTrackIdRef.current = trackId;
  }, [trackId]);

  // Save state on unmount so it persists when panel closes
  useEffect(() => {
    return () => {
      const id = prevTrackIdRef.current;
      if (id) {
        cacheSynthState(id, captureSynthState());
      }
      setActiveSynthTrack(null);
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
