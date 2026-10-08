// ── Chord-tone diagnostics (P6) ────────────────────────────────────────────
// Turns a missed or unclear chord take into one useful hint. The detector's
// label is not trusted on its own: its parsimony step can report the triad
// for a correctly played 7th, and pitch-class twins (Am7 = C6) can win on
// name. So the rules compare pitch-class sets and read the chroma before
// blaming a missing note. Rules run in order D1-D6 and the first match wins;
// D7 only adds a hint to a hit. No rule adds a failure path: `wrong` (D2, D6)
// only where the label already says the chord was missed, and everything
// else turns a miss into `unclear` or keeps it and adds a hint.

import { CHORDS } from '@prism/engine';
import type { BookChordQuality } from '@/curriculum/data/guitar/types';
import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  GUITAR_STANDARD_TUNING,
  shapeLowestMidi,
} from '@/lib/guitar/fretboard';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import {
  chordFormulaTones,
  chordSemitones,
  shapeTones,
  spellChordTones,
  toneLabelText,
} from './chordTones';
import type { ChordToneLabel, ChordToneRole } from './types';
import { classifyVoicing } from './voicing';

/** The chord the step asks for, as the book draws it. */
export interface DiagnosticTarget {
  /** Spelled in the key ('E#', 'Bb'): hint note names come from it. */
  rootName: string;
  quality: BookChordQuality;
  frets: string;
}

/** What the detector reported: a root and a key of @prism/engine's CHORDS. */
export interface DetectorLabel {
  rootPc: number;
  quality: string;
}

export interface DiagnosticInput {
  target: DiagnosticTarget;
  /**
   * Null when nothing was detected (or the quality is not in CHORDS): the
   * evaluator's own result stands.
   */
  label: DetectorLabel | null;
  /** getLastChroma(): 12 bins by pitch class, L2-normalised. */
  chroma?: ArrayLike<number> | null;
  /** Lowest confident pitch in the onset window (70-200 Hz), as MIDI. */
  bassMidi?: number | null;
}

export type DiagnosticStatus = 'hit' | 'wrong' | 'unclear';

export type DiagnosticHintId =
  | 'det.missing3'
  | 'det.missingToneOneString'
  | 'det.missingToneDoubled'
  | 'det.missing7'
  | 'det.missingRoot'
  | 'det.muteX'
  | 'det.bass'
  | 'det.unclearQuality';

export type DiagnosticRule = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6';

export interface ChordDiagnosis {
  /** The rule that decided; null when there was nothing to judge. */
  rule: DiagnosticRule | null;
  /** Null: keep the status the evaluator already gave. */
  status: DiagnosticStatus | null;
  hintId: DiagnosticHintId | null;
  /** Values for the hint's {tokens}. */
  tokens: Record<string, string | number>;
  /** Dots (or X markers) to ring on the ChordBox. */
  ringStrings: GuitarStringNumber[];
}

/** A missing tone counts as heard at this share of the other tones' median. */
export const PRESENT_RATIO = 0.35;
/**
 * The chroma is L2-normalised, so loudness is gone; when the chord's own
 * tones hold this little of it, the frame says too little to judge.
 */
export const MIN_CHORD_TONE_LEVEL = 0.1;

/** Which missing tone to name first. ♭5 only outranks the root in min7♭5 and dim. */
const MISSING_RANK: Readonly<Record<ChordToneRole, number>> = {
  third: 0,
  seventh: 1,
  fifth: 4,
  root: 3,
};
const FLAT_FIVE_RANK = 2;

const SEVENTH_QUALITIES: readonly BookChordQuality[] = [
  'maj7',
  'dom7',
  'min7',
  'min7b5',
];
const POWER_AND_SUS = ['5', 'sus2', 'sus4'];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((pc) => b.includes(pc));
}

function outcome(
  rule: DiagnosticRule | null,
  status: DiagnosticStatus | null,
  hintId: DiagnosticHintId | null = null,
  tokens: Record<string, string | number> = {},
  ringStrings: GuitarStringNumber[] = [],
): ChordDiagnosis {
  return { rule, status, hintId, tokens, ringStrings };
}

