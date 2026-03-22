import { KEY_OF_COLORS } from '@/constants/theme';
import type { PrismModeSlug } from '@/hooks/data';

type ModeColorShiftMap = Partial<Record<PrismModeSlug | 'lorcian', number>>;

const CIRCLE_OF_FIFTHS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
] as const;

const MODE_COLOR_SHIFT: ModeColorShiftMap = {
  ionian: 0,
  lydian: 1,
  mixolydian: 11,
  dorian: 10,
  aeolian: 9,
  phrygian: 8,
  locrian: 7,
  lorcian: 7,
};

/**
 * Fixed HEX colors for non-diatonic scale families.
 * Derived from KEY_COLORS indices 13-16 in keyColors.ts.
 */
const FAMILY_COLORS = {
  harmonicMinor: '#AF4B64', // [175, 75, 100] deep rose
  melodicMinor: '#CDA555', // [205, 165, 85] warm amber
  harmonicMajor: '#7391C3', // [115, 145, 195] steel blue
  doubleHarmonic: '#50A082', // [80, 160, 130] sage emerald
} as const;

/** Normalize Unicode music symbols to ASCII for reliable lookup. */
const normalizeModeSlug = (slug: string): string =>
  slug
    .toLowerCase()
    .replace(/\u{1D12B}/gu, 'bb') // 𝄫 double flat → bb
    .replace(/\u266d/g, 'b') // ♭ flat → b
    .replace(/\u266f/g, '#') // ♯ sharp → #
    .replace(/\u266e/g, 'nat'); // ♮ natural → nat

/**
 * Direct mapping from every non-diatonic mode slug → hex color.
 * All keys are ASCII-normalized (no Unicode symbols).
 * Incoming slugs are normalized via normalizeModeSlug() before lookup.
 */
const MODE_SLUG_TO_COLOR: Record<string, string> = {
  // Harmonic Minor family — #AF4B64
  harmonicminor: FAMILY_COLORS.harmonicMinor,
  locriannat6: FAMILY_COLORS.harmonicMinor,
  'ionian#5': FAMILY_COLORS.harmonicMinor,
  'dorian#4': FAMILY_COLORS.harmonicMinor,
  phrygiandominant: FAMILY_COLORS.harmonicMinor,
  'lydian#2': FAMILY_COLORS.harmonicMinor,
  altereddiminished: FAMILY_COLORS.harmonicMinor,
  // Melodic Minor family — #CDA555
  melodicminor: FAMILY_COLORS.melodicMinor,
  dorianb2: FAMILY_COLORS.melodicMinor,
  lydianaugmented: FAMILY_COLORS.melodicMinor,
  lydiandominant: FAMILY_COLORS.melodicMinor,
  mixolydiannat6: FAMILY_COLORS.melodicMinor,
  mixolydianb6: FAMILY_COLORS.melodicMinor,
  locriannat2: FAMILY_COLORS.melodicMinor,
  altereddominant: FAMILY_COLORS.melodicMinor,
  altered: FAMILY_COLORS.melodicMinor,
  // Harmonic Major family — #7391C3
  harmonicmajor: FAMILY_COLORS.harmonicMajor,
  dorianb5: FAMILY_COLORS.harmonicMajor,
  altereddominantnat5: FAMILY_COLORS.harmonicMajor,
  'melodicminor#4': FAMILY_COLORS.harmonicMajor,
  mixolydianb2: FAMILY_COLORS.harmonicMajor,
  'lydianaugmented#2': FAMILY_COLORS.harmonicMajor,
  locrianbb7: FAMILY_COLORS.harmonicMajor,
  // Double Harmonic family — #50A082
  doubleharmonicmajor: FAMILY_COLORS.doubleHarmonic,
  'lydian#2#6': FAMILY_COLORS.doubleHarmonic,
  ultraphrygian: FAMILY_COLORS.doubleHarmonic,
  doubleharmonicminor: FAMILY_COLORS.doubleHarmonic,
  oriental: FAMILY_COLORS.doubleHarmonic,
  'ionian#2#5': FAMILY_COLORS.doubleHarmonic,
  locrianbb3bb7: FAMILY_COLORS.doubleHarmonic,
};

const ENHARMONIC_TO_CIRCLE_KEY: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'G#': 'Ab',
  'A#': 'Bb',
};

const normalizeKeyForCircle = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return 'C';
  const normalized = trimmed.replace('♯', '#').replace('♭', 'b');
  const letter = normalized[0].toUpperCase();
  const accidental = normalized.slice(1);
  const canonical = `${letter}${accidental}`;
  return ENHARMONIC_TO_CIRCLE_KEY[canonical] ?? canonical;
};

const resolveModeColorShift = (mode?: PrismModeSlug): number => {
  if (!mode) return 0;
  const normalized = mode.toLowerCase();
  return MODE_COLOR_SHIFT[normalized as PrismModeSlug] ?? 0;
};

export const colorForKeyMode = (
  rootKey: string,
  mode?: PrismModeSlug,
): string => {
  // Non-diatonic modes: normalize slug to ASCII, then direct lookup
  if (mode) {
    const normalized = normalizeModeSlug(mode);
    const direct = MODE_SLUG_TO_COLOR[normalized];
    if (direct) return direct;
  }

  // Diatonic modes: use circle-of-fifths rotation
  const normalizedKey = normalizeKeyForCircle(rootKey);
  const keyIndex = CIRCLE_OF_FIFTHS.findIndex((key) => key === normalizedKey);
  const baseIndex = keyIndex >= 0 ? keyIndex : 0;
  const shift = resolveModeColorShift(mode);
  const circleIndex = (baseIndex + shift + 12) % 12;
  const shiftedKeyLabel = CIRCLE_OF_FIFTHS[circleIndex];
  return KEY_OF_COLORS[shiftedKeyLabel] ?? KEY_OF_COLORS.C;
};
