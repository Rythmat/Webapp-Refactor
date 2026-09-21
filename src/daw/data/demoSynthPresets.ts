import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import { synthTrackStateFromPreset } from '@/daw/oracle-synth/synthTrackState';
import type { CloudProjectDetail } from '@/daw/persistence/SessionSerializer';

/**
 * Give a demo's Oracle Synth tracks their factory patch before the bundle
 * hydrates. Resolved here, where the editor already loads the synth, rather
 * than stored in demoProjects.ts — the Studio dashboard imports that file too
 * and shouldn't pull the synth in. Deserializing seeds the patch into the
 * per-track synth cache, and instrument init applies it to the engine.
 */
export function withDemoSynthPresets(
  bundle: CloudProjectDetail,
  presets: Record<string, string> | undefined,
): CloudProjectDetail {
  if (!presets) return bundle;
  return {
    ...bundle,
    tracks: bundle.tracks.map((track) => {
      const preset = FACTORY_PRESETS.find(
        (p) => p.name === presets[track.name],
      );
      if (!preset || track.instrument !== 'oracle-synth') return track;
      return {
        ...track,
        settings: {
          ...track.settings,
          oracleSynth: synthTrackStateFromPreset(preset, bundle.bpm),
        },
      };
    }),
  };
}
