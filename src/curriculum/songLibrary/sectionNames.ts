/**
 * The names a song section may carry. Between them they cover the form of
 * almost every popular song; a section that is only played, not sung, keeps
 * its name and is marked `instrumental`. Rehearsal letters ("Section J") are
 * never used.
 */
export const SECTION_NAMES = [
  'Intro',
  'Verse',
  'Pre-Chorus',
  'Chorus',
  'Bridge',
  'Interlude',
  'Tag',
  'Outro',
] as const;

export type SectionName = (typeof SECTION_NAMES)[number];

const LABEL = new RegExp(`^(${SECTION_NAMES.join('|')})(?: (\\d+))?$`);

/** 'Verse 2' → { name: 'Verse', number: 2 }; null for anything else. */
export function parseSectionLabel(
  label: string,
): { name: SectionName; number: number | null } | null {
  const match = label.match(LABEL);
  if (!match) return null;
  return {
    name: match[1] as SectionName,
    number: match[2] ? Number(match[2]) : null,
  };
}

export const isSectionLabel = (label: string): boolean =>
  parseSectionLabel(label) !== null;
