/**
 * The ukulele Theory lessons: guitar's lesson (guitarAppliedTheoryFundamentals)
 * played on ukulele centers (data/ukulele). Ionian is The Ukulele Atlas: Book
 * One — its scale boxes, triads and Music Maps 1-3 — with the 7th chords and
 * Maps 4-5 guitar's lesson adds; the other scales run on generated centers.
 *
 * Same sections, steps, words and timing as guitar. What differs is the
 * instrument (every pitch is fretToMidi(position, UKULELE), every chord
 * target's pitch classes come from the ukulele shape), the shape ids
 * ('ukulele:C/triad/1'), and the progress ids: module
 * applied_theory_ukulele_l1, tags 'ukulele_fund:…', genres from
 * UKULELE_THEORY_CATALOG ('ukulele-mode-dorian'; never rename one). Steps
 * keep guitar's `guitar` meta (key center + shape ids): the lesson resolves
 * it through the ukulele centers when the flow's instrument is 'ukulele'.
 */

import { UKULELE } from '@/lib/guitar/instrument';
import type { ActivityFlowV2 } from '../../types/activity.v2';
import type { GuitarMode, GuitarScaleKey } from '../guitar/types';
import { getUkuleleCenter } from '../ukulele/centers';
import { ukuleleScaleEntry } from '../ukulele/theoryCatalog';
import {
  buildFrettedModeFlow,
  buildFrettedScaleFlow,
  type FrettedFlowTarget,
} from './guitarAppliedTheoryFundamentals';

export const UKULELE_FLOW_TARGET: FrettedFlowTarget = {
  instrument: 'ukulele',
  inst: UKULELE,
  getCenter: getUkuleleCenter,
  module: 'applied_theory_ukulele_l1',
  tagPrefix: 'ukulele_fund',
  tagFamily: 'applied_theory_ukulele',
  modeGenre: (mode) => ukuleleScaleEntry(mode).genre,
  scaleGenre: (scale) => ukuleleScaleEntry(scale).genre,
  label: 'Ukulele',
};

/** The ukulele lesson of a diatonic mode in a key (falls back to C). */
export function buildUkuleleModeFlow(
  keyName: string,
  mode: GuitarMode,
): ActivityFlowV2 {
  return buildFrettedModeFlow(UKULELE_FLOW_TARGET, keyName, mode);
}

/** The ukulele lesson of any Theory scale in a key (falls back to C). */
export function buildUkuleleScaleFlow(
  keyName: string,
  scale: GuitarScaleKey,
): ActivityFlowV2 {
  return buildFrettedScaleFlow(UKULELE_FLOW_TARGET, keyName, scale);
}
