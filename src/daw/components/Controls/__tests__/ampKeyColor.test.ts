import { describe, expect, it } from 'vitest';
import { KEY_COLORS } from '@/daw/prism-engine/data/keyColors';
import { keyCentreColor } from '../GuitarBassView';

// ── An Audio track's amps wear the key centre's colour (owner, 2026-10-22) ──
// The Insight panel's key colour (KEY_COLORS by the tonic); no key, none.
// Run: npx vitest run src/daw/components/Controls/__tests__/ampKeyColor.test.ts

describe('the key centre’s colour', () => {
  it('is the tonic’s key colour, as Insight draws the key', () => {
    const [r, g, b] = KEY_COLORS[1]; // C
    expect(keyCentreColor(0)).toBe(`rgb(${r}, ${g}, ${b})`);
    const [gr, gg, gb] = KEY_COLORS[2]; // G
    expect(keyCentreColor(7)).toBe(`rgb(${gr}, ${gg}, ${gb})`);
  });

  it('is none while the song has no key', () => {
    expect(keyCentreColor(null)).toBeNull();
  });

  it('differs from key to key', () => {
    const all = new Set(
      Array.from({ length: 12 }, (_, pc) => keyCentreColor(pc)),
    );
    expect(all.size).toBe(12);
  });
});
