import { useEffect, useRef } from 'react';
import { CHORDS } from '@prism/engine';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useSyncStoreToEngine } from '@/daw/oracle-synth/hooks/useSyncStoreToEngine';
import {
  captureSynthState,
  restoreCachedSynthState,
  cacheSynthState,
  setActiveSynthTrack,
} from '@/daw/oracle-synth/synthTrackState';
import { useSynthStore } from '@/daw/oracle-synth/store';
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

  // ── Music-intelligence bus → Oracle ──────────────────────────────────────

  // Follow-project-key: when enabled, mirror the project's detected key into
  // the synth's Key/Scale (the store→engine sync hook pushes it onward).
  const detectedKeyRootPc = useStore((s) => s.detectedKeyRootPc);
  const detectedMode = useStore((s) => s.detectedMode);
  const followProjectKey = useSynthStore((s) => s.keyScale.followProjectKey);

  useEffect(() => {
    if (!followProjectKey || detectedKeyRootPc == null || !detectedMode) return;
    const { keyScale, isDirty, setKeyScale } = useSynthStore.getState();
    if (
      keyScale.rootPc !== detectedKeyRootPc ||
      keyScale.mode !== detectedMode
    ) {
      setKeyScale({ rootPc: detectedKeyRootPc, mode: detectedMode });
      // Machine-driven mirror, not a user edit — don't leave the preset
      // marked dirty just because key detection resolved.
      if (!isDirty) {
        useSynthStore.setState({ isDirty: false });
      }
    }
  }, [followProjectKey, detectedKeyRootPc, detectedMode]);

  // Chord-aware arp: feed the live-detected chord's pitch classes to the
  // arpeggiator. Held notes remain the seed, so a lagging bus only delays
  // the constraint, never the arp itself.
  const liveChordStream = useStore((s) => s.liveChordStream);
  const arpChordAware = useSynthStore((s) => s.arp.chordAware ?? false);

  useEffect(() => {
    if (!engine) return;
    if (!arpChordAware) {
      engine.setArpChordContext(null);
      return;
    }
    const lastChord = liveChordStream[liveChordStream.length - 1];
    const intervals = lastChord ? CHORDS[lastChord.quality] : undefined;
    engine.setArpChordContext(
      lastChord && intervals
        ? intervals.map((iv) => (lastChord.rootPc + iv) % 12)
        : null,
    );
    // On unmount/engine change, clear the mask — a deselected track's
    // engine would otherwise snap its arp to a frozen chord forever.
    return () => {
      engine.setArpChordContext(null);
    };
  }, [engine, arpChordAware, liveChordStream]);
}
