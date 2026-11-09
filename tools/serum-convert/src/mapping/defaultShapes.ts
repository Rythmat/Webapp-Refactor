import type { PresetDataOut } from '../oracleTypes.ts';

// ── Serum's Default Shapes, one wavetable per shape (owner, 2026-10-22) ────
//
// Default Shapes is Serum's nine-frame table of basic shapes. The pack
// offers each frame as its own one-frame table instead ('S2/Shape saw'),
// where Position is the start phase. A preset on Default Shapes takes the
// shape nearest its position, from phase 0: one between two shapes, or
// whose macro swept through them, plays the nearer shape (owner's choice:
// split everything).

export const DEFAULT_SHAPES_TABLE = 'S2/Default Shapes';

/** The frames in order, as their tables are named ('S2/Shape Saw'). */
export const DEFAULT_SHAPE_NAMES = [
  'Saw',
  'Sine',
  'Triangle',
  'Square saw',
  'Square',
  'Pulse 25%',
  'Pulse 12%',
  'Pulse 6%',
  'Pulse 3%',
] as const;

export const shapeTableName = (frame: number) =>
  `S2/Shape ${DEFAULT_SHAPE_NAMES[frame]}`;

/** The shape frame nearest a Default Shapes position (0..1). */
export const nearestShape = (position: number) =>
  Math.max(
    0,
    Math.min(
      DEFAULT_SHAPE_NAMES.length - 1,
      Math.round(position * (DEFAULT_SHAPE_NAMES.length - 1)),
    ),
  );

/**
 * Moves a preset's oscillators off Default Shapes onto the nearest shape's
 * own table, at phase 0. Returns the shape frames it uses.
 */
export function splitDefaultShapes(preset: PresetDataOut): number[] {
  const used: number[] = [];
  for (const osc of preset.oscillators) {
    if (osc.wavetable !== DEFAULT_SHAPES_TABLE) continue;
    const frame = nearestShape(osc.wtPosition);
    osc.wavetable = shapeTableName(frame);
    osc.wtPosition = 0;
    used.push(frame);
  }
  return used;
}
