/**
 * Phase 8 — Harmony Bridge.
 * Maps HKB chord quality names ("Major 7") to engine chord IDs ("major7").
 */

/** HKB quality name → engine chord ID */
const HKB_TO_ENGINE_QUALITY: Record<string, string> = {
  Major: 'major',
  Minor: 'minor',
  Diminished: 'diminished',
  Augmented: 'augmented',
  'Major 7': 'major7',
  'Dominant 7': 'dominant7',
  'Minor 7': 'minor7',
  'Minor 7(b5)': 'minor7b5',
  'Diminished 7': 'diminished7',
  'Major 7(#5)': 'major7#5',
  'Minor Major 7': 'minormajor7',
};

export function hkbQualityToEngine(hkbQuality: string): string | undefined {
  return HKB_TO_ENGINE_QUALITY[hkbQuality];
}

export function engineQualityToHkb(engineQuality: string): string | undefined {
  for (const [hkb, engine] of Object.entries(HKB_TO_ENGINE_QUALITY)) {
    if (engine === engineQuality) return hkb;
  }
  return undefined;
}
