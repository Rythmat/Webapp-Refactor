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
  const normalizedKey = normalizeKeyForCircle(rootKey);
  const keyIndex = CIRCLE_OF_FIFTHS.findIndex((key) => key === normalizedKey);
  const baseIndex = keyIndex >= 0 ? keyIndex : 0;
  const shift = resolveModeColorShift(mode);
  const circleIndex = (baseIndex + shift + 12) % 12;
  const shiftedKeyLabel = CIRCLE_OF_FIFTHS[circleIndex];
  return KEY_OF_COLORS[shiftedKeyLabel] ?? KEY_OF_COLORS.C;
};
