import { beforeEach, describe, expect, it } from 'vitest';
import {
  fakeAudioGraph,
  type FakeNode,
} from '@/daw/audio/__tests__/fakeAudioGraph';
import { DelayPedal } from '@/daw/audio/pedals/DelayPedal';

function insides(pedal: DelayPedal) {
  return pedal as unknown as {
    inputNode: FakeNode;
    outputNode: FakeNode;
    bypassNode: FakeNode;
    delay: FakeNode;
    feedback: FakeNode;
    dryGain: FakeNode;
    wetGain: FakeNode;
  };
}

let graph: ReturnType<typeof fakeAudioGraph>;

beforeEach(() => {
  graph = fakeAudioGraph();
});

describe('DelayPedal', () => {
  it('maps Time, Feedback and Mix onto the delay line', () => {
    const pedal = new DelayPedal(graph.ctx);

    pedal.updateParams({ time: 0.5, feedback: 1, mix: 0.25 });

    const n = insides(pedal);
    expect(n.delay.delayTime.value).toBe(0.5);
    expect(n.feedback.gain.value).toBe(0.9);
    expect(n.wetGain.gain.value).toBe(0.25);
    expect(n.dryGain.gain.value).toBe(0.75);
  });

  it('keeps the feedback loop below unity whatever value arrives', () => {
    const pedal = new DelayPedal(graph.ctx);
    pedal.updateParams({ feedback: 0.5 });

    pedal.updateParams({ feedback: 5 });
    expect(insides(pedal).feedback.gain.value).toBe(0.9);

    pedal.updateParams({ feedback: Number.NaN, time: Infinity });
    expect(insides(pedal).feedback.gain.value).toBe(0.9);
    expect(insides(pedal).delay.delayTime.value).toBe(0.4);
  });

  it('routes around the delay line while bypassed, and back', () => {
    const pedal = new DelayPedal(graph.ctx);
    const n = insides(pedal);
    graph.clearWiring();

    pedal.setEnabled(false);
    expect(n.inputNode.connect).toHaveBeenCalledWith(n.bypassNode);
    expect(n.inputNode.connect).not.toHaveBeenCalledWith(n.delay);

    graph.clearWiring();
    pedal.setEnabled(false);
    expect(graph.rewired()).toBe(false);

    pedal.setEnabled(true);
    expect(n.inputNode.connect).toHaveBeenCalledWith(n.delay);
    expect(n.wetGain.connect).toHaveBeenCalledWith(n.outputNode);
  });
});
