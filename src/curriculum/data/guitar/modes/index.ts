// ── Guitar modes: key centers ─────────────────────────────────────────────
// A key center for each mode on each Book One key, built from the parent
// major key's Book One material (chords.ts), positions drawn by Book One's
// own rules (positions.ts) and the mode tables. Built on demand and cached
// by getGuitarCenter (centers.ts), which is how everything else reads them.

import {
  formatNoteName,
  spellScale,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { GUITAR_ATLAS_BOOK_ONE, keyPitchClass } from '../bookOne';
import type {
  GuitarCenter,
  GuitarChordShape,
  GuitarKeyName,
  GuitarModalMode,
  GuitarMusicMap,
  GuitarPentatonic,
} from '../types';
import {
  modeSevenths,
  modeTriads,
  parentDegreeOf,
  parentKeyOf,
} from './chords';
import { GUITAR_MODE_NAME } from './modeNames';
import { MODE_PENTATONICS, MODE_STEPS } from './modeTables';
import { MODE_MUSIC_MAPS } from './musicMapTemplates';
import { pentatonicPosition, scalePosition } from './positions';

export * from './modeNames';
export * from './modeTables';
export { diminishedTriadShape, parentDegreeOf, parentKeyOf } from './chords';
export { pentatonicPosition, scalePosition } from './positions';
export { MODE_MUSIC_MAPS } from './musicMapTemplates';

/**
 * The mode's Music Maps: its progressions (musicMapTemplates.ts) voiced with
 * its own triads (Examples 1-3) and 7th chords (4-5), in the rhythms of the
 * same key's Book One maps.
 */
function buildMusicMaps(
  key: GuitarKeyName,
  mode: GuitarModalMode,
  triads: readonly GuitarChordShape[],
  sevenths: readonly GuitarChordShape[],
): GuitarMusicMap[] {
  const book = GUITAR_ATLAS_BOOK_ONE[key].musicMaps;
  return MODE_MUSIC_MAPS[mode].map((degrees, i) => {
    const example = (i + 1) as GuitarMusicMap['example'];
    const chords = example <= 3 ? triads : sevenths;
    return {
      example,
      repeat: true,
      bars: degrees.map((degree, b) => {
        const shape = chords[degree - 1];
        return {
          degree,
          quality: shape.quality,
          frets: shape.frets,
          diagramStartFret: shape.diagramStartFret,
          fingering: shape.fingering,
          ...(shape.barre ? { barre: shape.barre } : {}),
          rhythm: book[i].bars[b].rhythm,
        };
      }),
    };
  });
}

/** The key center of `mode` on Book One's `key`, e.g. D Dorian. */
export function buildModeCenter(
  key: GuitarKeyName,
  mode: GuitarModalMode,
): GuitarCenter {
  const steps = MODE_STEPS[mode];
  const tonicPc = keyPitchClass(key);
  const spelled = spellScale(key, [...steps]);
  if (!spelled) throw new Error(`Cannot spell ${key} ${mode}`);
  const spelling = spelled.map((n) => formatNoteName(n, 'ascii'));
  const parentKey = parentKeyOf(tonicPc, mode);
  const parent = GUITAR_ATLAS_BOOK_ONE[parentKey];
  const triads = modeTriads(parent, mode);
  const sevenths = modeSevenths(parent, mode);
  const pentatonics: GuitarPentatonic[] = MODE_PENTATONICS[mode].map(
    (spec, i) => ({
      name: spec.name,
      degrees: spec.degrees,
      position: pentatonicPosition(
        tonicPc,
        steps,
        spec.degrees,
        i === 0 ? 'pentatonic' : 'pentatonic2',
      ),
      notes: spec.degrees.map((d) => spelling[d - 1]),
    }),
  );
  const displayName = GUITAR_ATLAS_BOOK_ONE[key].displayName;
  return {
    id: `${key}:${mode}`,
    key,
    mode,
    displayName,
    source: parent.source,
    signatureText: `${displayName} ${GUITAR_MODE_NAME[mode]} uses the notes of ${parent.displayName} major.`,
    tonicPc,
    steps,
    spelling,
    parentKey,
    parentDegree: parentDegreeOf(mode, 1),
    scaleNotes: spelling,
    pentatonicNotes: pentatonics[0].notes,
    majorScale: scalePosition(tonicPc, steps),
    pentatonic: pentatonics[0].position,
    pentatonics,
    triads,
    sevenths,
    musicMaps: buildMusicMaps(key, mode, triads, sevenths),
  };
}
