/**
 * How chord symbols are written:
 * - `hybrid`: the app's default hybrid numbering, e.g. "2 min7", "5 dom7", "♭7 maj".
 * - `jazz`: letter roots with jazz symbols, e.g. "D−7", "G7", "CΔ7", "Bø7".
 * - `roman`: Roman numerals, case for quality plus symbols, e.g. "ii7", "V7", "IΔ7".
 */
export type ChordNotation = 'hybrid' | 'jazz' | 'roman';

export const CHORD_NOTATIONS: readonly ChordNotation[] = [
  'hybrid',
  'jazz',
  'roman',
];

export const CHORD_NOTATION_OPTIONS: { value: ChordNotation; label: string }[] =
  [
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'roman', label: 'Roman' },
  ];
