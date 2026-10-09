// ── The rest of Theory: key centers ───────────────────────────────────────
// A key center for each scale outside the diatonic modes, on each book key:
// the harmonic minor, melodic minor, harmonic major and double harmonic
// modes, and the pentatonic and blues scales. No book key lends them chord
// boxes, so every chord is a generated grip (lib/guitar/theory/grips.ts) set
// near the scale's own position, which is Book One's layout where a hand can
// play it (modes/positions.ts). Built on demand and cached by
// getGuitarCenter (centers.ts), which is how everything else reads them.

import {
  formatNoteName,
  spellScale,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { classifyStack } from '@/lib/guitar/theory/chordQuality';
import { placeGrip, type FretWindow } from '@/lib/guitar/theory/grips';
import { spellScaleLesson, SCALE_LESSONS } from '@/lib/learn/scaleLessons';
import { GUITAR_ATLAS_BOOK_ONE, keyPitchClass } from '../bookOne';
import { heptatonicDegreeLabels } from '../degreeLabels';
import { MODE_STEPS } from '../modes/modeTables';
import { playableScalePosition } from '../modes/positions';
import { guitarScaleEntry } from '../theoryCatalog';
import type {
  BookChordQuality,
  ExtendedGuitarCenter,
  GuitarChordShape,
  GuitarExtendedScale,
  GuitarHeptatonicScale,
  GuitarKeyName,
  GuitarMusicMap,
  GuitarPentatonicScale,
  ScaleDegree,
} from '../types';
import {
  FAMILY_MODES,
  SCALE_MUSIC_MAPS,
  heptatonicMapDegrees,
  isPentatonicScale,
  scaleSteps,
  type HeptatonicFamily,
  type ScaleMapChord,
} from './scaleTables';

export * from './scaleTables';

const DEGREES: readonly ScaleDegree[] = [1, 2, 3, 4, 5, 6, 7];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const ascii = (names: readonly string[]) =>
  names.map((n) => formatNoteName(n, 'ascii'));

/** Not from the book: generated centers cite no pages. */
const NO_PAGES = { pdfPages: [0, 0] as const };

function spell(key: GuitarKeyName, steps: readonly number[]): string[] {
  const spelled = spellScale(key, [...steps]);
  if (!spelled) throw new Error(`Cannot spell ${key} ${steps}`);
  return ascii(spelled);
}

/** The chord on `degree` of a seven-note frame, stacked in thirds. */
function stackedQuality(
  steps: readonly number[],
  degree: number,
  notes: 3 | 4,
): BookChordQuality {
  const at = (skip: number) =>
    mod12(steps[(degree - 1 + skip) % 7] - steps[degree - 1]);
  return classifyStack(notes === 3 ? [at(2), at(4)] : [at(2), at(4), at(6)]);
}

function chordShape(
  rootPc: number,
  degree: ScaleDegree,
  quality: BookChordQuality,
  window: FretWindow,
  prefer?: { rootString: 5 | 6; rootFret: number },
): GuitarChordShape & { rootString: 5 | 6; rootFret: number } {
  const grip = placeGrip(rootPc, quality, window, prefer);
  return {
    degree,
    quality,
    ...grip.shape,
    rootString: grip.rootString,
    rootFret: grip.rootFret,
  };
}

/** A shape without the placement it was chosen by. */
function boxOf(shape: GuitarChordShape): GuitarChordShape {
  return {
    degree: shape.degree,
    quality: shape.quality,
    frets: shape.frets,
    diagramStartFret: shape.diagramStartFret,
    fingering: shape.fingering,
    ...(shape.barre ? { barre: shape.barre } : {}),
  };
}

/**
 * Music Maps from rows of chords, in the rhythms of the same key's Book One
 * maps (the rows keep the book's bar counts).
 */
function buildMaps(
  key: GuitarKeyName,
  rows: readonly (readonly GuitarChordShape[])[],
): GuitarMusicMap[] {
  const book = GUITAR_ATLAS_BOOK_ONE[key].musicMaps;
  return rows.map((bars, i) => ({
    example: (i + 1) as GuitarMusicMap['example'],
    repeat: true,
    bars: bars.map((shape, b) => ({
      degree: shape.degree,
      quality: shape.quality,
      frets: shape.frets,
      diagramStartFret: shape.diagramStartFret,
      fingering: shape.fingering,
      ...(shape.barre ? { barre: shape.barre } : {}),
      rhythm: book[i].bars[b].rhythm,
    })),
  }));
}

/** The family a seven-note mode belongs to, and its number in it. */
function familyOf(scale: GuitarHeptatonicScale): {
  family: HeptatonicFamily;
  degree: ScaleDegree;
} {
  for (const [family, modes] of Object.entries(FAMILY_MODES)) {
    const i = modes.indexOf(scale);
    if (i >= 0) {
      return {
        family: family as HeptatonicFamily,
        degree: (i + 1) as ScaleDegree,
      };
    }
  }
  throw new Error(`No family has "${scale}"`);
}

/** A seven-note mode of the harmonic or melodic families on a book key. */
function buildHeptatonicCenter(
  key: GuitarKeyName,
  scale: GuitarHeptatonicScale,
): ExtendedGuitarCenter {
  const steps = scaleSteps(scale);
  const tonicPc = keyPitchClass(key);
  const spelling = spell(key, steps);
  const { family, degree } = familyOf(scale);
  const parentScale = FAMILY_MODES[family][0];
  const parentSteps = scaleSteps(parentScale);
  const parentTonicPc = mod12(tonicPc - parentSteps[degree - 1]);
  const majorScale = playableScalePosition(tonicPc, steps);
  const window = majorScale;

  const sevenths = DEGREES.map((d) =>
    chordShape(
      mod12(tonicPc + steps[d - 1]),
      d,
      stackedQuality(steps, d, 4),
      window,
    ),
  );
  // Each triad sits where its 7th chord does when it has a grip there.
  const triads = DEGREES.map((d, i) =>
    chordShape(
      mod12(tonicPc + steps[d - 1]),
      d,
      stackedQuality(steps, d, 3),
      window,
      { rootString: sevenths[i].rootString, rootFret: sevenths[i].rootFret },
    ),
  ).map(boxOf);
  const sevenBoxes = sevenths.map(boxOf);

  const entry = guitarScaleEntry(scale);
  const displayName = GUITAR_ATLAS_BOOK_ONE[key].displayName;
  const parentTonic = spelling[(8 - degree) % 7];
  const rows = heptatonicMapDegrees(scale).map((row, i) =>
    row.map((d) => (i < 3 ? triads : sevenBoxes)[d - 1]),
  );
  return {
    id: `${key}:${scale}`,
    key,
    family,
    mode: scale,
    displayName,
    source: NO_PAGES,
    signatureText:
      degree === 1
        ? `${displayName} ${entry.name} is mode 1 of its family.`
        : `${displayName} ${entry.name} plays the notes of ${parentTonic} ${guitarScaleEntry(parentScale).name} from its ${degree}.`,
    tonicPc,
    steps,
    spelling,
    degreeLabels: heptatonicDegreeLabels(steps),
    chordSteps: steps,
    chordSpelling: spelling,
    familyParent: {
      scale: parentScale,
      tonic: parentTonic,
      tonicPc: parentTonicPc,
      degree,
    },
    scaleNotes: spelling,
    pentatonicNotes: [],
    majorScale,
    // No pentatonic chapter in these lessons; the slot reads the scale.
    pentatonic: majorScale,
    pentatonics: [],
    triads,
    sevenths: [...sevenBoxes, sevenBoxes[0]],
    musicMaps: buildMaps(key, rows),
    chords: [],
  };
}

/** A pentatonic or blues scale on a book key: melody, and its progression. */
function buildPentatonicCenter(
  key: GuitarKeyName,
  scale: GuitarPentatonicScale,
): ExtendedGuitarCenter {
  const lesson = SCALE_LESSONS[scale];
  const steps = lesson.steps;
  const tonicPc = keyPitchClass(key);
  const displayName = GUITAR_ATLAS_BOOK_ONE[key].displayName;
  const spelling = ascii(spellScaleLesson(lesson, displayName));
  const chordSteps = MODE_STEPS[lesson.parentMode];
  const chordSpelling = spell(key, chordSteps);
  const majorScale = playableScalePosition(tonicPc, steps);

  // One box per chord the maps use, in order of first appearance.
  const chords: GuitarChordShape[] = [];
  const shapeOf = ({ degree, quality }: ScaleMapChord) => {
    const found = chords.find(
      (c) => c.degree === degree && c.quality === quality,
    );
    if (found) return found;
    const shape = boxOf(
      chordShape(
        mod12(tonicPc + chordSteps[degree - 1]),
        degree,
        quality,
        majorScale,
      ),
    );
    chords.push(shape);
    return shape;
  };
  const rows = SCALE_MUSIC_MAPS[scale].map((row) => row.map(shapeOf));
  const entry = guitarScaleEntry(scale);
  return {
    id: `${key}:${scale}`,
    key,
    family: 'pentatonic-blues',
    mode: scale,
    displayName,
    source: NO_PAGES,
    signatureText: `${displayName} ${entry.name}: ${lesson.formula}.`,
    tonicPc,
    steps,
    spelling,
    degreeLabels: lesson.formula.split(' – '),
    chordSteps,
    chordSpelling,
    familyParent: null,
    scaleNotes: spelling,
    pentatonicNotes: spelling,
    majorScale,
    pentatonic: majorScale,
    pentatonics: [],
    triads: [],
    sevenths: [],
    musicMaps: buildMaps(key, rows),
    chords,
  };
}

/** The key center of a scale from the rest of Theory on Book One's `key`. */
export function buildExtendedCenter(
  key: GuitarKeyName,
  scale: GuitarExtendedScale,
): ExtendedGuitarCenter {
  return isPentatonicScale(scale)
    ? buildPentatonicCenter(key, scale)
    : buildHeptatonicCenter(key, scale);
}
