// The Bass Atlas: Book One's movable shapes, typed in from the reference
// PNGs (~/Desktop/References/3. The Bass Atlas/1 Book One - Key Centers/
// <n> Key of X/…). The PNGs carry no fret numbers and are the same shape in
// every key, so each is written relative to its first note: [string, frets
// from the first note's fret], string 4 = E … 1 = G, in playing order. The
// file names keep the guitar's string names: '6th' is E, '5th' is A.

import type { BookChordQuality } from '@/curriculum/data/guitar/types';

export type ShapeNote = readonly [string: 1 | 2 | 3 | 4, offset: number];

export interface BookShape {
  /** The PNG it was read from, under '<n> Key of X/'. */
  png: string;
  notes: readonly ShapeNote[];
}

export const SCALE_SHAPES = {
  ionian: {
    png: 'X Scales/X Ionian.png',
    notes: [
      [4, 0],
      [4, 2],
      [3, -1],
      [3, 0],
      [3, 2],
      [2, -1],
      [2, 1],
      [2, 2],
    ],
  },
  pentatonicFromA: {
    png: 'X Scales/X Pentatonic.png',
    notes: [
      [3, 0],
      [3, 2],
      [3, 4],
      [2, 2],
      [2, 4],
      [1, 2],
    ],
  },
  pentatonicFromE: {
    png: 'X Scales/X Pen - 6th string.png',
    notes: [
      [4, 0],
      [4, 2],
      [4, 4],
      [3, 2],
      [3, 4],
      [2, 2],
    ],
  },
} as const satisfies Record<string, BookShape>;

export interface ArpeggioShape extends BookShape {
  quality: BookChordQuality;
  rootString: 3 | 4;
}

export const ARPEGGIO_SHAPES: readonly ArpeggioShape[] = [
  {
    png: 'X Major Triad Arpeggios/X Root/6th - Major Arp.png',
    quality: 'maj',
    rootString: 4,
    notes: [
      [4, 0],
      [3, -1],
      [3, 2],
    ],
  },
  {
    png: 'X Major Triad Arpeggios/X Root/6th - Minor Arp.png',
    quality: 'min',
    rootString: 4,
    notes: [
      [4, 0],
      [4, 3],
      [3, 2],
    ],
  },
  {
    png: 'X Major Triad Arpeggios/X Root/5th - Major Arp.png',
    quality: 'maj',
    rootString: 3,
    notes: [
      [3, 0],
      [2, -1],
      [2, 2],
    ],
  },
  {
    png: 'X Major Triad Arpeggios/X Root/5th - Minor Arp.png',
    quality: 'min',
    rootString: 3,
    notes: [
      [3, 0],
      [3, 3],
      [2, 2],
    ],
  },
  {
    png: 'X Major Triad Arpeggios/X Root/5th - Dim Arp.png',
    quality: 'dim',
    rootString: 3,
    notes: [
      [3, 0],
      [3, 3],
      [2, 1],
    ],
  },
  {
    png: 'X Major 7th Arpeggios/X 7ths Root/6th - Major 7 Arp.png',
    quality: 'maj7',
    rootString: 4,
    notes: [
      [4, 0],
      [3, -1],
      [3, 2],
      [2, 1],
    ],
  },
  {
    png: 'X Major 7th Arpeggios/X 7ths Root/6th - Minor 7 Arp.png',
    quality: 'min7',
    rootString: 4,
    notes: [
      [4, 0],
      [4, 3],
      [3, 2],
      [2, 0],
    ],
  },
  {
    png: 'X Major 7th Arpeggios/X 7ths Root/5th - Major 7 Arp.png',
    quality: 'maj7',
    rootString: 3,
    notes: [
      [3, 0],
      [2, -1],
      [2, 2],
      [1, 1],
    ],
  },
  {
    png: 'X Major 7th Arpeggios/X 7ths Root/5th - Minor 7 Arp.png',
    quality: 'min7',
    rootString: 3,
    notes: [
      [3, 0],
      [3, 3],
      [2, 2],
      [1, 0],
    ],
  },
  {
    png: 'X Major 7th Arpeggios/X 7ths Root/5th - Dom7 Arp.png',
    quality: 'dom7',
    rootString: 3,
    notes: [
      [3, 0],
      [2, -1],
      [2, 2],
      [1, 0],
    ],
  },
  {
    png: 'X Major 7th Arpeggios/X 7ths Root/5th - Minor7b5 Arp.png',
    quality: 'min7b5',
    rootString: 3,
    notes: [
      [3, 0],
      [3, 3],
      [2, 1],
      [1, 0],
    ],
  },
];

/** The keys the book gives a "Pen - 6th string" box: their pentatonic starts on E. */
export const PENTATONIC_ON_E_KEYS = ['G', 'A', 'F#', 'Ab', 'F'] as const;

/**
 * The Canva draft's C pages (the one key converted to bass), as
 * '<string letter><fret>' in playing order. Its V7 (drawn as B7: D1 A2 G2
 * D4) is a draft error and left out; the closing '1' repeats box 1.
 */
export const CANVA_C = {
  scale: 'E8 E10 A7 A8 A10 D7 D9 D10',
  pentatonic: 'A3 A5 A7 D5 D7 G5',
  triads: [
    'A3 D2 D5',
    'A5 A8 D7',
    'A7 A10 D9',
    'A8 D7 D10',
    'E3 A2 A5',
    'E5 E8 A7',
  ],
  sevenths: {
    1: 'A3 D2 D5 G4',
    2: 'A5 A8 D7 G5',
    3: 'A7 A10 D9 G7',
    4: 'A8 D7 D10 G9',
    6: 'E5 E8 A7 D5',
    7: 'A2 A5 D3 G2',
    8: 'A3 D2 D5 G4',
  },
} as const;
