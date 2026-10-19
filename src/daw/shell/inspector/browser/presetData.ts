/**
 * presetData.ts — the Oracle Synth patch a Library preset names (2.14): a
 * factory patch, one of the SERUM pack's (the pack loads on the first one
 * asked for, about 1.7 MB, as opening a synth panel loads it) or one of the
 * student's own.
 */

import { useSynthStore } from '@/daw/oracle-synth/store';
import { FACTORY_PRESETS } from '@/daw/oracle-synth/store/presets/factoryPresets';
import { loadOraclePacks } from '@/daw/oracle-synth/store/presets/packLoader';
import type { PresetData } from '@/daw/oracle-synth/store/presets/PresetData';
import type { PresetItem } from './items';

export async function presetData(
  item: Pick<PresetItem, 'source' | 'presetName'>,
): Promise<PresetData | undefined> {
  if (item.source === 'oracle') {
    return FACTORY_PRESETS.find((p) => p.name === item.presetName);
  }
  if (item.source === 'pack') {
    await loadOraclePacks();
    return useSynthStore
      .getState()
      .packPresets.find((p) => p.name === item.presetName)?.data;
  }
  if (item.source === 'mine') {
    return useSynthStore
      .getState()
      .userPresets.find((p) => p.name === item.presetName)?.data;
  }
  return undefined;
}
