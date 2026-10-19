// ── The drum kit as a drummer sees it (milestone 2.9) ──────────────────────
//
// Where each of the kit's eleven pads sits in the drums' Instrument tab: a
// top-down kit, as Soundtrap draws it (the owner's reference, 2026-10-16),
// with the drummer at the bottom. The kick is the big drum in the middle,
// the snare to its left with the hi-hat beyond it, the two rack toms above,
// the floor tom to the right, the crash up left and the ride out right.
// Three pads are badges on another pad's rim, as their sounds are played
// on that drum: the sidestick (or clap) on the snare, the open and pedal
// hats on the hi-hat. Units are a 1000 × 420 box, scaled to fit the dock.
// Pure: tests and the harness read it.

export const KIT_WIDTH = 1000;
export const KIT_HEIGHT = 420;

export interface KitDrum {
  /** The pad's MIDI note (DRUM_PADS). */
  note: number;
  /** A drum has one ring, a cymbal two. */
  kind: 'drum' | 'cymbal';
  cx: number;
  cy: number;
  r: number;
}

export interface KitBadge {
  note: number;
  /** The pad whose rim it sits on. */
  on: number;
  /** Where on the rim, in degrees clockwise from 3 o'clock. */
  angle: number;
}

/** In paint order: a later drum is drawn over an earlier one. */
export const KIT_DRUMS: readonly KitDrum[] = [
  { note: 36, kind: 'drum', cx: 480, cy: 300, r: 120 }, // kick
  { note: 41, kind: 'drum', cx: 695, cy: 255, r: 95 }, // floor tom
  { note: 38, kind: 'drum', cx: 295, cy: 262, r: 88 }, // snare
  { note: 48, kind: 'drum', cx: 405, cy: 112, r: 76 }, // rack tom 1
  { note: 45, kind: 'drum', cx: 570, cy: 108, r: 80 }, // rack tom 2
  { note: 42, kind: 'cymbal', cx: 130, cy: 222, r: 84 }, // closed hi-hat
  { note: 49, kind: 'cymbal', cx: 240, cy: 88, r: 76 }, // crash
  { note: 51, kind: 'cymbal', cx: 885, cy: 215, r: 70 }, // ride
];

export const KIT_BADGES: readonly KitBadge[] = [
  { note: 40, on: 38, angle: 55 }, // sidestick (a clap on electronic kits)
  { note: 46, on: 42, angle: 180 }, // open hi-hat
  { note: 44, on: 42, angle: 100 }, // pedal hi-hat
];

/** Where a badge sits: the point on its pad's rim. */
export function badgePoint(badge: KitBadge): { x: number; y: number } {
  const drum = KIT_DRUMS.find((d) => d.note === badge.on);
  if (!drum) return { x: 0, y: 0 };
  const a = (badge.angle * Math.PI) / 180;
  return {
    x: drum.cx + drum.r * Math.cos(a),
    y: drum.cy + drum.r * Math.sin(a),
  };
}
