import { LFOWaveformBuilder } from '../../audio/LFOWaveformBuilder';
import { divToRepeats } from '../../audio/rateDivisions';
import type {
  LFONode,
  LFOParams,
  QuarterRates,
  RateDiv,
} from '../../audio/types';

// ── An LFO as a shape at a rate (the dock's LFO card) ──────────────────────
//
// The full synth draws an LFO point by point, bar by bar. The dock offers
// the common case: one shape repeating at one rate through all four bars,
// which it reads back from the bars when they match one (detectLfoShape)
// and calls 'Custom' when they don't.

export type LfoShape = 'sine' | 'triangle' | 'sawtooth' | 'ramp' | 'square';

export const LFO_SHAPES: { value: LfoShape; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sawtooth', label: 'Saw up' },
  { value: 'ramp', label: 'Saw down' },
  { value: 'square', label: 'Square' },
];

/** Rates of a cycle a bar or faster: a shape repeats whole in each bar. */
export const LFO_RATES: { value: RateDiv; label: string }[] = [
  { value: '1', label: '1 bar' },
  { value: '1/2', label: '1/2' },
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/16', label: '1/16' },
];

/** The bars and rates of `shape` repeating at `rate`. */
export function lfoPattern(
  shape: LfoShape,
  rate: RateDiv,
): Pick<LFOParams, 'bars' | 'rateDivs'> {
  const repeats = Math.max(1, Math.round(divToRepeats(rate)));
  const bar = () => LFOWaveformBuilder.presetNodes(shape, repeats);
  const quarters = (): QuarterRates => [rate, rate, rate, rate];
  return {
    bars: [bar(), bar(), bar(), bar()],
    rateDivs: [quarters(), quarters(), quarters(), quarters()],
  };
}

const sameNodes = (a: LFONode[], b: LFONode[]) =>
  a.length === b.length &&
  a.every(
    (n, i) =>
      Math.abs(n.time - b[i].time) < 1e-6 &&
      Math.abs(n.value - b[i].value) < 1e-6 &&
      (n.curve ?? 0) === (b[i].curve ?? 0),
  );

/** The shape and rate an LFO's bars are, or null for a drawn one. */
export function detectLfoShape(
  lfo: Pick<LFOParams, 'bars'>,
): { shape: LfoShape; rate: RateDiv } | null {
  for (const { value: rate } of LFO_RATES) {
    for (const { value: shape } of LFO_SHAPES) {
      const want = lfoPattern(shape, rate).bars[0];
      if (lfo.bars.every((bar) => sameNodes(bar, want))) return { shape, rate };
    }
  }
  return null;
}