export function diagnoseChord(input: DiagnosticInput): ChordDiagnosis {
  const { target, label, chroma, bassMidi } = input;
  const rootPc = noteNameToPitchClass(target.rootName);
  const tones = shapeTones(target.frets, target.rootName, target.quality);
  const intervals = label && CHORDS[label.quality];
  if (!label || !intervals || rootPc === null || !tones) {
    return outcome(null, null);
  }

  const voicing = classifyVoicing(target, rootPc, target.quality);
  const names = spellChordTones(target.rootName, target.quality);
  const formula = chordFormulaTones(target.quality);
  const targetPcs = chordSemitones(target.quality).map(
    (s) => (rootPc + s) % 12,
  );
  const pcOf = (role: ChordToneRole) =>
    targetPcs[formula.findIndex((t) => t.role === role)];
  const labelPcs = [...new Set(intervals.map((i) => mod12(label.rootPc + i)))];
  const missing = targetPcs.filter((pc) => !labelPcs.includes(pc));
  const extra = labelPcs.filter((pc) => !targetPcs.includes(pc));
  const sameRoot = label.rootPc === rootPc;
  const isSeventh = SEVENTH_QUALITIES.includes(target.quality);

  const level = (pcs: number[]) =>
    chroma ? median(pcs.map((p) => chroma[p])) : 0;
  /** Heard: at least PRESENT_RATIO of the median level of `others`. */
  const heard = (pc: number, others: number[]) =>
    !!chroma && chroma[pc] >= PRESENT_RATIO * level(others);
  const others = (...pcs: number[]) =>
    targetPcs.filter((p) => !pcs.includes(p));
  /** The tone's details for a hint: its spelling and the strings that carry it. */
  const toneAt = (pc: number) => {
    const i = targetPcs.indexOf(pc);
    const on = tones.filter((t) => t.label === formula[i].label);
    return {
      label: formula[i].label,
      note: names[i],
      strings: on.map((t) => t.string),
    };
  };

  const result = ((): ChordDiagnosis => {
    // D1: the label names the target's notes (covers Am7 = C6, Bm7♭5 = Dm6).
    if (sameSet(labelPcs, targetPcs)) return outcome('D1', 'hit');

    // D2: the detector's simpler same-root chord for a 7th — ask the chroma.
    if (
      isSeventh &&
      sameRoot &&
      labelPcs.length >= 3 &&
      labelPcs.length < targetPcs.length &&
      extra.length === 0
    ) {
      const rest = others(...missing);
      if (level(rest) < MIN_CHORD_TONE_LEVEL) return outcome('D2', 'unclear');
      if (missing.every((pc) => heard(pc, rest))) return outcome('D2', 'hit');
      const seventh = toneAt(pcOf('seventh'));
      return outcome(
        'D2',
        'wrong',
        'det.missing7',
        { note: seventh.note, string: seventh.strings[0] },
        seventh.strings,
      );
    }

    // D3: everything but the root.
    const rootless = isSeventh
      ? sameSet(labelPcs, others(rootPc))
      : !labelPcs.includes(rootPc) &&
        labelPcs.length - extra.length === 2 &&
        extra.length === 1 &&
        !heard(
          extra[0],
          labelPcs.filter((pc) => pc !== extra[0]),
        );
    if (rootless) {
      return outcome(
        'D3',
        'unclear',
        'det.missingRoot',
        { string: voicing.rootString },
        [voicing.rootString],
      );
    }

    // D4: root and 5 but neither third — major or minor can't be told.
    const third = toneAt(pcOf('third'));
    const fifth = pcOf('fifth');
    const noThird = others(pcOf('third'));
    const thirdsAbsent =
      !!chroma && [3, 4].every((s) => !heard((rootPc + s) % 12, noThird));
    const rootAndFifth =
      heard(rootPc, others(rootPc, pcOf('third'))) &&
      heard(fifth, others(fifth, pcOf('third')));
    if (
      sameRoot &&
      (POWER_AND_SUS.includes(label.quality) || (rootAndFifth && thirdsAbsent))
    ) {
      return rootAndFifth && thirdsAbsent
        ? outcome('D4', 'unclear', 'det.missing3', {}, third.strings)
        : outcome(
            'D4',
            'unclear',
            'det.unclearQuality',
            { string: third.strings[0] },
            third.strings,
          );
    }

    // D5: an open X string rang. The status stays whatever the evaluator said.
    const heardExtra = chroma
      ? [...Array(12).keys()].filter(
          (pc) => !targetPcs.includes(pc) && heard(pc, targetPcs),
        )
      : [];
    const ringingX = voicing.mutedStrings.filter((s) => {
      const pc = GUITAR_STANDARD_TUNING[s] % 12;
      return extra.includes(pc) || heardExtra.includes(pc);
    });
    if (ringingX.length > 0) {
      return outcome(
        'D5',
        null,
        'det.muteX',
        { string: ringingX[0] },
        ringingX,
      );
    }

    // D6: wrong — name the most telling missing tone.
    const rank = (pc: number) => {
      const role = formula[targetPcs.indexOf(pc)].role;
      return role === 'fifth' &&
        (target.quality === 'min7b5' || target.quality === 'dim')
        ? FLAT_FIVE_RANK
        : MISSING_RANK[role];
    };
    const top = [...missing].sort((a, b) => rank(a) - rank(b))[0];
    if (top === undefined) return outcome('D6', 'wrong');
    const tone = toneAt(top);
    const tokens = { tone: toneWord(tone.label), note: tone.note };
    // One string to name, or several dots to ring: by where the missing
    // tone sits in this shape, not by whether the shape doubles anything.
    return tone.strings.length <= 1
      ? outcome(
          'D6',
          'wrong',
          'det.missingToneOneString',
          { ...tokens, string: tone.strings[0] },
          tone.strings.slice(0, 1),
        )
      : outcome('D6', 'wrong', 'det.missingToneDoubled', tokens, tone.strings);
  })();

  // D7: a hit with a note below the shape — suggest where the strum starts.
  if (
    result.status === 'hit' &&
    !result.hintId &&
    bassMidi != null &&
    bassMidi < shapeLowestMidi(target.frets)
  ) {
    return {
      ...result,
      hintId: 'det.bass',
      tokens: { string: voicing.rootString },
      ringStrings: [voicing.rootString],
    };
  }
  return result;
}

/** How a hint names a tone: 'root', '3', '♭7'. */
function toneWord(label: ChordToneLabel): string {
  return label === 'R' ? 'root' : toneLabelText(label);
}
