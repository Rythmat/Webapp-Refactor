/**
 * The names a song section may carry. Between them they cover the form of
 * almost every popular song; a section that is only played, not sung, keeps
 * its name and is marked `instrumental`, or says so in its label
 * ("Instrumental Verse"). A label may name the passes it covers ("Verse 1 &
 * 2"), as a chart writes it (owner, 2026-11-15). Rehearsal letters
 * ("Section J") are never used.
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

/** One pass or several: '2', '1 & 2', '4, 5 and 6'. */
const PASSES = String.raw`\d+(?:\s*(?:&|,|and)\s*\d+)*`;

const LABEL = new RegExp(
  `^(Instrumental )?(${SECTION_NAMES.join('|')})(?: (${PASSES}))?$`,
);

export interface SectionLabel {
  name: SectionName;
  /** Its first pass's number: 'Verse 1 & 2' is 1. */
  number: number | null;
  /** Every pass it names: 'Verse 1 & 2' is [1, 2]. */
  numbers: number[];
  /** The label says it is played without vocals: 'Instrumental Verse'. */
  instrumental: boolean;
}

/**
 * 'Verse 2' → { name: 'Verse', number: 2 }; 'Verse 1 & 2' names passes 1
 * and 2; 'Instrumental Chorus' is a chorus said to be instrumental. Null
 * for anything else.
 */
export function parseSectionLabel(label: string): SectionLabel | null {
  const match = label.match(LABEL);
  if (!match) return null;
  const numbers = match[3] ? (match[3].match(/\d+/g) ?? []).map(Number) : [];
  return {
    name: match[2] as SectionName,
    number: numbers[0] ?? null,
    numbers,
    instrumental: !!match[1],
  };
}

export const isSectionLabel = (label: string): boolean =>
  parseSectionLabel(label) !== null;
