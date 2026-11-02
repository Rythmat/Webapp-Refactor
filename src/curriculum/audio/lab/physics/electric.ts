// ── Electricity, for a sound signal ────────────────────────────────────────
// Ohm's law, Faraday's law and why a pickup's place changes its tone. Simple
// enough to teach from and kept honest about it: each picture says where it
// simplifies, and the voltages from a moving coil are a model's, not a real mic's.

/** Ohm's law: current in amps, from volts and ohms. */
export const currentAmps = (volts: number, ohms: number) => volts / ohms;

/** How much of the magnet's field runs through the coil, 0..1, with the magnet
 *  at `x` (0..1) along its travel and the coil in the middle. */
export const fluxAt = (x: number) => Math.exp(-(((x - 0.5) / 0.2) ** 2));

/** How steeply the field through the coil changes with the magnet's place. */
const fluxSlope = (x: number) => (-2 * (x - 0.5) * fluxAt(x)) / 0.04;

/**
 * Faraday's law: the voltage a coil makes is its turns times how fast the field
 * through it is changing, so with no movement there is none. In arbitrary units,
 * for a meter to show; `velocity` is in travels a second.
 */
export const inducedVoltage = (turns: number, x: number, velocity: number) =>
  -turns * fluxSlope(x) * velocity;

/** The model's peak voltage: double the turns or the speed, double the voltage. */
export const peakMillivolts = (turns: number, swings: number) =>
  turns * swings * 0.1;

/**
 * A magnetic pickup's recipe for a string. Each harmonic falls off as 1/n, and a
 * pickup at `place` along the string (0 at the bridge) hears each only as far as
 * that harmonic moves there. Near the bridge, the low harmonics barely move, so
 * the balance tips bright. Scaled to a strongest harmonic of 1.
 */
export function pickupRecipe(place: number, count = 12): number[] {
  const raw = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return Math.abs(Math.sin(n * Math.PI * place)) / n;
  });
  const most = Math.max(...raw);
  return raw.map((amount) => amount / most);
}

export const PICKUPS = [
  { id: 'neck', name: 'Neck', place: 0.3 },
  { id: 'middle', name: 'Middle', place: 0.18 },
  { id: 'bridge', name: 'Bridge', place: 0.07 },
] as const;
export type PickupId = (typeof PICKUPS)[number]['id'];

export const pickupNamed = (id: PickupId) =>
  PICKUPS.find((pickup) => pickup.id === id) ?? PICKUPS[0];

/** How high a recipe's harmonics sit on average, its brightness in harmonics. */
export const brightness = (recipe: readonly number[]) => {
  const total = recipe.reduce((sum, amount) => sum + amount, 0);
  return (
    recipe.reduce((sum, amount, i) => sum + amount * (i + 1), 0) / (total || 1)
  );
};
