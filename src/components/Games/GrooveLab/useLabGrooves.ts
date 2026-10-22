import { useEffect, useState } from 'react';
import type { DrumGroove } from '@/curriculum/engine/drumGrooves/drumGroove';
import {
  getDesignedGroove,
  loadStudioGrooves,
} from '@/curriculum/engine/drumGrooves/registry';
import { GROOVE_LAB_GROOVE_IDS } from '@/curriculum/engine/grooveLab/grooveList';

/**
 * The designed grooves Groove Lab plays, by id, published ones only; null
 * while the Studio's (which load on demand) are on their way.
 */
export function useLabGrooves(): ReadonlyMap<string, DrumGroove> | null {
  const [grooves, setGrooves] = useState<ReadonlyMap<
    string,
    DrumGroove
  > | null>(null);
  useEffect(() => {
    let gone = false;
    void (async () => {
      const studio = await loadStudioGrooves().catch(() => []);
      const found = new Map<string, DrumGroove>();
      for (const id of GROOVE_LAB_GROOVE_IDS) {
        const groove = getDesignedGroove(id) ?? studio.find((g) => g.id === id);
        if (groove?.status === 'live') found.set(id, groove);
      }
      if (!gone) setGrooves(found);
    })();
    return () => {
      gone = true;
    };
  }, []);
  return grooves;
}
