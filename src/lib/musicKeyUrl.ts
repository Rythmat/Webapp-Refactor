const normalizeAccidental = (value: string) =>
  value.replace('♭', 'b').replace('♯', '#').toLowerCase();

export const keyLabelToUrlParam = (label: string): string => {
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
