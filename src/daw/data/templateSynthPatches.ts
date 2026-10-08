import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import {
  setTrackSynthState,
  synthTrackStateFromPreset,
} from '@/daw/oracle-synth/synthTrackState';
import { useStore } from '@/daw/store';
import { getProjectTemplate } from './projectTemplates';

/**
 * Give a just-loaded project template's Oracle Synth tracks the patches the
 * template names (`synthPreset` — a factory or Music Atlas patch). Call it
 * straight after `loadProjectTemplate`, in the same tick: the track engines
 * initialise in an effect after that, and pick the seeded patch up then —
 * the same path a saved project's patches take. Kept out of the store so the
 * store doesn't pull the synth in (as with demoSynthPresets.ts).
 */
export function seedTemplateSynthPatches(templateId: string): void {
  const template = getProjectTemplate(templateId);
  if (!template) return;
  const { tracks, updateTrack } = useStore.getState();
  for (const def of template.tracks) {
    if (!def.synthPreset || def.instrument !== 'oracle-synth') continue;
    const preset = FACTORY_PRESETS.find((p) => p.name === def.synthPreset);
    const track = tracks.find(
      (t) => t.name === def.name && t.instrument === 'oracle-synth',
    );
    if (!preset || !track) continue;
    setTrackSynthState(
      track.id,
      synthTrackStateFromPreset(preset, template.bpm),
    );
    updateTrack(track.id, { presetName: preset.name });
  }
}
