// ── The Ukulele Atlas: Book One — errata ──────────────────────────────────
// Found while turning the book into lesson data: every triad was checked
// against the chord it names, and every scale box against the key. The app
// shows the correction; the triad that carries it lists the erratum id.

import type { GuitarKeyName } from '@/curriculum/data/guitar/types';

export interface UkuleleAtlasErratum {
  id: string;
  key: GuitarKeyName;
  /** PDF page (1-based) of The Ukulele Atlas (PRINT). */
  pdfPage: number;
  location: string;
  asPrinted: string;
  correction: string;
  /** True when the app shows the correction instead of the printed text. */
  appDataChanged: boolean;
}

export const UKULELE_ATLAS_BOOK_ONE_ERRATA: readonly UkuleleAtlasErratum[] = [
  {
    id: 'C-triad-6-am-caption',
    key: 'C',
    pdfPage: 4,
    location: 'Triads, box 6 (A minor)',
    asPrinted:
      'caption 1-0-0-0 (sounds A♯ C E A); the diagram draws the G string at fret 2',
    correction: '2-0-0-0, as the diagram and the G and F pages print it',
    appDataChanged: true,
  },
  {
    id: 'Db-triad-3-fm-caption',
    key: 'Db',
    pdfPage: 32,
    location: 'Triads, box 3 (F minor)',
    asPrinted:
      'caption 0-4-3-2 (E minor); the diagram draws 1-0-1-3, which is F minor',
    correction: '1-0-1-3, as the diagram and the A♭ and E♭ pages print it',
    appDataChanged: true,
  },
  {
    id: 'G-scale-minor-pentatonic-file',
    key: 'G',
    pdfPage: 7,
    location: 'Reference folder, "G Scale/minor pentatonic.png"',
    asPrinted:
      'a box that matches no G scale (it is not used on the printed page)',
    correction: 'not used; the page’s G pentatonic box is the one in the app',
    appDataChanged: false,
  },
];
