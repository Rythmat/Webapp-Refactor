import { useMemo, useSyncExternalStore } from 'react';
import { useStore } from '@/daw/store';
import { getTrackAudioState, subscribeEngineReady, getEngineReadyVersion } from './usePlaybackEngine';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';

// ── Hook ──────────────────────────────────────────────────────────────────
// Returns the SynthEngine instance for the selected oracle-synth track.

export function useOracleSynthInstance() {
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const tracks = useStore((s) => s.tracks);

  // Re-render when any instrument finishes async init
  const readyVersion = useSyncExternalStore(subscribeEngineReady, getEngineReadyVersion);

  const track = tracks.find((t) => t.id === selectedTrackId);
  const isOracleSynth = track?.instrument === 'oracle-synth';

  const engine = useMemo(() => {
    if (!selectedTrackId || !isOracleSynth) return null;
    const audioState = getTrackAudioState(selectedTrackId);
    if (!audioState) return null;
    const adapter = audioState.instrument;
    if (adapter instanceof OracleSynthAdapter) {
      return adapter.getEngine();
    }
    return null;
  }, [selectedTrackId, isOracleSynth, readyVersion]);

  return {
    isVisible: isOracleSynth && !!selectedTrackId,
    engine,
    trackId: selectedTrackId,
    trackName: track?.name ?? '',
  };
}
