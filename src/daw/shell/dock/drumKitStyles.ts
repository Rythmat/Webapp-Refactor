// ── The drum kits by style (owner, 2026-10-23) ─────────────────────────────
//
// The drum Instrument dock's menu is two columns, as every instrument's is:
// the styles, then the kits of the style picked (the grooves that were its
// second column moved into the prompt box's generation). A kit added in the
// console that no style names yet is listed under More, so none goes
// missing.

export interface DrumKitStyle {
  id: string;
  label: string;
  /** Kit ids (drumKits.ts DRUM_KITS), in the order the column lists them. */
  kits: readonly string[];
}

export const DRUM_KIT_STYLES: readonly DrumKitStyle[] = [
  {
    id: 'pop-rock',
    label: 'Pop & Rock',
    kits: ['natural', 'custom_custom_natural_01', 'custom_natural_2'],
  },
  { id: 'hip-hop', label: 'Hip Hop & Trap', kits: ['808'] },
  { id: 'electronic', label: 'Electronic', kits: ['house'] },
  {
    id: 'funk-soul',
    label: 'Funk & Soul',
    kits: ['boogaloo_kit', 'go_go_kit'],
  },
  {
    id: 'latin',
    label: 'Latin',
    kits: [
      'custom_808_01',
      'latin_percussion_kit',
      'latin_rock_kit',
      'salsa_kit',
    ],
  },
  {
    id: 'jazz',
    label: 'Jazz',
    kits: [
      'custom_natural_01',
      'jazz_ballad_kit',
      'jazzy_custom_natural',
      'poinciana_kit',
    ],
  },
];

const MORE = 'more';

/**
 * The styles with the kits that exist, a More style for kits none names,
 * and styles left with no kit dropped.
 */
export function kitStyles(
  kits: readonly { id: string; label: string }[],
): DrumKitStyle[] {
  const known = new Set(kits.map((k) => k.id));
  const named = new Set(DRUM_KIT_STYLES.flatMap((s) => s.kits));
  const styles = DRUM_KIT_STYLES.map((s) => ({
    ...s,
    kits: s.kits.filter((id) => known.has(id)),
  }));
  const more = kits.filter((k) => !named.has(k.id)).map((k) => k.id);
  if (more.length) styles.push({ id: MORE, label: 'More', kits: more });
  return styles.filter((s) => s.kits.length > 0);
}

/** The style a kit is listed under; the first style for one none lists. */
export function styleOfKit(
  styles: readonly DrumKitStyle[],
  kitId: string,
): DrumKitStyle | undefined {
  return styles.find((s) => s.kits.includes(kitId)) ?? styles[0];
}
