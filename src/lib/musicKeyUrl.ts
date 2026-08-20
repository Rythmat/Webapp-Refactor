const normalizeAccidental = (value: string) =>
  value.replace('♭', 'b').replace('♯', '#').toLowerCase();

export const keyLabelToUrlParam = (label: string): string => {
  if (!label) return 'c';
  const raw = label.trim();
  const letter = raw[0]?.toLowerCase();
  const accidental = normalizeAccidental(raw.slice(1));

  if (!letter || !'abcdefg'.includes(letter)) {
    return 'c';
  }

  if (accidental === '#' || accidental === 'sharp') {
    return `${letter}sharp`;
  }

  if (accidental === 'b' || accidental === 'flat') {
    return `${letter}flat`;
  }

  return letter;
};

export const urlParamToKeyLabel = (value?: string): string => {
  const raw = (value ?? '').trim();
  if (!raw) return 'C';

  const normalized = normalizeAccidental(raw);
  const letter = normalized[0];
  if (!letter || !'abcdefg'.includes(letter)) {
    return 'C';
  }

  const accidental = normalized.slice(1);
  if (accidental === 'sharp' || accidental === '#') {
    return `${letter.toUpperCase()}♯`;
  }
  if (accidental === 'flat' || accidental === 'b') {
    return `${letter.toUpperCase()}♭`;
  }

  return letter.toUpperCase();
};

/** Semitone offset from C (0-11) for every key label `urlParamToKeyLabel` can produce. */
const KEY_SEMITONES: Record<string, number> = {
  C: 0,
  'C♯': 1,
  'D♭': 1,
  D: 2,
  'D♯': 3,
  'E♭': 3,
  E: 4,
  'F♭': 4,
  'E♯': 5,
  F: 5,
  'F♯': 6,
  'G♭': 6,
  G: 7,
  'G♯': 8,
  'A♭': 8,
  A: 9,
  'A♯': 10,
  'B♭': 10,
  B: 11,
  'C♭': 11,
  'B♯': 0,
};

/** Semitone offset from C (0-11) for a key label as returned by `urlParamToKeyLabel`. */
export const keyLabelToSemitone = (label: string): number =>
  KEY_SEMITONES[label] ?? 0;

/** Decode a `keyLabelToUrlParam`-encoded URL param straight to a 0-11 semitone offset from C. */
export const urlParamToSemitone = (value?: string): number =>
  keyLabelToSemitone(urlParamToKeyLabel(value));
