/**
 * The rest of Theory on guitar: every scale outside the diatonic modes, in
 * every book key. Each center's position must be playable and in the scale,
 * every chord box a comfortable grip guitarists use (Drop 2 for four-note
 * chords, a four-string grip for triads) with its root in the bass, and every
 * lesson step must ask for notes and chords that are really there.
 */

import { describe, expect, it } from 'vitest';
import { buildGuitarScaleFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { GUITAR_KEY_ORDER } from '@/curriculum/data/guitar/bookOne';
import {
  centerId,
  chordRootPc,
  diatonicSevenths,
  diatonicTriads,
  getGuitarCenter,
  getGuitarShape,
} from '@/curriculum/data/guitar/centers';
import { isComfortablePosition } from '@/curriculum/data/guitar/modes';
import {
  COLOUR,
  FAMILY_MODES,
  SCALE_MUSIC_MAPS,
  scaleSteps,
} from '@/curriculum/data/guitar/scales';
import { GUITAR_THEORY_CATALOG } from '@/curriculum/data/guitar/theoryCatalog';
import type {
  ExtendedGuitarCenter,
  GuitarExtendedScale,
  GuitarHeptatonicScale,
  GuitarPentatonicScale,
  ScaleDegree,
} from '@/curriculum/data/guitar/types';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { chordPcs } from '@/learn/audio/guitar/chordIdentity';
import {
  fretToMidi,
  shapeNotes,
  shapePitchClasses,
} from '@/lib/guitar/fretboard';
import { isTriadQuality } from '@/lib/guitar/theory/chordTones';
import { gripProblems } from '@/lib/guitar/theory/grips';
import { classifyVoicing } from '@/lib/guitar/theory/voicing';
import { SCALE_LESSONS } from '@/lib/learn/scaleLessons';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const sorted = (pcs: Iterable<number>) =>
  [...new Set(pcs)].sort((a, b) => a - b);

const EXTENDED = GUITAR_THEORY_CATALOG.filter(
  (e) => e.family !== 'diatonic',
).map((e) => e.key as GuitarExtendedScale);
const HEPTATONIC = Object.values(FAMILY_MODES).flat();
const PENTATONIC = Object.keys(SCALE_MUSIC_MAPS) as GuitarPentatonicScale[];

function extended(key: string, scale: GuitarExtendedScale) {
  const center = getGuitarCenter(
    centerId(key as never, scale),
  ) as ExtendedGuitarCenter;
  expect(center.family).not.toBe('diatonic');
  return center;
}

/** Every chord box a center draws: its pages and its maps. */
function boxes(center: ExtendedGuitarCenter) {
  return [
    ...center.triads,
    ...center.sevenths,
    ...center.chords,
    ...center.musicMaps.flatMap((m) => m.bars),
  ];
}

describe('the rest of Theory: tables', () => {
  it('has 32 scales, each family the rotations of its first mode', () => {
    expect(EXTENDED).toHaveLength(32);
    for (const modes of Object.values(FAMILY_MODES)) {
      const first = scaleSteps(modes[0]);
      modes.forEach((mode, i) => {
        const rotated = first.map((_, j) =>
          mod12(first[(i + j) % 7] - first[i]),
        );
        expect(scaleSteps(mode), mode).toEqual(rotated);
      });
    }
  });

  it('vamps on a major or minor chord that carries the colour note', () => {
    for (const scale of HEPTATONIC) {
      const center = extended('C', scale);
      const { note, chord, answer } = COLOUR[scale];
      const triads = diatonicTriads(center);
      expect(['maj', 'min'], scale).toContain(triads[chord - 1]);
      expect(['maj', 'min'], scale).toContain(triads[answer - 1]);
      const colourPc = mod12(center.tonicPc + center.steps[note - 1]);
      const steps = center.chordSteps;
      const chordPcsOf = (d: number) =>
        [0, 2, 4].map((skip) =>
          mod12(center.tonicPc + steps[(d - 1 + skip) % 7]),
        );
      expect(chordPcsOf(chord), scale).toContain(colourPc);
    }
  });
});

describe('the rest of Theory: key centers', () => {
  for (const scale of EXTENDED) {
    it(`builds ${scale} in every key, playable`, () => {
      for (const key of GUITAR_KEY_ORDER) {
        const center = extended(key, scale);
        const label = `${key} ${scale}`;

        // The scale position: one octave, tonic to tonic, in the scale.
        const position = center.majorScale;
        expect(isComfortablePosition(position), label).toBe(true);
        const midis = position.playOrder.map(fretToMidi);
        expect(midis).toEqual([...midis].sort((a, b) => a - b));
        expect(midis[midis.length - 1] - midis[0]).toBe(12);
        expect(mod12(midis[0])).toBe(center.tonicPc);
        expect(sorted(midis.map(mod12))).toEqual(
          sorted(center.steps.map((s) => mod12(center.tonicPc + s))),
        );
        expect(center.spelling).toHaveLength(center.steps.length);
        expect(center.degreeLabels).toHaveLength(center.steps.length);

        // Every chord box: a comfortable grip of the chord it names.
        for (const box of boxes(center)) {
          const rootPc = chordRootPc(center, box.degree as ScaleDegree);
          expect(gripProblems(box, rootPc, box.quality), label).toEqual([]);
          const voicing = classifyVoicing(box, rootPc, box.quality);
          expect(voicing.family, `${label} ${box.quality}`).toBe(
            isTriadQuality(box.quality)
              ? `root${voicing.rootString}-four-string`
              : 'drop2',
          );
          expect(sorted(shapePitchClasses(box.frets))).toEqual(
            sorted(chordPcs(rootPc, ENGINE[box.quality])),
          );
        }
      }
    });
  }

  it('builds every seven-note mode’s chords from its own notes', () => {
    for (const scale of HEPTATONIC) {
      for (const key of GUITAR_KEY_ORDER) {
        const center = extended(key, scale);
        expect(center.triads.map((t) => t.quality)).toEqual(
          diatonicTriads(center),
        );
        expect(center.sevenths.slice(0, 7).map((t) => t.quality)).toEqual(
          diatonicSevenths(center),
        );
        expect(center.sevenths[7]).toEqual(center.sevenths[0]);
        const scalePcs = new Set(
          center.steps.map((s) => mod12(center.tonicPc + s)),
        );
        for (const box of [...center.triads, ...center.sevenths]) {
          expect(
            shapePitchClasses(box.frets).every((pc) => scalePcs.has(pc)),
          ).toBe(true);
        }
      }
    }
  });

  it('spells the scales from their formulas', () => {
    expect(extended('C', 'minorblues').spelling).toEqual([
      'C',
      'Eb',
      'F',
      'F#',
      'G',
      'Bb',
    ]);
    expect(extended('C', 'minorblues').degreeLabels).toEqual([
      '1',
      '♭3',
      '4',
      '♯4',
      '5',
      '♭7',
    ]);
    expect(extended('E', 'phrygiandominant').spelling).toEqual([
      'E',
      'F',
      'G#',
      'A',
      'B',
      'C',
      'D',
    ]);
    expect(extended('C', 'locriandoubleflat3doubleflat7').degreeLabels).toEqual(
      ['1', '♭2', '𝄫3', '4', '♭5', '♭6', '𝄫7'],
    );
    const parent = extended('D', 'locriannat6').familyParent;
    expect(parent).toMatchObject({
      scale: 'harmonicminor',
      tonic: 'C',
      tonicPc: 0,
      degree: 2,
    });
  });
});

const ENGINE: Record<string, string> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  majb5: 'majorb5',
  sus2b5: 'sus2b5',
  maj7: 'major7',
  min7: 'minor7',
  dom7: 'dominant7',
  min7b5: 'minor7b5',
  dim7: 'diminished7',
  minMaj7: 'minormajor7',
  'maj7#5': 'major7#5',
  dom7b5: 'dominant7b5',
  min6: 'minor6',
  sus2b5add6: 'sus2b5add6',
};

