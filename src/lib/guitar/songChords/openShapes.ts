// ── Song chords: open chords ───────────────────────────────────────────────
// The open chords guitarists learn first, as frets and fingers (string 6
// first; fingers 0 = open). Hand-checked; songChords tests prove each one is
// its chord and passes the gate. Rows marked `common: false` are well known
// but not the usual first choice: they are kept for the owner to switch on.

import type { SongChordQuality } from './quality';

export interface OpenShapeRow {
  root: string;
  quality: SongChordQuality;
  /** The slash bass, for OPEN_SLASH_SHAPES. */
  bass?: string;
  frets: string;
  fingers: string;
  common: boolean;
}

const row = (
  root: string,
  quality: SongChordQuality,
  frets: string,
  fingers: string,
  common = true,
): OpenShapeRow => ({ root, quality, frets, fingers, common });

export const OPEN_SHAPES: readonly OpenShapeRow[] = [
  // Major (Book One's C, A, G, E, D and its F)
  row('C', 'maj', 'X-3-2-0-1-0', 'X-3-2-0-1-0'),
  row('A', 'maj', 'X-0-2-2-2-0', 'X-0-1-2-3-0'),
  row('G', 'maj', '3-2-0-0-0-3', '2-1-0-0-0-3'),
  row('E', 'maj', '0-2-2-1-0-0', '0-2-3-1-0-0'),
  row('D', 'maj', 'X-X-0-2-3-2', 'X-X-0-1-3-2'),
  row('F', 'maj', 'X-X-3-2-1-1', 'X-X-3-2-1-1'),
  // Minor
  row('A', 'min', 'X-0-2-2-1-0', 'X-0-2-3-1-0'),
  row('E', 'min', '0-2-2-0-0-0', '0-1-2-0-0-0'),
  row('D', 'min', 'X-X-0-2-3-1', 'X-X-0-2-3-1'),
  // Dominant 7
  row('E', 'dom7', '0-2-0-1-0-0', '0-2-0-1-0-0'),
  row('A', 'dom7', 'X-0-2-0-2-0', 'X-0-2-0-3-0'),
  row('D', 'dom7', 'X-X-0-2-1-2', 'X-X-0-2-1-3'),
  row('G', 'dom7', '3-2-0-0-0-1', '3-2-0-0-0-1'),
  row('C', 'dom7', 'X-3-2-3-1-0', 'X-3-2-4-1-0'),
  row('B', 'dom7', 'X-2-1-2-0-2', 'X-2-1-3-0-4'),
  // Minor 7
  row('A', 'min7', 'X-0-2-0-1-0', 'X-0-2-0-1-0'),
  row('E', 'min7', '0-2-0-0-0-0', '0-2-0-0-0-0'),
  row('D', 'min7', 'X-X-0-2-1-1', 'X-X-0-2-1-1'),
  row('B', 'min7', 'X-2-0-2-0-2', 'X-1-0-2-0-3', false),
  // Major 7
  row('C', 'maj7', 'X-3-2-0-0-0', 'X-3-2-0-0-0'),
  row('F', 'maj7', 'X-X-3-2-1-0', 'X-X-3-2-1-0'),
  row('A', 'maj7', 'X-0-2-1-2-0', 'X-0-2-1-3-0'),
  row('D', 'maj7', 'X-X-0-2-2-2', 'X-X-0-1-2-3'),
  row('E', 'maj7', '0-2-1-1-0-0', '0-3-1-2-0-0', false),
  row('G', 'maj7', '3-2-0-0-0-2', '3-2-0-0-0-1', false),
  // Sus
  row('D', 'sus2', 'X-X-0-2-3-0', 'X-X-0-1-3-0'),
  row('A', 'sus2', 'X-0-2-2-0-0', 'X-0-1-2-0-0'),
  row('G', 'sus2', '3-0-0-0-3-3', '2-0-0-0-3-4', false),
  row('D', 'sus4', 'X-X-0-2-3-3', 'X-X-0-1-3-4'),
  row('A', 'sus4', 'X-0-2-2-3-0', 'X-0-1-2-3-0'),
  row('E', 'sus4', '0-2-2-2-0-0', '0-2-3-4-0-0'),
  row('C', 'sus4', 'X-3-3-0-1-1', 'X-3-4-0-1-1', false),
  // 7sus4
  row('A', 'dom7sus4', 'X-0-2-0-3-0', 'X-0-2-0-3-0'),
  row('D', 'dom7sus4', 'X-X-0-2-1-3', 'X-X-0-2-1-4'),
  row('E', 'dom7sus4', '0-2-0-2-0-0', '0-2-0-3-0-0'),
  row('G', 'dom7sus4', '3-3-0-0-1-1', '3-4-0-0-1-1', false),
  row('C', 'dom7sus4', 'X-3-3-3-1-1', 'X-2-3-4-1-1', false),
  // 6
  row('C', 'maj6', 'X-3-2-2-1-0', 'X-4-2-3-1-0'),
  row('A', 'maj6', 'X-0-2-2-2-2', 'X-0-1-1-1-1'),
  row('D', 'maj6', 'X-X-0-2-0-2', 'X-X-0-2-0-3'),
  row('G', 'maj6', '3-2-0-0-0-0', '3-2-0-0-0-0'),
  row('E', 'maj6', '0-2-2-1-2-0', '0-2-3-1-4-0', false),
  // add9 and 9
  row('C', 'add9', 'X-3-2-0-3-0', 'X-3-2-0-4-0'),
  row('E', 'add9', '0-2-2-1-0-2', '0-2-3-1-0-4', false),
  row('A', 'add9', 'X-0-2-4-2-0', 'X-0-1-4-2-0', false),
  row('E', 'dom9', '0-2-0-1-0-2', '0-2-0-1-0-3'),
  // Power chords
  row('E', 'power', '0-2-2-X-X-X', '0-1-2-X-X-X'),
  row('A', 'power', 'X-0-2-2-X-X', 'X-0-1-2-X-X'),
  row('D', 'power', 'X-X-0-2-3-X', 'X-X-0-1-3-X'),
];

