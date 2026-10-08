// ── Pitch Correction "Smooth" ───────────────────────────────────────────────
// The worklet's `speed` param is how fast correction snaps: 100 is instant
// (the robotic hard-tune) and 0 is its slowest, a 400 ms glide
// (pitch-correction-processor.js: retune = (1 - speed / 100) × 0.4 s). The
// control is labelled Smooth, so it shows that scale reversed: turning Smooth
// up lengthens the retune and sounds more natural. The saved param stays
// `speed`, so saved chains sound exactly as before (live-input-10).

/** The retune time at Smooth 100%, the worklet's slowest. */
export const MAX_RETUNE_MS = 400;

/** Smooth (0–100) for a saved `speed` (0–100). */
export function smoothFromSpeed(speed: number): number {
  return 100 - speed;
}

/** The `speed` to save for a Smooth setting (0–100). */
export function speedFromSmooth(smooth: number): number {
  return 100 - smooth;
}

/** How long the correction takes to reach the target note at this Smooth. */
export function retuneMs(smooth: number): number {
  return (smooth / 100) * MAX_RETUNE_MS;
}
