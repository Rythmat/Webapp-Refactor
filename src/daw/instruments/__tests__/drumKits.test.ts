import { describe, expect, it } from 'vitest';
import { DRUM_KIT_CONFIGS, DRUM_KITS, DRUM_PADS } from '../drumKits';

const PAD_NOTES = DRUM_PADS.map((p) => p.note);

describe('drum kit config integrity', () => {
  it('has unique kit ids including natural, 808, and house', () => {
    const ids = DRUM_KIT_CONFIGS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['natural', '808', 'house']));
  });

  it('every kit maps exactly the 11 pad notes to non-empty filenames', () => {
    expect(PAD_NOTES).toHaveLength(11);
    for (const kit of DRUM_KIT_CONFIGS) {
      const sampleNotes = Object.keys(kit.samples).map(Number).sort();
      expect(sampleNotes, kit.id).toEqual([...PAD_NOTES].sort());
      for (const filename of Object.values(kit.samples)) {
        expect(filename, kit.id).toBeTruthy();
      }
    }
  });

  it('kit asset URLs are well-formed', () => {
    for (const kit of DRUM_KIT_CONFIGS) {
      expect(kit.baseUrl, kit.id).toMatch(/^\/daw-assets\/.*\/$/);
      expect(kit.ext, kit.id).toMatch(/^\.\w+$/);
      expect(kit.label, kit.id).toBeTruthy();
    }
  });

  it('defaultPan only targets pad notes with values within [-1, 1]', () => {
    for (const kit of DRUM_KIT_CONFIGS) {
      for (const [noteStr, pan] of Object.entries(kit.defaultPan ?? {})) {
        expect(PAD_NOTES, kit.id).toContain(Number(noteStr));
        expect(pan, kit.id).toBeGreaterThanOrEqual(-1);
        expect(pan, kit.id).toBeLessThanOrEqual(1);
      }
    }
  });

  it('DRUM_KITS mirrors the configs for the dropdown', () => {
    expect(DRUM_KITS).toEqual(
      DRUM_KIT_CONFIGS.map((c) => ({ id: c.id, label: c.label })),
    );
  });
});
