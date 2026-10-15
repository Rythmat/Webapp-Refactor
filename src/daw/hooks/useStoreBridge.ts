import { useEffect, useRef } from 'react';
import { CHORDS } from '@prism/engine';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useSyncStoreToEngine } from '@/daw/oracle-synth/hooks/useSyncStoreToEngine';
import {
  showTrackSynthState,
  keepLiveSynthState,
  setActiveSynthTrack,
  getActiveSynthTrack,
  acquireSynthBridge,
  releaseSynthBridge,
  writeLivePatchAsSystem,
} from '@/daw/oracle-synth/synthTrackState';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useSessionGeneration } from '@/daw/session/useSessionGeneration';
import { useStore } from '@/daw/store';

// ── Hook ─────────────────────────────────────────────────────────────────

/**
 * Bridges the Oracle Synth singleton zustand store to a specific DAW track's
 * SynthEngine. When the track changes, the current store state is cached and
 * the new track's state is restored, or the default patch on a track's first
 * visit.
 *
 * The bridge is keyed on the track and the session generation: a load or a
 * reset can keep the panel open over a track id the new project reuses (kept
 * work restored, a project reopened), and that track must show the new
 * project's patch, not keep the one the panel was showing.
 *
 * The per-track patch cache is owned by synthTrackState.ts so the session
 * serializer can persist the same patches that live editing reads/writes.
 */
export function useStoreBridge(
  engine: SynthEngine | null,
  trackId: string | null,
) {
  const generation = useSessionGeneration();
  const prevTrackIdRef = useRef<string | null>(null);
  // The session generation the panel showed prevTrackIdRef's patch in.
  const prevGenerationRef = useRef(0);

  // Handle track switching (and loads): save outgoing state, show incoming
  useEffect(() => {
    // The live generation, not this render's: a load can start between the
    // render and its effect (the render it schedules runs this again).
    const current = getSessionGeneration();
    const prevId = prevTrackIdRef.current;

    // Save the outgoing track's live patch. Not after a load or reset: the
    // store then holds the previous project's patch, and caching it under an
    // id the new project reuses would replace that track's own patch.
    if (prevId && prevId !== trackId && prevGenerationRef.current === current) {
      keepLiveSynthState(prevId);
    }

    // Show the incoming track's patch: the cached one (including patches
    // seeded from a freshly loaded project), else the default patch, never
    // the previous track's. Skip it when the track is already live: a second
    // panel opening on it (the full-screen pop-out over the inline strip)
    // would otherwise roll the store back to the stale cached patch and throw
    // away the sound picked since. A load or reset leaves no track live.
    if (trackId && trackId !== getActiveSynthTrack()) {
      showTrackSynthState(trackId);
    }

    // Mark which track's patch is now live in the shared store so the
    // serializer reads the store (not a stale cache entry) when saving it.
    setActiveSynthTrack(trackId);
    prevTrackIdRef.current = trackId;
    prevGenerationRef.current = current;
  }, [trackId, generation]);

  // Save state on unmount so it persists when panel closes. Only the last
  // panel to close clears the live track — another one may still be editing it.
  useEffect(() => {
    acquireSynthBridge();
    return () => {
      const id = prevTrackIdRef.current;
      // As on a switch, a patch from before a load or reset isn't this
      // session's to cache.
      if (id && prevGenerationRef.current === getSessionGeneration()) {
        keepLiveSynthState(id);
      }
      if (releaseSynthBridge()) setActiveSynthTrack(null);
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
      // The app's write, not the student's: a track still on its untouched
      // default patch keeps having none of its own, so opening its panel in
      // a project with a detected key doesn't edit the project. A track with
      // a patch of its own still takes the key into it (1.16 decides).
      writeLivePatchAsSystem(() => {
        setKeyScale({ rootPc: detectedKeyRootPc, mode: detectedMode });
        // Machine-driven mirror, not a user edit — don't leave the preset
        // marked dirty just because key detection resolved.
        if (!isDirty) {
          useSynthStore.setState({ isDirty: false });
        }
      });
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
