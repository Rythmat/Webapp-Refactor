// ── Voicing families ───────────────────────────────────────────────────────
// Names the kind of grip a chord box is (open chord, root-6 barre, drop 2 …)
// from its notes alone, so the family tag can never disagree with the shape.
// Run over the uncorrected book data it flags exactly the logged shape and
// chord-name errata, which makes it an errata guard as well.

import type { BookChordQuality } from '@/curriculum/data/guitar/types';
import {
  GUITAR_STANDARD_TUNING,
  GUITAR_STRINGS_LOW_TO_HIGH,
  formatShape,
  parseShape,
  shapeNotes,
} from '@/lib/guitar/fretboard';
import type {
  GuitarShapeDiagram,
  GuitarStringNumber,
} from '@/lib/guitar/types';
import { chordToneLabel, isTriadQuality } from './chordTones';
import type {
  ChordToneLabel,
  SeventhQuality,
  VoicingFamily,
  VoicingInfo,
} from './types';

export type DropFamily =
  | 'close'
  | 'drop2'
  | 'drop3'
  | 'drop2and4'
  | 'drop2and3';

/**
 * Position of each tone in a stack of thirds: R 0, 3rd 1, 5th 2, 7th 3. A
 * sus2's 2 stands in the 3rd's place and a 6 in the 7th's.
 */
const STACK: Readonly<Record<ChordToneLabel, 0 | 1 | 2 | 3>> = {
  R: 0,
  '2': 1,
  '3': 1,
  b3: 1,
  '5': 2,
  b5: 2,
  '#5': 2,
  '6': 3,
  '7': 3,
  b7: 3,
  bb7: 3,
};

// Voice numbers of the close-position chord (1 = top), read from the top of
// the actual voicing down. Dropping voice 2 an octave gives 1-3-4-2, and so on.
const DROP_SIGNATURES: Readonly<Record<string, DropFamily>> = {
  '1234': 'close',
  '1342': 'drop2',
  '1243': 'drop3',
  '1324': 'drop2and4',
  '1423': 'drop2and3',
};

/** Which close-position voice(s) were dropped, for four different chord tones. */
export function dropFamily(
  lowToHigh: readonly ChordToneLabel[],
): DropFamily | null {
  if (lowToHigh.length !== 4) return null;
  const idx = lowToHigh.map((t) => STACK[t]);
  if (new Set(idx).size !== 4) return null;
  const top = idx[3];
  // Close position, counted down from the top voice.
  const voice = new Map<number, number>();
  for (let k = 0; k < 4; k++) voice.set((top - k + 4) % 4, k + 1);
  const sig = [...idx]
    .reverse()
    .map((i) => voice.get(i))
    .join('');
  return DROP_SIGNATURES[sig] ?? null;
}

const TRIAD_FAMILY_BY_LOWEST_STRING: Partial<
  Record<GuitarStringNumber, VoicingFamily>
> = {
  6: 'root6-four-string',
  5: 'root5-four-string',
  4: 'root4-four-string',
};

export function classifyVoicing(
  shape: Pick<GuitarShapeDiagram, 'frets' | 'barre'>,
  rootPc: number,
  quality: BookChordQuality,
): VoicingInfo {
  const frets = parseShape(shape.frets);
  const notes = shapeNotes(shape.frets);
  if (notes.length === 0) {
    throw new Error(`Shape "${shape.frets}" sounds nothing`);
  }
  const labels = notes.map((n) => chordToneLabel(n.midi, rootPc, quality));
  const toneOrder = labels.filter((l): l is ChordToneLabel => l !== null);
  const strings = notes.map((n) => n.position.string);
  const lowest = strings[0];
  const highest = strings[strings.length - 1];
  const mutedStrings = GUITAR_STRINGS_LOW_TO_HIGH.filter(
    (_, i) => frets[i] === null,
  );
  const usesOpenStrings = frets.some((f) => f === 0);
  const distinctTones = new Set(toneOrder).size;
  const doubledTones = [...new Set(toneOrder)].filter(
    (t) => toneOrder.indexOf(t) !== toneOrder.lastIndexOf(t),
  );

  let family: VoicingFamily;
  if (toneOrder.length !== labels.length) family = 'unclassified';
  else if (isTriadQuality(quality)) {
    if (usesOpenStrings) family = 'open-chord';
    else if (notes.length === 6) family = 'root6-full-barre';
    else family = TRIAD_FAMILY_BY_LOWEST_STRING[lowest] ?? 'unclassified';
  } else if (notes.length === 4 && distinctTones === 4) {
    family = dropFamily(toneOrder) ?? 'unclassified';
  } else {
    family = usesOpenStrings ? 'open-string-seventh' : 'unclassified';
  }

  return {
    family,
    rootString: lowest,
    stringSet: strings.join('-'),
    toneOrder,
    distinctTones,
    doubledTones,
    usesOpenStrings,
    movable: !usesOpenStrings,
    mutedStrings,
    skippedStrings: mutedStrings.filter((s) => s < lowest && s > highest),
    isRootPosition: labels[0] === 'R',
    barre: !shape.barre
      ? 'none'
      : shape.barre.fromString === 6 && shape.barre.toString === 1
        ? 'full'
        : 'partial',
  };
}

