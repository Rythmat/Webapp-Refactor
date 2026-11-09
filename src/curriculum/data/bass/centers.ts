// ── Bass key centers ──────────────────────────────────────────────────────
// A bass center is the guitar center of the same id (data/guitar/centers)
// with bass positions: the same scale, chords and Music Maps, drawn as the
// Bass Atlas draws them (./positions). Ionian is The Bass Atlas: Book One;
// every other Theory scale is built the same way, so they all share one
// builder and none is copied.

import {
  centerScaleName,
  chordRootPc,
  flowGuitarCenterId,
  getGuitarCenter,
} from '@/curriculum/data/guitar/centers';
import type {
  BookChordQuality,
  GuitarCenter,
  GuitarCenterId,
  GuitarChordShape,
  ScaleDegree,
} from '@/curriculum/data/guitar/types';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import {
  arpeggioPlayOrder,
  arpeggioRoot,
  bassPentatonicBox,
  bassScaleBox,
  boxOf,
  homeOf,
} from './positions';
import type {
  BassArpeggio,
  BassCenter,
  BassMusicMap,
  BassScaleBox,
} from './types';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

function arpeggio(
  theory: GuitarCenter,
  degree: ScaleDegree,
  quality: BookChordQuality,
  extra: Pick<BassArpeggio, 'isOctaveRepeat'> = {},
): BassArpeggio {
  const rootPc = chordRootPc(theory, degree);
  const root = arpeggioRoot(rootPc);
  return {
    ...boxOf(arpeggioPlayOrder(rootPc, quality, root)),
    degree,
    quality,
    rootPc,
    rootString: root.string,
    ...extra,
  };
}

const fromShapes = (
  theory: GuitarCenter,
  shapes: readonly GuitarChordShape[],
) =>
  shapes.map((s) =>
    arpeggio(
      theory,
      s.degree,
      s.quality,
      s.isOctaveRepeat ? { isOctaveRepeat: true } : {},
    ),
  );

function buildBassCenter(id: GuitarCenterId): BassCenter {
  const theory = getGuitarCenter(id);
  const { tonicPc, steps } = theory;
  const isPentatonicScale = theory.family === 'pentatonic-blues';

  const scale: BassScaleBox = {
    ...(isPentatonicScale
      ? bassPentatonicBox(tonicPc, steps)
      : bassScaleBox(tonicPc, steps)),
    name: centerScaleName(theory, 'major'),
    tonicPc,
  };

  const pentatonics: BassScaleBox[] = theory.pentatonics.map((p) => {
    const first = steps[p.degrees[0] - 1];
    const offsets = p.degrees
      .map((d) => mod12(steps[d - 1] - first))
      .sort((a, b) => a - b);
    const firstPc = mod12(tonicPc + first);
    return {
      ...bassPentatonicBox(firstPc, offsets),
      name: p.name,
      tonicPc: firstPc,
    };
  });

  // One box per chord a map bar names, so a chord reads the same everywhere.
  const known = [
    ...fromShapes(theory, theory.triads),
    ...fromShapes(theory, theory.sevenths),
  ];
  const boxFor = (degree: ScaleDegree, quality: BookChordQuality) =>
    known.find((a) => a.degree === degree && a.quality === quality) ??
    arpeggio(theory, degree, quality);

  const musicMaps: BassMusicMap[] = theory.musicMaps.map((map) => ({
    example: map.example,
    repeat: map.repeat,
    bars: map.bars.map((bar) => ({
      degree: bar.degree,
      quality: bar.quality,
      rhythm: bar.rhythm,
      arpeggio: boxFor(bar.degree, bar.quality),
    })),
  }));

  return {
    id,
    theory,
    home: homeOf(tonicPc),
    scale,
    pentatonics,
    triads: fromShapes(theory, theory.triads),
    sevenths: fromShapes(theory, theory.sevenths),
    chords:
      theory.family === 'diatonic' ? [] : fromShapes(theory, theory.chords),
    musicMaps,
  };
}

const CENTERS = new Map<GuitarCenterId, BassCenter>();

/** The bass center an id names, built once and kept (stable for memo deps). */
export function getBassCenter(id: GuitarCenterId): BassCenter {
  const cached = CENTERS.get(id);
  if (cached) return cached;
  const center = buildBassCenter(id);
  CENTERS.set(id, center);
  return center;
}

/**
 * The center a bass flow plays. Ids are shared with guitar, and the flow
 * names its scale the same way, so this is guitar's rule on a bass flow.
 */
export function flowBassCenterId(
  flow: Pick<ActivityFlowV2, 'params'>,
): GuitarCenterId {
  return flowGuitarCenterId({
    params: { ...flow.params, instrument: 'guitar' },
  });
}

// ── Box ids ───────────────────────────────────────────────────────────────
// Stable ids a lesson step can carry, as guitar's shape ids:
// 'C/triad/1', 'D:dorian/seventh/8', 'A:minorblues/chord/2', 'C/map/4/2'.

export type BassArpeggioKind = 'triad' | 'seventh' | 'chord';

export function bassArpeggioId(
  center: BassCenter,
  kind: BassArpeggioKind,
  index: number,
): string {
  return `${center.id}/${kind}/${index}`;
}

export function bassMapBarId(
  center: BassCenter,
  example: number,
  bar: number,
): string {
  return `${center.id}/map/${example}/${bar}`;
}

/** The arpeggio box an id names, or undefined. */
export function getBassArpeggio(id: string): BassArpeggio | undefined {
  const [centerPart, kind, a, b] = id.split('/');
  let center: BassCenter;
  try {
    center = getBassCenter(centerPart as GuitarCenterId);
  } catch {
    return undefined;
  }
  const i = Number(a) - 1;
  if (kind === 'triad') return center.triads[i];
  if (kind === 'seventh') return center.sevenths[i];
  if (kind === 'chord') return center.chords[i];
  if (kind === 'map') {
    return center.musicMaps[i]?.bars[Number(b) - 1]?.arpeggio;
  }
  return undefined;
}
