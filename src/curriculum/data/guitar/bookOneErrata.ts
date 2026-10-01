// ── The Guitar Atlas: Book One — errata ───────────────────────────────────
// Everything found while turning the book into lesson data (PDF of the 1st
// edition, checked page by page). `appDataChanged` marks the entries where the
// app shows something different from the printed page; the data items that
// carry the fix list the erratum id. docs/guitar-atlas/book-one-errata.md is
// the same list written up for the book's next edition, and a test keeps the
// two in step.

import type { GuitarKeyName } from './types';

export type ErratumKind =
  | 'chord-shape'
  | 'shape-caption'
  | 'chord-name'
  | 'fret-label'
  | 'fingering'
  | 'rhythm-notation'
  | 'example-label'
  | 'octave-box'
  | 'page-number'
  | 'typography'
  | 'missing-content'
  | 'content-question';

export interface GuitarAtlasErratum {
  id: string;
  key: GuitarKeyName | 'ALL';
  /** PDF page (1-based), or null when it applies across the book. */
  pdfPage: number | null;
  location: string;
  kind: ErratumKind;
  asPrinted: string;
  correction: string;
  /** True when the app shows the correction instead of the printed text. */
  appDataChanged: boolean;
}

export const GUITAR_ATLAS_BOOK_ONE_ERRATA: readonly GuitarAtlasErratum[] = [
  // ── Chord shapes that sound the wrong chord ──
  {
    id: 'Ab-7th-6-fm7-shape',
    key: 'Ab',
    pdfPage: 66,
    location: 'Root Position 7th Chords, box 6 (F minor 7)',
    kind: 'chord-shape',
    asPrinted:
      'X-7-9-7-8-X (diagram, caption and hand all sound E3 B3 D4 G4 = E minor 7)',
    correction:
      'X-8-10-8-9-X, index barre at fret 8 (the A♭ Example 5 Music Map already draws this F minor 7)',
    appDataChanged: true,
  },
  {
    id: 'Bb-triad-2-cm-shape',
    key: 'Bb',
    pdfPage: 76,
    location: 'Root Position Triads, box 2 (C minor)',
    kind: 'chord-shape',
    asPrinted: 'X-3-5-3-4-X (sounds C3 G3 B♭3 E♭4 = C minor 7)',
    correction:
      'X-3-5-5-4-X, fingers 1 3 4 2, as the A♭ triad page draws C minor',
    appDataChanged: true,
  },
  {
    id: 'Eb-triad-6-cm-shape',
    key: 'Eb',
    pdfPage: 70,
    location: 'Root Position Triads, box 6 (C minor)',
    kind: 'chord-shape',
    asPrinted:
      'X-3-5-3-4-X with a barre (sounds C minor 7); the hand graphic prints 3 4 5 5, which fits the triad',
    correction:
      'X-3-5-5-4-X, fingers 1 3 4 2, as the A♭ triad page draws C minor',
    appDataChanged: true,
  },
  // ── Music Map diagrams drawn at the wrong frets ──
  {
    id: 'Db-map-1-fret-labels',
    key: 'Db',
    pdfPage: 59,
    location: 'Music Maps, Example 1 (D♭ major)',
    kind: 'fret-label',
    asPrinted:
      '2-4-4-3-X-X at frets 1-5 (the F♯ major box from the F♯ page; sounds F♯ major)',
    correction: 'X-4-6-6-6-X, the D♭ major shape from the D♭ triad page',
    appDataChanged: true,
  },
  {
    id: 'Db-map-2-fret-labels',
    key: 'Db',
    pdfPage: 59,
    location: 'Music Maps, Example 2 (D♭ major, G♭ major)',
    kind: 'fret-label',
    asPrinted:
      '2-4-4-3-X-X | X-2-4-4-4-X at frets 1-5 (the F♯ page boxes; sound F♯ major and B major)',
    correction:
      'X-4-6-6-6-X | 2-4-4-3-X-X, the D♭ and G♭ shapes from the D♭ triad page',
    appDataChanged: true,
  },
  {
    id: 'Db-map-3-fret-labels',
    key: 'Db',
    pdfPage: 59,
    location: 'Music Maps, Example 3 (E♭ minor, D♭ major)',
    kind: 'fret-label',
    asPrinted:
      'X-2-4-4-3-X | X-2-4-4-4-X with fret labels 1-5 (sound B minor and B major)',
    correction:
      'X-6-8-8-7-X | X-4-6-6-6-X, the E♭ minor and D♭ major shapes from the D♭ triad page',
    appDataChanged: true,
  },
  {
    id: 'Eb-map-3-fret-labels',
    key: 'Eb',
    pdfPage: 71,
    location: 'Music Maps, Example 3 (F minor, C minor)',
    kind: 'fret-label',
    asPrinted:
      'fret labels 8-12 put the shapes one fret high: X-9-11-11-10-X | 9-11-11-9-X-X (F♯ minor, C♯ minor)',
    correction: 'fret labels 7-11: X-8-10-10-9-X | 8-10-10-8-X-X',
    appDataChanged: true,
  },
  // ── Captions that disagree with the drawn diagram ──
  {
    id: 'G-7th-8-caption',
    key: 'G',
    pdfPage: 24,
    location: 'Root Position 7th Chords, closing box "1. G major 7"',
    kind: 'shape-caption',
    asPrinted: 'X-10-12-11-10-X (would sound G D F♯ A, no third)',
    correction:
      'X-10-12-11-12-X, as the diagram and the hand graphic (10 11 12 12) show',
    appDataChanged: true,
  },
  {
    id: 'Db-triad-4-caption',
    key: 'Db',
    pdfPage: 58,
    location: 'Root Position Triads, box 4 (G♭ major)',
    kind: 'shape-caption',
    asPrinted: 'X-2-4-4-3-X (would sound B minor)',
    correction:
      '2-4-4-3-X-X, as the diagram and the hand graphic (2 3 4 4) show',
    appDataChanged: true,
  },
  // ── Chord names ──
  {
    id: 'A-map-3-bar-2-name',
    key: 'A',
    pdfPage: 35,
    location: 'Music Maps, Example 3, bar 2',
    kind: 'chord-name',
    asPrinted: 'F# major',
    correction: 'F# minor (the progression says 6 min; the box is F♯ minor)',
    appDataChanged: true,
  },
  {
    id: 'A-map-4-bar-4-name',
    key: 'A',
    pdfPage: 37,
    location: 'Music Maps, first 4-bar map, bar 4',
    kind: 'chord-name',
    asPrinted: 'D minor 7',
    correction: 'D major 7 (the progression says 4 maj7; the box is Dmaj7)',
    appDataChanged: true,
  },
  {
    id: 'E-map-5-bar-2-name',
    key: 'E',
    pdfPage: 43,
    location: 'Music Maps, second 4-bar map, bar 2',
    kind: 'chord-name',
    asPrinted: 'G# minor',
    correction: 'G# minor 7 (the progression says 3 min7; the box is G♯m7)',
    appDataChanged: true,
  },
  {
    id: 'Ab-map-5-bar-3-name',
    key: 'Ab',
    pdfPage: 67,
    location: 'Music Maps, second 4-bar map, bar 3',
    kind: 'chord-name',
    asPrinted: 'Ab major',
    correction: 'Ab major 7 (the progression says 1 maj7; the box is A♭maj7)',
    appDataChanged: true,
  },
  {
    id: 'ALL-map-5-label',
    key: 'ALL',
    pdfPage: null,
    location:
      'Music Maps after the 7th-chord page, in every key: both maps are labelled "Example 4"',
    kind: 'example-label',
    asPrinted: 'Example 4: Four Bars (second map)',
    correction: 'Example 5: Four Bars',
    appDataChanged: true,
  },
  // ── Rhythm notation ──
  {
    id: 'Db-map-2-bar-2-dot',
    key: 'Db',
    pdfPage: 59,
    location: 'Music Maps, Example 2, bar 2, fourth note',
    kind: 'rhythm-notation',
    asPrinted:
      'a plain quarter note (the bar adds up to 7/8; its duration bar spans 6 sixteenths)',
    correction: 'a dotted quarter, as bar 1 prints it',
    appDataChanged: true,
  },
  // ── Fingering ──
  {
    id: 'C-triad-5-g-fingering',
    key: 'C',
    pdfPage: 16,
    location: 'Root Position Triads, box 5 (G major) hand graphic',
    kind: 'fingering',
    asPrinted: '3 2 3 (index on fret 3 of string 6, so the fingers cross)',
    correction:
      '2 3 3: middle on string 6, index on string 5, ring on string 1, as the G and D pages print it',
    appDataChanged: true,
  },
  {
    id: 'G-triad-2-am-fingering',
    key: 'G',
    pdfPage: 22,
    location: 'Root Position Triads, box 2 (A minor) hand graphic',
    kind: 'fingering',
    asPrinted: '2 2 1 (ring finger behind the index and middle)',
    correction: '1 2 2, as the C and F pages print it',
    appDataChanged: true,
  },
  {
    id: 'E-triad-1-e-fingering',
    key: 'E',
    pdfPage: 40,
    location: 'Root Position Triads, box 1 (E major) hand graphic',
    kind: 'fingering',
    asPrinted: '2 2 1',
    correction: '1 2 2, as the A and B pages print it',
    appDataChanged: true,
  },
  {
    id: 'E-triad-3-gsm-barre',
    key: 'E',
    pdfPage: 40,
    location: 'Root Position Triads, box 3 (G♯ minor)',
    kind: 'fingering',
    asPrinted:
      'separate dots at fret 4 on strings 6 and 3; the hand shows only index, ring and pinky',
    correction:
      'an index barre at fret 4 across strings 6-3, as the F♯ page draws G♯ minor',
    appDataChanged: true,
  },
  {
    id: 'B-triad-6-gsm-barre',
    key: 'B',
    pdfPage: 46,
    location: 'Root Position Triads, box 6 (G♯ minor)',
    kind: 'fingering',
    asPrinted:
      'separate dots at fret 4 on strings 6 and 3; the hand shows only index, ring and pinky',
    correction:
      'an index barre at fret 4 across strings 6-3, as the F♯ page draws G♯ minor',
    appDataChanged: true,
  },
  // ── Closing "1" box on the 7th-chord page ──
  {
    id: 'Db-7th-8-octave',
    key: 'Db',
    pdfPage: 60,
    location: 'Root Position 7th Chords, closing box "1. D♭ major 7"',
    kind: 'octave-box',
    asPrinted:
      'X-4-6-5-6-X, the same voicing as box 1 (every other key places this box an octave higher)',
    correction:
      'suggested: X-16-18-17-18-X. The app keeps the drawn voicing and does not call it an octave.',
    appDataChanged: false,
  },
  {
    id: 'Eb-7th-8-octave',
    key: 'Eb',
    pdfPage: 72,
    location: 'Root Position 7th Chords, closing box "1. E♭ major 7"',
    kind: 'octave-box',
    asPrinted:
      '11-X-12-12-11-X, root E♭3 — the same register as box 1, in a different voicing',
    correction:
      'suggested: X-18-20-19-20-X. The app keeps the drawn voicing and does not call it an octave.',
    appDataChanged: false,
  },
  // ── Logged for the author (no change in the app) ──
  {
    id: 'ALL-guitar-fundamentals-missing',
    key: 'ALL',
    pdfPage: 4,
    location:
      'Contents: Guitar Fundamentals (Layout of the Guitar p.9, Hand Positions p.11, Finger Placement for Chords p.12)',
    kind: 'missing-content',
    asPrinted:
      'listed in the contents, but the PDF goes from the Guidebook (p.7) straight to Book One (p.13)',
    correction:
      'add the Guitar Fundamentals pages; the app has no guitar version of Piano Fundamentals until they exist',
    appDataChanged: false,
  },
  {
    id: 'ALL-preface-guit-atlas',
    key: 'ALL',
    pdfPage: 6,
    location: 'Preface heading',
    kind: 'typography',
    asPrinted: 'HOW TO USE THE GUIT ATLAS',
    correction: 'HOW TO USE THE GUITAR ATLAS',
    appDataChanged: false,
  },
  {
    id: 'ALL-acknowledgments-piano-atlas',
    key: 'ALL',
    pdfPage: 3,
    location: 'Acknowledgments',
    kind: 'typography',
    asPrinted:
      'thanks students, teaching artists and partners for shaping "the Piano Atlas"',
    correction: 'refer to the Guitar Atlas (or to the Music Atlas series)',
    appDataChanged: false,
  },
  {
    id: 'C-7th-page-number',
    key: 'C',
    pdfPage: 18,
    location: 'Root Position 7th Chords page number',
    kind: 'page-number',
    asPrinted: '15',
    correction: '17',
    appDataChanged: false,
  },
  {
    id: 'A-scale-page-number',
    key: 'A',
    pdfPage: 33,
    location: 'Major & Pentatonic Scale page number',
    kind: 'page-number',
    asPrinted: '26',
    correction: '32',
    appDataChanged: false,
  },
  {
    id: 'ALL-flat-five-spacing',
    key: 'ALL',
    pdfPage: null,
    location:
      'Every "7. … minor 7(♭5)" heading, and the B♭ map label "A minor 7 ( b5)"',
    kind: 'typography',
    asPrinted: 'stray spaces around the flat: "7( ♭5)"',
    correction: '"7(♭5)"',
    appDataChanged: false,
  },
  {
    id: 'B-pentatonic-caption-case',
    key: 'B',
    pdfPage: 45,
    location: 'Pentatonic caption',
    kind: 'typography',
    asPrinted: 'The B Major Pentatonic Scale has 5 notes (also on the F♯ page)',
    correction:
      'The B major pentatonic scale has 5 notes, as the other keys print it',
    appDataChanged: false,
  },
  {
    id: 'ALL-triad-bars-in-7th-maps',
    key: 'ALL',
    pdfPage: null,
    location:
      'The 7th-chord Music Maps of D, A, E, B, A♭, E♭ and F include triad bars (e.g. "5 maj")',
    kind: 'content-question',
    asPrinted: 'triads mixed into the maps that follow the 7th-chord page',
    correction:
      'confirm this is intended; the app plays them as printed (C, G, F♯, D♭ and B♭ use only 7th chords there)',
    appDataChanged: false,
  },
  {
    id: 'ALL-map-voicings-differ',
    key: 'ALL',
    pdfPage: null,
    location: 'Music Maps in most keys',
    kind: 'content-question',
    asPrinted:
      'map boxes often use a voicing that is not on the chord pages (e.g. C Example 5 draws Am7 as 5-X-5-5-5-X)',
    correction:
      'confirm this is intended; the app shows each map voicing as drawn',
    appDataChanged: false,
  },
  {
    id: 'ALL-fingering-varies-by-page',
    key: 'ALL',
    pdfPage: null,
    location:
      'The same shape fingered differently on different pages (F♯ minor on the A and E pages; C7 on the F page vs F7 on the B♭ page)',
    kind: 'content-question',
    asPrinted: 'barre on one page, separate fingers on another',
    correction:
      'pick one fingering per shape; the app shows each page as printed',
    appDataChanged: false,
  },
];

export function getErratum(id: string): GuitarAtlasErratum | undefined {
  return GUITAR_ATLAS_BOOK_ONE_ERRATA.find((e) => e.id === id);
}
