// ── Shared parameter helpers for the effect modules ────────────────────────

/**
 * The time constant of a gliding parameter change (setTargetAtTime): 10 ms,
 * so a drag's steps settle within about 30 ms without zipper noise.
 */
export const PARAM_GLIDE_S = 0.01;

// A NaN/Infinity written to any node on the shared mastering chain latches it
// (compressor/biquad/convolver/delay) to permanent silence until reload, so
// every derived AudioParam value on a chain is passed through this guard.
export function safeVal(x: number, fallback = 0): number {
  return Number.isFinite(x) ? x : fallback;
}

/** Sets a parameter: at once, or gliding while the update glides. */
export function setParam(
  ctx: BaseAudioContext,
  param: AudioParam,
  value: number,
  glide: boolean,
): void {
  if (glide) {
    param.setTargetAtTime(value, ctx.currentTime, PARAM_GLIDE_S);
  } else {
    param.value = value;
  }
}

/** Disconnects one edge (or all of a node's), ignoring an edge that isn't there. */
export function tryDisconnect(from: AudioNode, to?: AudioNode): void {
  try {
    if (to) from.disconnect(to);
    else from.disconnect();
  } catch {
    /* ok */
  }
}
