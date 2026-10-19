// ── The crush / saturator waveshaper curve ──────────────────────────────────
// A normalised tanh: drive = 1 + amount × 20, curve(x) = tanh(drive·x) /
// tanh(drive). One curve per percent, cached and shared by every chain.

const crushCurveCache = new Map<number, Float32Array>();

/** The curve a crush or drive amount (0–1) takes: one per percent. */
export function crushKey(crush: number): number {
  return Math.round(crush * 100);
}

export function generateCrushCurve(crush: number): Float32Array {
  const quantized = crushKey(crush);
  let curve = crushCurveCache.get(quantized);
  if (curve) return curve;

  const samples = 4096;
  curve = new Float32Array(samples);
  const drive = 1 + crush * 20;
  const norm = Math.tanh(drive);

  for (let i = 0; i < samples; i++) {
    const x = (2 * i) / (samples - 1) - 1; // -1 to 1
    curve[i] = Math.tanh(drive * x) / norm;
  }

  crushCurveCache.set(quantized, curve);
  return curve;
}
