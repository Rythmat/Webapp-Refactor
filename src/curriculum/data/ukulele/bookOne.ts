// ── The Ukulele Atlas: Book One ───────────────────────────────────────────
// What the book prints for each of its 12 key centers (Aaron Marfizo, Music
// Bridge, 1st edition; PDF "The Ukulele Atlas (PRINT)", 54 pages — the Drive
// DIGITAL copy is the same book in 52 pages). Each key has four pages: a
// title page, the Major and Pentatonic scale boxes, six triads (I ii iii IV
// V vi) as open-chord boxes, and Music Maps 1-3.
//
// Only what the book decides is typed here: the triads' frets (written
// G-C-E-A, as the book captions them) and the fret printed on each scale
// box's top row. The scale boxes' notes follow one rule the book keeps in
// every key (./positions), the Music Maps are Guitar Atlas Book One's Maps
// 1-3 note for note (same progressions and rhythms), and the scale spelling
// and signature text are guitar's — so none of those is copied.

import type { GuitarKeyName } from '@/curriculum/data/guitar/types';

export interface UkuleleBookKey {
  key: GuitarKeyName;
  /** PDF pages (1-based): scale boxes, triads, Music Maps. */
  pdfPages: { scale: number; triads: number; maps: number };
  /** Fret printed on the scale boxes' top row (the book's own choice). */
  scaleFretStart: number;
  /** Triads 1-6 as frets, G-C-E-A, with the book's errata corrected. */
  triads: readonly [string, string, string, string, string, string];
  /** Erratum ids per triad index (./errata). */
  triadErrata?: Readonly<Partial<Record<0 | 1 | 2 | 3 | 4 | 5, string>>>;
}

const pages = (i: number) => ({
  scale: 3 + 4 * i,
  triads: 4 + 4 * i,
  maps: 5 + 4 * i,
});

/** Book order: around the circle of fifths from C. */
export const UKULELE_ATLAS_BOOK_ONE: Readonly<
  Record<GuitarKeyName, UkuleleBookKey>
> = {
  C: {
    key: 'C',
    pdfPages: pages(0),
    scaleFretStart: 1,
    triads: ['0-0-0-3', '2-2-1-0', '0-4-3-2', '2-0-1-0', '0-2-3-2', '2-0-0-0'],
    triadErrata: { 5: 'C-triad-6-am-caption' },
  },
  G: {
    key: 'G',
    pdfPages: pages(1),
    scaleFretStart: 7,
    triads: ['0-2-3-2', '2-0-0-0', '4-2-2-2', '0-0-0-3', '2-2-2-5', '0-4-3-2'],
  },
  D: {
    key: 'D',
    pdfPages: pages(2),
    scaleFretStart: 1,
    triads: ['2-2-2-5', '0-4-3-2', '2-1-2-0', '0-2-3-2', '2-1-0-0', '4-2-2-2'],
  },
  A: {
    key: 'A',
    pdfPages: pages(3),
    scaleFretStart: 8,
    triads: ['2-1-0-0', '4-2-2-2', '6-4-4-4', '2-2-2-5', '4-4-4-7', '2-1-2-0'],
  },
  E: {
    key: 'E',
    pdfPages: pages(4),
    scaleFretStart: 4,
    triads: ['4-4-4-7', '2-1-2-0', '4-3-4-2', '2-1-0-0', '4-3-2-2', '6-4-4-4'],
  },
  B: {
    key: 'B',
    pdfPages: pages(5),
    scaleFretStart: 5,
    triads: ['4-3-2-2', '6-4-4-4', '8-6-6-6', '4-4-4-7', '6-6-6-9', '4-3-4-2'],
  },
  'F#': {
    key: 'F#',
    pdfPages: pages(6),
    scaleFretStart: 6,
    triads: ['3-1-2-1', '4-3-4-2', '3-1-1-1', '4-3-2-2', '1-1-1-4', '3-3-2-1'],
  },
  Db: {
    key: 'Db',
    pdfPages: pages(7),
    scaleFretStart: 1,
    triads: ['1-1-1-4', '3-3-2-1', '1-0-1-3', '3-1-2-1', '5-3-4-3', '3-1-1-1'],
    triadErrata: { 2: 'Db-triad-3-fm-caption' },
  },
  Ab: {
    key: 'Ab',
    pdfPages: pages(8),
    scaleFretStart: 8,
    triads: ['1-3-4-3', '3-1-1-1', '0-3-3-3', '1-1-1-4', '0-3-3-1', '1-0-1-3'],
  },
  Eb: {
    key: 'Eb',
    pdfPages: pages(9),
    scaleFretStart: 3,
    triads: ['0-3-3-1', '1-0-1-3', '0-2-3-1', '1-3-4-3', '3-2-1-1', '0-3-3-3'],
  },
  Bb: {
    key: 'Bb',
    pdfPages: pages(10),
    scaleFretStart: 4,
    triads: ['3-2-1-1', '0-3-3-3', '2-2-1-0', '0-3-3-1', '2-0-1-0', '0-2-3-1'],
  },
  F: {
    key: 'F',
    pdfPages: pages(11),
    scaleFretStart: 5,
    triads: ['2-0-1-0', '0-2-3-1', '2-0-0-0', '3-2-1-1', '0-0-0-3', '2-2-1-0'],
  },
};
