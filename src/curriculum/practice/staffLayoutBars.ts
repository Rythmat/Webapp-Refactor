import type { MeasureBox, StaffLayout } from '@/components/notation/StaffView';

// ── Bars on a drawn staff ──────────────────────────────────────────────────
// Overlays work in the step's own bars (0 = its first bar), while the drawing
// in time starts with a count-in bar. These map one onto the other through
// the measure boxes StaffView and TabStaffView report.

export interface BarBox {
  /** The step's bar, 0-based. */
  bar: number;
  box: MeasureBox;
}

/** The top staff's measures: TAB has one part, a grand staff two. */
function topMeasures(layout: StaffLayout): MeasureBox[] {
  const topPart = Math.min(...layout.measures.map((m) => m.partIndex));
  return layout.measures.filter((m) => m.partIndex === topPart);
}

/** The step's bars as drawn, in order; count-in and padding bars left out. */
export function stepBarBoxes(
  layout: StaffLayout,
  bars: number,
  countInOffset: number,
  ticksPerBar: number,
): BarBox[] {
  return topMeasures(layout)
    .filter((box) => box.startTick >= countInOffset)
    .map((box) => ({
      bar: Math.floor((box.startTick - countInOffset) / ticksPerBar),
      box,
    }))
    .filter(({ bar }) => bar < bars)
    .sort((a, b) => a.bar - b.bar);
}

/** The top-staff measure a drawing tick falls in. */
export function measureAt(
  layout: StaffLayout,
  tick: number,
): MeasureBox | undefined {
  return topMeasures(layout).find(
    (m) => tick >= m.startTick && tick < m.endTick,
  );
}

/**
 * Where a tick sits across its measure: the leftmost note drawn there, since
 * notation spacing isn't linear in time; proportionally where none is.
 */
export function tickX(layout: StaffLayout, box: MeasureBox, tick: number) {
  const anchors = layout.notes.filter(
    (n) => n.partIndex === box.partIndex && n.tick === tick,
  );
  if (anchors.length) return Math.min(...anchors.map((n) => n.x));
  const span = box.endTick - box.startTick || 1;
  return box.x + ((tick - box.startTick) / span) * box.width;
}

/** The drawing's height: every system, each systemHeight tall. */
export function drawingHeight(layout: StaffLayout): number {
  const systems = Math.max(0, ...layout.measures.map((m) => m.system)) + 1;
  return systems * layout.systemHeight;
}
