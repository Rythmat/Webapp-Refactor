import type {
  GrooveInput,
  LessonInput,
  NamedInput,
  PartInput,
} from '@/content/graph/deriveGraph';
import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import { listDesignedGrooves } from '@/curriculum/engine/drumGrooves/registry';
import { FEEL_PROFILES } from '@/curriculum/engine/parts/feel';
import { listParts } from '@/curriculum/engine/parts/registry';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';
import { patchFileId } from '@/daw/oracle-synth/store/presets/atlasPatches';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import { STUDIO_GROOVES } from '../../drumGrooves/studioGrooves';
import { grooveInput, kebab, lessonId, partInput } from './instrumentInputs';

export {
  grooveInput,
  lessonId,
  partInput,
  partInstrument,
} from './instrumentInputs';

/**
 * The console's instrument content as the graph reads it (CODE_OWNERS.grooves
 * … drumKits): the lesson and Studio drum grooves, the Parts Library, feel
 * profiles, synth patches and drum kits, each turned into the graph's own
 * input shape — vocabulary ids, not the engine's — so the graph module never
 * imports an engine.
 */

/** The instrument-content lists of a graph snapshot. */
export function instrumentContentSnapshot(): {
  grooves: GrooveInput[];
  parts: PartInput[];
  feels: NamedInput[];
  patches: NamedInput[];
  kits: NamedInput[];
} {
  const grooves = new Map<string, DrumGroove>();
  for (const g of [...STUDIO_GROOVES, ...listDesignedGrooves()]) {
    grooves.set(g.id, g);
  }
  return {
    grooves: [...grooves.values()].map(grooveInput),
    parts: listParts().map(partInput),
    feels: FEEL_PROFILES.map((f) => ({ id: f.id, name: f.name })),
    patches: FACTORY_PRESETS.map((p) => ({
      id: patchFileId(p.name),
      name: p.name,
    })),
    kits: DRUM_KIT_CONFIGS.map((k) => ({ id: kebab(k.id), name: k.label })),
  };
}

/**
 * Every genre lesson level the repo bundles, with the grooves its play-along
 * steps play over: a step's own `grooveId`, else its style's default (what
 * the backing engine resolves). Loaded on demand, like the rest of the repo
 * snapshot.
 */
export async function loadLessonInputs(): Promise<LessonInput[]> {
  const [{ loadAllFlows }, { resolveStepGrooveId }] = await Promise.all([
    import('@/curriculum/data/activityFlows/bundled'),
    import('@/curriculum/engine/genreGeneration/backingPatterns'),
  ]);
  const flows = [...(await loadAllFlows()).values()].flat();
  return flows
    .filter((flow): flow is ActivityFlowV2 => 'version' in flow)
    .map((flow) => ({
      id: lessonId(flow.genre, flow.level),
      name: `${flow.title} · L${flow.level}`,
      grooveIds: flow.sections.flatMap((section) =>
        section.steps
          .filter((step) =>
            step.backing_parts?.engine_generates?.includes('drums'),
          )
          .map((step) => resolveStepGrooveId(step, flow.genre, flow.level)),
      ),
    }));
}
