/**
 * The guitar lesson behind a Learn → Theory tile, by the tile's slug: the
 * diatonic modes from buildGuitarModeFlow (Ionian is The Guitar Atlas: Book
 * One), the rest of Theory from buildGuitarScaleFlow. Its own module, so the
 * Learn hub can load it on demand and tests can stand in for either builder.
 */

import type { ActivityFlowV2 } from '../../types/activity.v2';
import { isGuitarMode } from '../guitar/modes/modeNames';
import { guitarTheoryEntry } from '../guitar/theoryCatalog';
import {
  buildGuitarModeFlow,
  buildGuitarScaleFlow,
} from './guitarAppliedTheoryFundamentals';

/**
 * Builds the guitar lesson of a live Theory tile in a key.
 * @param keyName - ASCII key name, e.g. 'C', 'F#', 'Db'.
 * @param slug - The Theory tile's slug: 'dorian', 'ionian#5', 'minorblues'.
 */
export function buildGuitarTheoryFlow(
  keyName: string,
  slug: string,
): ActivityFlowV2 {
  const entry = guitarTheoryEntry(slug);
  if (!entry) throw new Error(`No guitar lesson for "${slug}"`);
  return isGuitarMode(entry.key)
    ? buildGuitarModeFlow(keyName, entry.key)
    : buildGuitarScaleFlow(keyName, entry.key);
}
