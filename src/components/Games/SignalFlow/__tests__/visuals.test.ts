import { describe, expect, it } from 'vitest';
import { gearVisual } from '../gear/visuals';
import { gearDef } from '../rig/gearDefs';
import { ALL_MISSIONS } from '../rig/missions';
import type { GearInstance } from '../rig/rigTypes';

// Every piece of gear any mission uses can be drawn, with a place for each jack.

const everyGear = (): GearInstance[] => {
  const seen = new Map<string, GearInstance>();
  for (const mission of ALL_MISSIONS) {
    for (const gear of Object.values(mission.rig().gear)) {
      seen.set(`${gear.kind}:${gear.channels ?? ''}`, gear);
    }
  }
  return [...seen.values()];
};

describe('gear drawings', () => {
  it.each(
    everyGear().map((g) => [`${g.kind} ${g.channels ?? ''}`, g] as const),
  )('%s has a drawing and a spot for every jack it needs', (_name, gear) => {
    const visual = gearVisual(gear);
    expect(visual.parts.length).toBeGreaterThan(0);
    expect(Number.isFinite(visual.box.x0)).toBe(true);
    for (const port of gearDef(gear).ports) {
      expect(visual.ports[port.id], port.id).toBeDefined();
      const { at } = visual.ports[port.id];
      expect(Number.isFinite(at[0]) && Number.isFinite(at[1]), port.id).toBe(
        true,
      );
    }
  });

  it('hides the cables on instruments that have their own, so the student plugs them', () => {
    const mic = gearVisual({ kind: 'dynamicMic' });
    expect(mic.parts.map((p) => p.id)).not.toContain('cable');
    const phones = gearVisual({ kind: 'headphones' });
    expect(phones.parts.map((p) => p.id)).not.toContain('plug');
  });
});
