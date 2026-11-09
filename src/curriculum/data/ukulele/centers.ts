// ── Ukulele key centers ───────────────────────────────────────────────────
// A ukulele center is the guitar center of the same id (data/guitar/centers)
// with ukulele positions: the same scale, spelling, chords and Music Maps,
// drawn as The Ukulele Atlas draws them. It keeps guitar's GuitarCenter
// shape, tagged `instrument: 'ukulele'`, so the guitar lesson builder and
// views play it unchanged once they read the instrument from the center.
//
// Ionian is The Ukulele Atlas: Book One — its scale boxes, its six triads
// (./bookOne) and Maps 1-3. Everything the book doesn't print (the 7th
// chords, Maps 4-5, the diminished triad, the other Theory scales) is built
// by the same rules (./positions, ./grips), so no shape is copied.

import {
  chordRootPc,
  flowGuitarCenterId,
  getGuitarCenter,
  registerUkuleleCenters,
} from '@/curriculum/data/guitar/centers';
import type {
  BookChordQuality,
  GuitarCenter,
  GuitarCenterId,
  GuitarChordShape,
  GuitarKeyName,
  GuitarMusicMap,
  GuitarScaleSlot,
  ScaleDegree,
} from '@/curriculum/data/guitar/types';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { UKULELE_ATLAS_BOOK_ONE } from './bookOne';
import { ukuleleGrip } from './grips';
import { ukuleleScaleBox } from './positions';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** A ukulele center: a GuitarCenter whose frets are a ukulele's. */
export type UkuleleCenter = GuitarCenter & { instrument: 'ukulele' };

function shapeFor(
  theory: GuitarCenter,
  pageKey: GuitarKeyName | undefined,
  degree: ScaleDegree,
  quality: BookChordQuality,
) {
  const grip = ukuleleGrip(chordRootPc(theory, degree), quality, pageKey);
  return {
    ...grip.shape,
    ...(grip.erratumId ? { erratumIds: [grip.erratumId] } : {}),
  };
}

function buildUkuleleCenter(id: GuitarCenterId): UkuleleCenter {
  const theory = getGuitarCenter(id);
  const { tonicPc, steps } = theory;
  // The book page whose triads a center plays: its own for Ionian, the
  // parent major key's for the other diatonic modes.
  const pageKey: GuitarKeyName | undefined =
    theory.family === 'diatonic' ? theory.parentKey : undefined;

  const pcsOf = (offsets: readonly number[], from = tonicPc) =>
    offsets.map((o) => mod12(from + o));
  const box = (slot: GuitarScaleSlot, pcs: readonly number[]) =>
    ukuleleScaleBox(slot, tonicPc, pcs);

  const majorScale = box('major', pcsOf(steps));
  const pentatonics = theory.pentatonics.map((p, i) => ({
    ...p,
    position: box(
      i === 0 ? 'pentatonic' : 'pentatonic2',
      p.degrees.map((d) => mod12(tonicPc + steps[d - 1])),
    ),
  }));
  const pentatonic = pentatonics[0]?.position ?? majorScale;

  const chordShapes = (shapes: readonly GuitarChordShape[]) =>
    shapes.map(
      (s): GuitarChordShape => ({
        degree: s.degree,
        quality: s.quality,
        ...shapeFor(theory, pageKey, s.degree, s.quality),
        ...(s.isOctaveRepeat ? { isOctaveRepeat: true as const } : {}),
      }),
    );
  const triads = chordShapes(theory.triads);
  const sevenths = chordShapes(theory.sevenths);

  // A map bar draws the same box as the chord pages, so a chord reads the
  // same everywhere.
  const known = [...triads, ...sevenths];
  const musicMaps: GuitarMusicMap[] = theory.musicMaps.map((map) => ({
    example: map.example,
    repeat: map.repeat,
    bars: map.bars.map((bar) => {
      const shape =
        known.find(
          (s) => s.degree === bar.degree && s.quality === bar.quality,
        ) ?? shapeFor(theory, pageKey, bar.degree, bar.quality);
      return {
        degree: bar.degree,
        quality: bar.quality,
        rhythm: bar.rhythm,
        frets: shape.frets,
        diagramStartFret: shape.diagramStartFret,
        fingering: shape.fingering,
        ...(shape.barre ? { barre: shape.barre } : {}),
        ...(shape.erratumIds ? { erratumIds: shape.erratumIds } : {}),
      };
    }),
  }));

  const book = UKULELE_ATLAS_BOOK_ONE[theory.key];
  const base = {
    ...theory,
    instrument: 'ukulele' as const,
    source: { pdfPages: [book.pdfPages.scale, book.pdfPages.maps] as const },
    majorScale,
    pentatonic,
    pentatonics,
    triads,
    sevenths,
    musicMaps,
  };
  if (theory.family === 'diatonic')
    return { ...base, family: 'diatonic' } as UkuleleCenter;
  return {
    ...base,
    family: theory.family,
    chords: chordShapes(theory.chords),
  } as UkuleleCenter;
}

const CENTERS = new Map<GuitarCenterId, UkuleleCenter>();

/** The ukulele center an id names, built once and kept (stable for memo deps). */
export function getUkuleleCenter(id: GuitarCenterId): UkuleleCenter {
  const cached = CENTERS.get(id);
  if (cached) return cached;
  const center = buildUkuleleCenter(id);
  CENTERS.set(id, center);
  return center;
}

registerUkuleleCenters(getUkuleleCenter);

/**
 * The center a ukulele flow plays. Ids are shared with guitar, and the flow
 * names its scale the same way, so this is guitar's rule on a ukulele flow.
 */
export function flowUkuleleCenterId(
  flow: Pick<ActivityFlowV2, 'params'>,
): GuitarCenterId {
  return flowGuitarCenterId({
    params: { ...flow.params, instrument: 'guitar' },
  });
}

/** Whether a center is a ukulele's. */
export function isUkuleleCenter(center: GuitarCenter): center is UkuleleCenter {
  return center.instrument === 'ukulele';
}
