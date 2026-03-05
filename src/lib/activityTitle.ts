const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  pa: 'Play Along',
  nh: 'Note Hold',
};

const TOKEN_LABELS: Record<string, string> = {
  asc: 'Ascend',
  desc: 'Descend',
  lesson: 'Lesson',
  overview: 'Overview',
  contour: 'Contour',
  chords: 'Chords',
  chord: 'Chord',
  arpeggiate: 'Arpeggiate',
  loading: 'Loading',
};

const toTitleWord = (token: string) => {
  const lower = token.toLowerCase();
  if (TOKEN_LABELS[lower]) return TOKEN_LABELS[lower];
  if (/^\d+$/.test(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export const formatActivityTitle = (activityDefId?: string | null): string => {
  if (!activityDefId) return 'Continue lesson';

  const tokens = activityDefId.trim().toLowerCase().split('-').filter(Boolean);

  if (tokens.length === 0) return 'Continue lesson';

  const maybeType = tokens[tokens.length - 1];
  const typeLabel = ACTIVITY_TYPE_LABELS[maybeType];
  const baseTokens = typeLabel ? tokens.slice(0, -1) : tokens;
  const baseLabel = baseTokens.map(toTitleWord).join(' ');

  if (typeLabel && baseLabel) {
    return `${baseLabel} • ${typeLabel}`;
  }
  if (typeLabel) {
    return typeLabel;
  }
  return baseLabel || 'Continue lesson';
};
