/**
 * The ukulele lesson behind a Learn → Theory tile, by the tile's slug. Its
 * own module, so the Learn hub can load it on demand.
 */

import type { ActivityFlowV2 } from '../../types/activity.v2';
import { ukuleleTheoryEntry } from '../ukulele/theoryCatalog';
import { buildUkuleleScaleFlow } from './ukuleleAppliedTheory';

/**
 * Builds the ukulele lesson of a live Theory tile in a key.
 * @param keyName - ASCII key name, e.g. 'C', 'F#', 'Db'.
 * @param slug - The Theory tile's slug: 'dorian', 'ionian#5', 'minorblues'.
 */
export function buildUkuleleTheoryFlow(
  keyName: string,
  slug: string,
): ActivityFlowV2 {
  const entry = ukuleleTheoryEntry(slug);
  if (!entry) throw new Error(`No ukulele lesson for "${slug}"`);
  return buildUkuleleScaleFlow(keyName, entry.key);
}
