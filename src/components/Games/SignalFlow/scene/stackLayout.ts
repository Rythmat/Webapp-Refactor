import { gearVisual } from '../gear/visuals';
import type { GearInstance } from '../rig/rigTypes';
import type { RigLayout } from './RigScene';

// ── The bench on a phone ───────────────────────────────────────────────────
// A wide bench shrunk to a phone's width makes jacks too small to hit. Instead
// the gear stacks in signal order, as large as the width allows, and scrolls.

const WIDTH = 86;
const GAP = 13;
/** Small gear shouldn't fill the width just because it could. */
const MAX_GROW = 1.25;

export function stackLayout(
  gear: readonly GearInstance[],
  layout: RigLayout,
): RigLayout {
  const inOrder = gear
    .filter((g) => layout[g.id])
    .sort((a, b) => layout[a.id].x - layout[b.id].x);
  const stacked: Record<string, { x: number; y: number; scale: number }> = {};
  let y = 0;
  for (const g of inOrder) {
    const visual = gearVisual(g);
    const width = visual.box.x1 - visual.box.x0;
    const height = visual.box.y1 - visual.box.y0;
    const scale = Math.min(WIDTH / width, visual.scale * MAX_GROW);
    stacked[g.id] = {
      x: -((visual.box.x0 + visual.box.x1) / 2) * scale,
      y: y - visual.box.y0 * scale,
      scale,
    };
    y += height * scale + GAP;
  }
  return stacked;
}
