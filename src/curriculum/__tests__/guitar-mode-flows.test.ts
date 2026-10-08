/**
 * The guitar mode lessons (Dorian … Locrian) in all twelve keys: each plays
 * its own scale, pentatonics and chords, every shape resolves, and every
 * chord name reads back as the chord that sounds.
 */

import { describe, expect, it } from 'vitest';
import {
  buildGuitarModeFlow,
  guitarModeGenre,
} from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { GUITAR_KEY_ORDER } from '@/curriculum/data/guitar/bookOne';
import {
  centerId,
  centerScalePosition,
  flowGuitarCenterId,
  getGuitarCenter,
  getGuitarShape,
} from '@/curriculum/data/guitar/centers';
import {
  COLOUR_CHORD,
  GUITAR_MODES,
  isGuitarModalMode,
} from '@/curriculum/data/guitar/modes';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { chordPcs } from '@/learn/audio/guitar/chordIdentity';
import { fretToMidi, shapePitchClasses } from '@/lib/guitar/fretboard';

const MODAL = GUITAR_MODES.filter(isGuitarModalMode);
const sorted = (pcs: Iterable<number>) =>
  [...new Set(pcs)].sort((a, b) => a - b);

describe('guitar mode lessons', () => {
  for (const mode of MODAL) {
    describe(mode, () => {
      it.each(GUITAR_KEY_ORDER)('builds the %s lesson', (key) => {
        const flow = buildGuitarModeFlow(key, mode);
        const center = getGuitarCenter(centerId(key, mode));
        const steps = flow.sections.flatMap((s) => s.steps);
        const scale = new Set(
          center.steps.map((s) => (center.tonicPc + s) % 12),
        );

        expect(flow.genre).toBe(guitarModeGenre(mode));
        expect(flow.genre).toBe(`guitar-mode-${mode}`);
        expect(flow.params.defaultScaleId).toBe(mode);
        expect(flow.params.defaultScale).toEqual([...center.steps]);
        expect(flowGuitarCenterId(flow)).toBe(center.id);
        expect(flow.sections.map((s) => [s.id, s.steps.length])).toEqual([
          ['A', 14 + 6 * center.pentatonics.length],
          ['B', 48],
          ['D', 9],
        ]);
        expect(new Set(steps.map((s) => s.tag)).size).toBe(steps.length);
        expect(steps.map((s) => s.stepNumber)).toEqual(
          steps.map((_, i) => i + 1),
        );

        for (const step of steps) {
          const label = `${key} ${mode} ${step.activity}`;
          expect(step.guitar?.keyCenter, label).toBe(center.id);
          for (const note of step.targetNotes ?? []) {
            expect(note.midi, label).toBe(fretToMidi(note.fretPosition!));
          }

          const slot = step.guitar?.scalePosition;
          if (slot) {
            const allowed = new Set(
              centerScalePosition(center, slot).playOrder.map(
                (p) => fretToMidi(p) % 12,
              ),
            );
            for (const note of step.targetNotes ?? []) {
              expect(allowed.has(note.midi % 12), label).toBe(true);
              expect(scale.has(note.midi % 12), label).toBe(true);
            }
          }

          for (const target of step.chordTargets ?? []) {
            const shape = getGuitarShape(target.shapeId);
            expect(shape, `${label} ${target.shapeId}`).toBeDefined();
            const pcs = shapePitchClasses(shape!.frets);
            expect(sorted(target.pitchClasses)).toEqual(sorted(pcs));
            expect(
              pcs.every((pc) => scale.has(pc)),
              label,
            ).toBe(true);
            expect(sorted(pcs), label).toEqual(
              sorted(chordPcs(target.rootPc, target.quality)),
            );
            expect(target.bassPc).toBe(target.rootPc);
            // The name reads back as the chord that sounds.
            const read = chordSymbolTones(target.symbol);
            expect(read?.rootPc, `${label} ${target.symbol}`).toBe(
              target.rootPc,
            );
            expect(
              sorted(read!.intervals.map((i) => (i + target.rootPc) % 12)),
            ).toEqual(sorted(pcs));
          }
          for (const id of step.guitar?.shapeIds ?? []) {
            expect(getGuitarShape(id), `${label} ${id}`).toBeDefined();
          }
        }
      });
    });
  }

  it('names the chapters for the mode', () => {
    const flow = buildGuitarModeFlow('D', 'dorian');
    const subsections = [
      ...new Set(
        flow.sections.flatMap((s) => s.steps.map((t) => t.subsection)),
      ),
    ];
    expect(subsections).toEqual([
      'A1: Dorian Scale',
      'A2: Melody',
      'A3: Melody Articulation',
      'A4: Dorian Pentatonic (1 ♭3 4 5 6)',
      'A5: Dorian Pentatonic (1 2 ♭3 5 6)',
      'B1: Arpeggiate Chords (Triads)',
      'B2: Play Chord (Triads)',
      'B3: Chord Articulations',
      'B4: Play Chord Progressions',
      'B5: Arpeggiate Chords 5, 6 and 7 (Triads)',
      'B6: Play Chords 1-7 (Triads)',
      'B7: Arpeggiate 7th Chords',
      'B8: Play 7th Chords',
      'D1: Melody with Play Along',
      'D2: Chords with Play Along',
      'D3: Music Maps',
    ]);
    expect(flow.title).toBe('Dorian — Guitar');
    expect(flow.params.defaultKey).toBe('D Dorian');
  });

  it('plays D Dorian with C major’s chords', () => {
    const flow = buildGuitarModeFlow('D', 'dorian');
    const b6 = flow.sections[1].steps.find((s) =>
      s.activity.startsWith('B6.1'),
    );
    expect(b6?.chordSymbols).toEqual(['Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'C']);
    // The two-chord drills pair 1 with the chord carrying the colour note.
    const b3 = flow.sections[1].steps.find((s) =>
      s.activity.startsWith('B3.1'),
    );
    expect(b3?.chordSymbols).toEqual(['Dm', 'G']);
    expect(COLOUR_CHORD.dorian).toBe(4);
  });

  it('spells chords with double flats where the key does', () => {
    const flow = buildGuitarModeFlow('Db', 'locrian');
    const b6 = flow.sections[1].steps.find((s) =>
      s.activity.startsWith('B6.1'),
    );
    expect(b6?.chordSymbols).toEqual([
      'Dbdim',
      'Ebb',
      'Fbm',
      'Gbm',
      'Abb',
      'Bbb',
      'Cbm',
    ]);
  });

  it('opens Lydian’s pentatonic on its 2', () => {
    const flow = buildGuitarModeFlow('C', 'lydian');
    const a4 = flow.sections[0].steps.find((s) =>
      s.activity.startsWith('A4.1'),
    );
    expect(a4?.subsection).toBe(
      'A4: Lydian Pentatonic (Major Pentatonic from 2)',
    );
    expect(a4!.targetNotes![0].midi % 12).toBe(2); // D
  });
});
