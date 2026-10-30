/**
 * The bass lesson behind a Learn → Theory tile, by the tile's slug. Its own
 * module, so the Learn hub can load it on demand.
 */

import type { ActivityFlowV2 } from '../../types/activity.v2';
import { bassTheoryEntry } from '../bass/theoryCatalog';
import { buildBassScaleFlow } from './bassAppliedTheory';

/**
 * Builds the bass lesson of a live Theory tile in a key.
 * @param keyName - ASCII key name, e.g. 'C', 'F#', 'Db'.
 * @param slug - The Theory tile's slug: 'dorian', 'ionian#5', 'minorblues'.
 */
export function buildBassTheoryFlow(
  keyName: string,
  slug: string,
): ActivityFlowV2 {
  const entry = bassTheoryEntry(slug);
  if (!entry) throw new Error(`No bass lesson for "${slug}"`);
  return buildBassScaleFlow(keyName, entry.key);
}
