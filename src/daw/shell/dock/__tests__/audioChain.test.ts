/**
 * An audio track's chain holds one amp at a time: a pick swaps the amp
 * there, and a chain that arrives with more keeps its first.
 */
import { describe, expect, it } from 'vitest';
import { withAmp, withOneAmp } from '../audioChain';

const amp = (id: string, model: string | null = null) => ({
  id,
  type: 'nam-amp',
  namModelId: model,
});
const pitch = { id: 'p', type: 'pitch-correction' };
const make = () => amp('new');

describe('one amp at a time', () => {
  it('keeps the first amp of a chain that has more, in its slot', () => {
    const chain = [amp('a', 'm1'), pitch, amp('b', 'm2')];
    expect(withOneAmp(chain)).toEqual([amp('a', 'm1'), pitch]);
    expect(withOneAmp([pitch])).toEqual([pitch]);
  });

  it('adds an amp at the end when there is none', () => {
    expect(withAmp([pitch], 'm1', make)).toEqual([pitch, amp('new', 'm1')]);
  });

  it('swaps the model of the amp there instead of adding another', () => {
    const next = withAmp([amp('a', 'm1'), pitch], 'm2', make);
    expect(next).toEqual([amp('a', 'm2'), pitch]);
    expect(next.filter((b) => b.type === 'nam-amp')).toHaveLength(1);
  });

  it('never leaves two, whatever it starts from', () => {
    const next = withAmp([amp('a', 'm1'), amp('b', 'm2')], 'm3', make);
    expect(next).toEqual([amp('a', 'm3')]);
  });
});
