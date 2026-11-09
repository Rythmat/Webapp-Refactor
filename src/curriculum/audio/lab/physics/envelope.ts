// ── A note's shape over time ───────────────────────────────────────────────
// Attack, decay and release are times, in seconds. Sustain is a level, 0..1.
// Straight lines, as LabAudio ramps them, so the curve is what's heard.

export interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/** The fastest changes that don't click. */
export const MIN_ATTACK = 0.005;
export const MIN_RELEASE = 0.015;

export const safeEnvelope = (env: Envelope): Envelope => ({
  attack: Math.max(MIN_ATTACK, env.attack),
  decay: Math.max(0, env.decay),
  sustain: Math.min(1, Math.max(0, env.sustain)),
  release: Math.max(MIN_RELEASE, env.release),
});

/** The level while the note is held, `t` seconds in. */
function heldLevel(t: number, env: Envelope): number {
  if (t <= 0) return 0;
  if (t < env.attack) return t / env.attack;
  if (env.decay > 0 && t < env.attack + env.decay) {
    return 1 - ((1 - env.sustain) * (t - env.attack)) / env.decay;
  }
  return env.sustain;
}

/** The level `t` seconds in, for a note let go after `hold` seconds. */
export function envelopeLevel(
  t: number,
  env: Envelope,
  hold = Infinity,
): number {
  if (t < hold) return heldLevel(t, env);
  const left = 1 - (t - hold) / env.release;
  return left <= 0 ? 0 : heldLevel(hold, env) * left;
}

export interface NamedEnvelope {
  id: 'pluck' | 'held' | 'swell' | 'accent';
  name: string;
  like: string;
  envelope: Envelope;
}

export const SHAPES: readonly NamedEnvelope[] = [
  {
    id: 'pluck',
    name: 'Pluck',
    like: 'a plucked string',
    envelope: { attack: 0.005, decay: 0.7, sustain: 0, release: 0.05 },
  },
  {
    id: 'held',
    name: 'Held',
    like: 'an organ',
    envelope: { attack: 0.01, decay: 0, sustain: 1, release: 0.03 },
  },
  {
    id: 'swell',
    name: 'Swell',
    like: 'slow bowing',
    envelope: { attack: 0.9, decay: 0, sustain: 1, release: 0.5 },
  },
  {
    id: 'accent',
    name: 'Accent',
    like: 'a punchy horn',
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.15 },
  },
];

export const shapeNamed = (id: NamedEnvelope['id']) =>
  SHAPES.find((shape) => shape.id === id) ?? SHAPES[0];

/** How long the labs hold a note played by a tap, in seconds. */
export const TAP_HOLD = 1.2;
