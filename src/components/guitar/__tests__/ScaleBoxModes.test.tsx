// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { guitarVisualModel } from '@/curriculum/components/guitar/guitarVisualModel';
import { buildGuitarModeFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { getGuitarCenter } from '@/curriculum/data/guitar/centers';
import { ScaleBox, keyNumberLabel } from '../ScaleBox';

// The modes on the scale box: a mode's name keeps its capital in the lesson
// title, and Locrian's 6 semitones read ♭5, not ♯4.

afterEach(cleanup);

function scaleStep(key: string, mode: 'dorian' | 'locrian') {
  const flow = buildGuitarModeFlow(key, mode);
  return flow.sections[0].steps[0];
}

describe('ScaleBox in a mode', () => {
  it('keeps the mode’s capital in the lesson title', () => {
    const center = getGuitarCenter('D:dorian');
    const { container } = render(
      <ScaleBox
        playOrder={center.majorScale.playOrder}
        fretStart={center.majorScale.fretStart}
        fretEnd={center.majorScale.fretEnd}
        unusedStrings={center.majorScale.unusedStrings}
        name="D Dorian Scale"
        tonicPc={center.tonicPc}
        keyColor="#D2404A"
        variant="lesson"
      />,
    );
    expect(container.querySelector('[data-title]')?.textContent).toBe(
      'D Dorian scale',
    );
  });

  it('names Locrian’s fifth ♭5 in key numbers', () => {
    const locrian = guitarVisualModel(scaleStep('B', 'locrian'), 'B:locrian');
    expect(locrian.scale?.name).toBe('B Locrian Scale');
    expect(locrian.keyNumberLabels?.[6]).toBe('♭5');
    // F over B: the ♭5.
    expect(keyNumberLabel(65, 11, locrian.keyNumberLabels)).toBe('♭5');
    // Every other mode reads its degrees from the default labels.
    const dorian = guitarVisualModel(scaleStep('D', 'dorian'), 'D:dorian');
    expect(dorian.keyNumberLabels).toBeUndefined();
    expect(keyNumberLabel(65, 2)).toBe('♭3');
  });
});