describe('the rest of Theory: lessons', () => {
  for (const scale of EXTENDED) {
    it(`builds the ${scale} lesson in every key`, () => {
      const pentatonic = scale in SCALE_LESSONS;
      for (const key of GUITAR_KEY_ORDER) {
        const flow = buildGuitarScaleFlow(key, scale);
        const center = extended(key, scale);
        const label = `${key} ${scale}`;
        expect(flow.params.instrument).toBe('guitar');
        expect(flow.params.defaultScaleId).toBe(scale);
        expect(flow.sections.map((s) => [s.id, s.steps.length])).toEqual(
          pentatonic
            ? [
                ['A', 14],
                ['D', 9],
              ]
            : [
                ['A', 14],
                ['B', 48],
                ['D', 9],
              ],
        );
        const steps = flow.sections.flatMap((s) => s.steps);
        expect(new Set(steps.map((s) => s.tag)).size).toBe(steps.length);
        expect(steps.map((s) => s.stepNumber)).toEqual(
          steps.map((_, i) => i + 1),
        );

        const scalePcs = new Set(
          center.steps.map((s) => mod12(center.tonicPc + s)),
        );
        for (const step of steps) {
          expect(step.guitar?.keyCenter).toBe(center.id);
          if (!step.chordTargets?.length) {
            for (const n of step.targetNotes ?? []) {
              expect(
                scalePcs.has(mod12(n.midi)),
                `${label} ${step.activity}`,
              ).toBe(true);
            }
          }
          for (const target of step.chordTargets ?? []) {
            const shape = getGuitarShape(target.shapeId!);
            expect(shape, target.shapeId).toBeDefined();
            expect(sorted(target.pitchClasses)).toEqual(
              sorted(chordPcs(target.rootPc, target.quality)),
            );
            expect(target.bassPc).toBe(target.rootPc);
            const read = chordSymbolTones(target.symbol);
            expect(read?.rootPc, target.symbol).toBe(target.rootPc);
            expect(
              sorted(
                (read?.intervals ?? []).map((i) => mod12(i + target.rootPc)),
              ),
              target.symbol,
            ).toEqual(sorted(target.pitchClasses));
          }
        }
        expect(flow.params.practiceTrack?.chords?.length).toBeGreaterThan(0);
      }
    });
  }

  it('plays each pentatonic/blues progression in D2 and Example 4', () => {
    for (const scale of PENTATONIC) {
      const flow = buildGuitarScaleFlow('C', scale);
      const center = extended('C', scale);
      const d = flow.sections.find((s) => s.id === 'D')!.steps;
      const progression = d.find((s) => s.activity.startsWith('D2.2'))!;
      const example4 = center.musicMaps[3].bars.map((b) => [
        b.degree,
        b.quality,
      ]);
      const chords = progression.chordTargets!.map((t) => {
        const shape = getGuitarShape(t.shapeId!)!;
        return [shape.degree, shape.quality];
      });
      expect(chords, scale).toEqual(example4);
      expect(flow.params.practiceTrack?.chords).toEqual(
        progression.chordSymbols,
      );
      expect(SCALE_LESSONS[scale].progression).toHaveLength(4);
    }
    expect(
      buildGuitarScaleFlow('C', 'minorblues').params.practiceTrack?.chords,
    ).toEqual(['C7', 'F7', 'C7', 'C7']);
    expect(
      buildGuitarScaleFlow('C', 'minorpentatonic').params.practiceTrack?.chords,
    ).toEqual(['Cm', 'Cm', 'Abmaj7', 'Abmaj7']);
  });

  it('keeps every D1 note on the beat, inside the progression', () => {
    for (const scale of PENTATONIC) {
      const d1 = buildGuitarScaleFlow('G', scale).sections[1].steps.slice(0, 2);
      for (const step of d1) {
        expect(step.backing_parts?.engine_generates).toContain('chords');
        expect(step.chordSymbols).toHaveLength(4);
        for (const n of step.targetNotes ?? []) {
          expect(n.onset % 480).toBe(0);
          expect(n.onset).toBeLessThan(4 * 1920);
        }
      }
    }
  });

  it('keeps chords on the strings a hand can reach from the scale box', () => {
    // Not a hard rule (a grip may sit an octave away when nothing closer
    // fits), but nearly every box sits within three frets of the scale.
    let near = 0;
    let all = 0;
    for (const scale of HEPTATONIC as GuitarHeptatonicScale[]) {
      for (const key of GUITAR_KEY_ORDER) {
        const center = extended(key, scale);
        const { fretStart, fretEnd } = center.majorScale;
        for (const box of [...center.triads, ...center.sevenths]) {
          const frets = shapeNotes(box.frets).map((n) => n.position.fret);
          const off =
            Math.max(0, fretStart - Math.min(...frets)) +
            Math.max(0, Math.max(...frets) - fretEnd);
          all++;
          if (off <= 3) near++;
        }
      }
    }
    expect(near / all).toBeGreaterThan(0.95);
  });
});