// ── Templates ──────────────────────────────────────────────────────────────

export interface FamilyTemplate {
  family: VoicingFamily;
  quality: BookChordQuality;
  rootString: 4 | 5 | 6;
  /** Frets relative to the root fret, string 6 first; null = X. */
  offsets: readonly (number | null)[];
}

const X = null;

/** Every movable Book One grip, as frets relative to its root (spec §2.4). */
export const FAMILY_TEMPLATES: readonly FamilyTemplate[] = [
  {
    family: 'root5-four-string',
    quality: 'maj',
    rootString: 5,
    offsets: [X, 0, 2, 2, 2, X],
  },
  {
    family: 'root5-four-string',
    quality: 'min',
    rootString: 5,
    offsets: [X, 0, 2, 2, 1, X],
  },
  {
    family: 'root6-four-string',
    quality: 'maj',
    rootString: 6,
    offsets: [0, 2, 2, 1, X, X],
  },
  {
    family: 'root6-four-string',
    quality: 'min',
    rootString: 6,
    offsets: [0, 2, 2, 0, X, X],
  },
  {
    family: 'root6-full-barre',
    quality: 'maj',
    rootString: 6,
    offsets: [0, 2, 2, 1, 0, 0],
  },
  {
    family: 'root6-full-barre',
    quality: 'min',
    rootString: 6,
    offsets: [0, 2, 2, 0, 0, 0],
  },
  {
    family: 'root4-four-string',
    quality: 'maj',
    rootString: 4,
    offsets: [X, X, 0, -1, -2, -2],
  },
  {
    family: 'drop2',
    quality: 'maj7',
    rootString: 5,
    offsets: [X, 0, 2, 1, 2, X],
  },
  {
    family: 'drop2',
    quality: 'dom7',
    rootString: 5,
    offsets: [X, 0, 2, 0, 2, X],
  },
  {
    family: 'drop2',
    quality: 'min7',
    rootString: 5,
    offsets: [X, 0, 2, 0, 1, X],
  },
  {
    family: 'drop2',
    quality: 'min7b5',
    rootString: 5,
    offsets: [X, 0, 1, 0, 1, X],
  },
  {
    family: 'drop3',
    quality: 'maj7',
    rootString: 6,
    offsets: [0, X, 1, 1, 0, X],
  },
  {
    family: 'drop3',
    quality: 'dom7',
    rootString: 6,
    offsets: [0, X, 0, 1, 0, X],
  },
  {
    family: 'drop3',
    quality: 'min7',
    rootString: 6,
    offsets: [0, X, 0, 0, 0, X],
  },
  {
    family: 'drop3',
    quality: 'min7b5',
    rootString: 6,
    offsets: [0, X, 0, 0, -1, X],
  },
];

/** A template placed with its root at `rootFret`, as a shape string. */
export function templateShape(
  template: FamilyTemplate,
  rootFret: number,
): string {
  return formatShape(
    template.offsets.map((offset) =>
      offset === null ? null : rootFret + offset,
    ),
  );
}

// ── Quality ladder ─────────────────────────────────────────────────────────

const LADDER: readonly SeventhQuality[] = ['maj7', 'dom7', 'min7', 'min7b5'];

export interface CompareShape {
  quality: SeventhQuality;
  frets: string;
  /** The one note that moved from the previous shape (null for maj7). */
  moved: {
    string: GuitarStringNumber;
    from: ChordToneLabel;
    to: ChordToneLabel;
  } | null;
}

/**
 * "Same root, four kinds": maj7 → dom7 → min7 → min7♭5 on the drop-2 (root
 * on string 5) or drop-3 (root on string 6) grip, each one note away from the
 * last. A root at the nut moves up 12 so every shape stays fretted. For
 * comparison only; nothing here is graded.
 */
export function compareShapes(
  rootString: 5 | 6,
  rootFret: number,
): CompareShape[] {
  const fret = rootFret === 0 ? 12 : rootFret;
  const family = rootString === 5 ? 'drop2' : 'drop3';
  const rootPc = (GUITAR_STANDARD_TUNING[rootString] + fret) % 12;
  const templates = LADDER.map((quality) => {
    const template = FAMILY_TEMPLATES.find(
      (t) => t.family === family && t.quality === quality,
    );
    if (!template) throw new Error(`No ${family} ${quality} template`);
    return template;
  });
  return LADDER.map((quality, i) => {
    const template = templates[i];
    const frets = templateShape(template, fret);
    const prev = templates[i - 1];
    const at = prev
      ? template.offsets.findIndex((o, s) => o !== prev.offsets[s])
      : -1;
    if (at < 0) return { quality, frets, moved: null };
    const string = GUITAR_STRINGS_LOW_TO_HIGH[at];
    const midi = (offset: number | null) =>
      GUITAR_STANDARD_TUNING[string] + fret + (offset ?? 0);
    const from = chordToneLabel(midi(prev.offsets[at]), rootPc, prev.quality);
    const to = chordToneLabel(midi(template.offsets[at]), rootPc, quality);
    if (!from || !to) {
      throw new Error(`Bad ${family} ladder at string ${string}`);
    }
    return { quality, frets, moved: { string, from, to } };
  });
}
