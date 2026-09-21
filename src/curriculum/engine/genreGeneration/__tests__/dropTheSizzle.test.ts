import { describe, expect, it } from 'vitest';
import { funkFlows } from '@/curriculum/data/activityFlows/funk_v2';
import { isSizzleResolution, sizzleTarget } from '../dropTheSizzle';
import { noteNameToPitchClass } from '../enharmonicEngine';

const PC = (name: string) => noteNameToPitchClass(name)!;

describe('sizzleTarget', () => {
  it('names the dominant a 4th up when the bass moves', () => {
    // Cm7 with B♭ → A over an F bass is F7, not Cm6.
    expect(sizzleTarget(PC('C'), PC('F'))).toEqual({
      rootPc: PC('F'),
      quality: 'dominant',
    });
    expect(sizzleTarget(PC('D'), PC('G'))).toEqual({
      rootPc: PC('G'),
      quality: 'dominant',
    });
  });

  it('names the minor 6 when the bass stays on the minor root', () => {
    // The Funk/African case: the groove holds the root and only the ♭7 moves.
    expect(sizzleTarget(PC('C'), PC('C'))).toEqual({
      rootPc: PC('C'),
      quality: 'minor6',
    });
    expect(sizzleTarget(PC('A'), PC('A'))).toEqual({
      rootPc: PC('A'),
      quality: 'minor6',
    });
  });

  it('defaults to the dominant when no bass is sounding', () => {
    // A rootless right-hand drill takes its name from the progression around it.
    expect(sizzleTarget(PC('C'), null)).toEqual({
      rootPc: PC('F'),
      quality: 'dominant',
    });
  });

  it('reads the bass by pitch class, whatever octave it is in', () => {
    expect(sizzleTarget(PC('C'), PC('C') + 24)).toEqual({
      rootPc: PC('C'),
      quality: 'minor6',
    });
  });

  it('wraps around the octave', () => {
    // Gm7 → C7: the 4th above G is C, not "G+5" off the end of the scale.
    expect(sizzleTarget(PC('G'), null).rootPc).toBe(PC('C'));
    expect(sizzleTarget(PC('Bb'), null).rootPc).toBe(PC('Eb'));
  });
});

describe('the curriculum labels its Sizzle steps by the rule', () => {
  // Guards the authored data: a future Sizzle step labelled with the wrong
  // landing chord fails here rather than reaching a student's staff.
  const MINOR = /^([A-G][b#]?)(m|min)(?!aj)/;
  const LANDS_MINOR6 = /^([A-G][b#]?)(m|min)(6|13)$/;
  const LANDS_DOM = /^([A-G][b#]?)(7|9|13|dom)/;

  it('every Sizzle pair resolves as the rule says', () => {
    const checked: string[] = [];
    for (const flow of funkFlows) {
      for (const section of flow.sections) {
        for (const step of section.steps) {
          const blob = [
            step.activity,
            step.successFeedback ?? '',
            step.contentGeneration ?? '',
            step.tag ?? '',
          ].join(' ');
          if (!/sizzle/i.test(blob)) continue;
          const symbols = step.chordSymbols;
          if (!symbols || symbols.length < 2) continue;

          // Find a minor chord followed by a different chord — the resolution.
          for (let i = 0; i < symbols.length - 1; i++) {
            const from = MINOR.exec(symbols[i]);
            if (!from) continue;
            const to = symbols[i + 1];
            if (to === symbols[i]) continue;

            const minor6 = LANDS_MINOR6.exec(to);
            const dom = LANDS_DOM.exec(to);
            const landingRoot = minor6?.[1] ?? dom?.[1];
            if (!landingRoot) continue;

            checked.push(`${symbols[i]}->${to}`);
            expect(
              isSizzleResolution(PC(from[1]), PC(landingRoot), Boolean(minor6)),
              `${flow.genre} L${flow.level} ${step.activity}: ${symbols[i]} → ${to}`,
            ).toBe(true);
          }
        }
      }
    }
    // The audit is only meaningful if it actually found the Sizzle steps.
    expect(checked.length).toBeGreaterThan(0);
    // G7 and G9 are both dominants on G — the voicing picks the extension,
    // the rule only fixes the root.
    expect(new Set(checked)).toEqual(
      new Set(['Dm7->G7', 'Dm7->G9', 'Am9->D13', 'Cm9->F13']),
    );
  });
});
