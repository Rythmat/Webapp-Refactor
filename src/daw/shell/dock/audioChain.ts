// ── An audio track's chain: one amp at a time ──────────────────────────────
//
// A plain audio track's chain (AudioFxCards) holds at most one amp: picking
// another amp swaps the model of the one there, and a chain that arrives
// with more (an old save, an undo, a collaborator's edit) keeps only its
// first. These are the rules, kept apart from the view so they're tested on
// their own.

interface ChainBlock {
  type: string;
  namModelId?: string | null;
}

/** Whether `block` is an amp. */
export const isAmp = (block: ChainBlock) => block.type === 'nam-amp';

/** `chain` with at most one amp: the first stays, in its slot. */
export function withOneAmp<T extends ChainBlock>(chain: readonly T[]): T[] {
  let seen = false;
  return chain.filter((block) => {
    if (!isAmp(block)) return true;
    if (seen) return false;
    seen = true;
    return true;
  });
}

/**
 * `chain` with the amp `modelId`: the amp there takes the model, in its
 * slot; with none, `makeAmp()` joins at the end. Never two amps.
 */
export function withAmp<T extends ChainBlock>(
  chain: readonly T[],
  modelId: string,
  makeAmp: () => T,
): T[] {
  const one = withOneAmp(chain);
  const amp = one.find(isAmp);
  if (!amp) return [...one, { ...makeAmp(), namModelId: modelId }];
  return one.map((block) =>
    block === amp ? { ...block, namModelId: modelId } : block,
  );
}
