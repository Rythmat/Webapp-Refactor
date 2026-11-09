import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bassLessonVoice } from '../bassVoice';

const sampler = vi.hoisted(() => ({
  triggerAttackRelease: vi.fn(),
  releaseAll: vi.fn(),
}));
const createBassSampler = vi.hoisted(() => vi.fn(async () => sampler));
vi.mock('@/curriculum/engine/bassLines/bassSampler', () => ({
  createBassSampler,
}));
vi.mock('tone', () => ({
  getDestination: () => 'destination',
  now: () => 10,
  Frequency: (midi: number) => ({
    toNote: () => `m${midi}`,
  }),
}));

describe('the bass lesson voice', () => {
  beforeEach(() => {
    sampler.triggerAttackRelease.mockClear();
  });

  it('loads the electric bass samples once', async () => {
    await bassLessonVoice.load();
    await bassLessonVoice.load();
    expect(createBassSampler).toHaveBeenCalledTimes(1);
    expect(createBassSampler).toHaveBeenCalledWith('electric', 'destination');
  });

  it('plays one note, or rakes a chord low to high', async () => {
    await bassLessonVoice.load();
    bassLessonVoice.attackRelease(36, 0.5, 0.8, 2);
    expect(sampler.triggerAttackRelease).toHaveBeenCalledWith(
      'm36',
      0.5,
      2,
      0.8,
    );
    sampler.triggerAttackRelease.mockClear();
    bassLessonVoice.attackRelease([43, 36, 40], 1, 0.7, 5);
    expect(sampler.triggerAttackRelease.mock.calls.map((c) => c[0])).toEqual([
      'm36',
      'm40',
      'm43',
    ]);
    expect(sampler.triggerAttackRelease.mock.calls[2][2]).toBeCloseTo(5.18);
  });

  it('stops everything', async () => {
    await bassLessonVoice.load();
    bassLessonVoice.stop();
    expect(sampler.releaseAll).toHaveBeenCalled();
  });
});