const slash = (
  name: string,
  quality: SongChordQuality,
  frets: string,
  fingers: string,
  common = true,
): OpenShapeRow => {
  const [root, bass] = name.split('/');
  return { root, bass, quality, frets, fingers, common };
};

/** Open slash chords: the chord with its bass note on the lowest string. */
export const OPEN_SLASH_SHAPES: readonly OpenShapeRow[] = [
  slash('G/B', 'maj', 'X-2-0-0-0-3', 'X-1-0-0-0-3'),
  slash('G/D', 'maj', 'X-X-0-0-0-3', 'X-X-0-0-0-3'),
  slash('G/A', 'maj', 'X-0-0-0-0-3', 'X-0-0-0-0-3'),
  slash('C/E', 'maj', '0-3-2-0-1-0', '0-3-2-0-1-0'),
  slash('C/G', 'maj', '3-3-2-0-1-0', '4-3-2-0-1-0'),
  slash('C/B', 'maj', 'X-2-2-0-1-0', 'X-2-3-0-1-0'),
  slash('C/A', 'maj', 'X-0-2-0-1-0', 'X-0-2-0-1-0'),
  slash('D/F♯', 'maj', '2-0-0-2-3-2', '1-0-0-2-4-3'),
  slash('D/A', 'maj', 'X-0-0-2-3-2', 'X-0-0-1-3-2'),
  slash('D/C', 'maj', 'X-3-0-2-3-2', 'X-3-0-1-4-2'),
  slash('D/E', 'maj', '0-0-0-2-3-2', '0-0-0-1-3-2'),
  slash('E/G♯', 'maj', '4-2-2-1-0-0', '4-2-3-1-0-0'),
  slash('E/B', 'maj', 'X-2-2-1-0-0', 'X-2-3-1-0-0'),
  slash('E/D', 'maj', 'X-X-0-1-0-0', 'X-X-0-1-0-0'),
  slash('E/D', 'dom7', 'X-X-0-1-0-0', 'X-X-0-1-0-0'),
  slash('F/A', 'maj', 'X-0-3-2-1-1', 'X-0-3-2-1-1'),
  slash('F/C', 'maj', 'X-3-3-2-1-1', 'X-3-4-2-1-1'),
  slash('A/E', 'maj', '0-0-2-2-2-0', '0-0-1-2-3-0'),
  slash('A/C♯', 'maj', 'X-4-2-2-2-0', 'X-4-1-2-3-0'),
  slash('A/G', 'min', '3-0-2-2-1-0', '4-0-2-3-1-0'),
  slash('A/E', 'min', '0-0-2-2-1-0', '0-0-2-3-1-0'),
  slash('A/G', 'min7', '3-0-2-0-1-0', '3-0-2-0-1-0'),
  slash('D/C', 'min7', 'X-3-0-2-1-1', 'X-3-0-2-1-1'),
  slash('D/A', 'min7', 'X-0-0-2-1-1', 'X-0-0-2-1-1'),
  slash('C/E', 'dom7', '0-3-2-3-1-0', '0-3-2-4-1-0'),
  slash('G/B', 'dom7', 'X-2-0-0-0-1', 'X-2-0-0-0-1'),
  slash('E/G♯', 'dom7', '4-2-0-1-0-0', '4-2-0-1-0-0'),
  slash('E/A', 'min7', 'X-0-2-0-3-0', 'X-0-2-0-3-0'),
  // Less usual first choices.
  slash('G/F', 'maj', '1-2-0-0-0-3', '1-2-0-0-0-4', false),
  slash('G/F', 'dom7', '1-2-0-0-0-3', '1-2-0-0-0-4', false),
  slash('G/C', 'maj', 'X-3-0-0-0-3', 'X-2-0-0-0-3', false),
  slash('G/E', 'maj', '0-2-0-0-0-3', '0-1-0-0-0-3', false),
  slash('C/F', 'maj', 'X-X-3-0-1-0', 'X-X-3-0-1-0', false),
  slash('C/D', 'maj', 'X-X-0-0-1-0', 'X-X-0-0-1-0', false),
  slash('E/A', 'maj', 'X-0-2-1-0-0', 'X-0-2-1-0-0', false),
  slash('F/G', 'maj', '3-X-3-2-1-1', '3-X-4-2-1-1', false),
  slash('A/G', 'maj', '3-0-2-2-2-0', '4-0-1-2-3-0', false),
  slash('A/D', 'maj', 'X-X-0-2-2-0', 'X-X-0-1-2-0', false),
  slash('A/B', 'maj', 'X-2-2-2-2-0', 'X-1-1-1-1-0', false),
  slash('A/G♯', 'min', '4-0-2-2-1-0', '4-0-2-3-1-0', false),
  slash('A/E', 'min7', '0-0-2-0-1-0', '0-0-2-0-1-0', false),
  slash('E/G', 'min', '3-2-2-0-0-0', '3-1-2-0-0-0', false),
  slash('E/B', 'min', 'X-2-2-0-0-0', 'X-2-3-0-0-0', false),
  slash('E/D', 'min7', 'X-X-0-0-0-0', 'X-X-0-0-0-0', false),
  slash('G/D', 'dom7', 'X-X-0-0-0-1', 'X-X-0-0-0-1', false),
  slash('D/C', 'dom7', 'X-3-0-2-1-2', 'X-4-0-2-1-3', false),
  slash('A/G', 'dom7', '3-0-2-0-2-0', '4-0-2-0-3-0', false),
  slash('E/B', 'dom7', 'X-2-0-1-0-0', 'X-2-0-1-0-0', false),
  slash('B/A', 'dom7', 'X-0-1-2-0-2', 'X-0-1-2-0-3', false),
];
