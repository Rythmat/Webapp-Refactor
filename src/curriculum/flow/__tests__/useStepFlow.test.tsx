// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunModel } from '@/curriculum/guitar/layout/types';
import { setAutoFlow } from '@/learn/audio/practiceSettingsStore';
import { experienceApi } from '@/lib/experience/api';
import { announceXpGain, resetLearnXpForTests } from '@/lib/experience/learnXp';
import { useStepFlow, type PassPlan } from '../useStepFlow';

const makeRun = (over: Partial<RunModel> = {}): RunModel => ({
  state: 'preview',
  restartingPass: false,
  instruction: '',
  listen: { mode: 'waitForMe', passMarkPct: 75 },
  loading: false,
  demo: { playing: false, play: vi.fn(), stop: vi.fn() },
  practise: vi.fn(),
  playNow: vi.fn(),
  back: vi.fn(),
  stopTake: vi.fn(),
  hint: null,
  ...over,
});

const clicked = (hasBeenActive: boolean | undefined) =>
  Object.defineProperty(navigator, 'userActivation', {
    configurable: true,
    value: hasBeenActive === undefined ? undefined : { hasBeenActive },
  });

interface Props {
  run: RunModel;
  stepKey: string | null;
  paused?: boolean;
}

function setup(initial: RunModel, stepKey: string | null = 'a') {
  const initialProps: Props = { run: initial, stepKey };
  return renderHook((props: Props) => useStepFlow(props), { initialProps });
}

const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('an activity running itself', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clicked(true);
    setAutoFlow(true);
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('presses Demo, then Practice, then Perform, in turn', () => {
    const run = makeRun();
    const { result, rerender } = setup(run);
    expect(run.demo.play).not.toHaveBeenCalled();
    tick(400);
    expect(run.demo.play).toHaveBeenCalledTimes(1);

    const stepKey = 'a';
    const playing = { ...run, demo: { ...run.demo, playing: true } };
    rerender({ run: playing, stepKey });
    rerender({ run, stepKey });
    expect(result.current.transition).toBe('practice');
    tick(1400);
    expect(run.practise).toHaveBeenCalledTimes(1);
    expect(run.playNow).not.toHaveBeenCalled();

    rerender({
      run: { ...run, state: 'practice' },
      stepKey,
    });
    rerender({
      run: { ...run, lastPractice: { id: 1, heard: true } },
      stepKey,
    });
    expect(result.current.transition).toBe('perform');
    tick(1400);
    expect(run.playNow).toHaveBeenCalledTimes(1);
  });

  it('waits on a practice that heard nothing', () => {
    const run = makeRun();
    const { result, rerender } = setup(run);
    tick(400);
    const stepKey = 'a';
    rerender({
      run: { ...run, demo: { ...run.demo, playing: true } },
      stepKey,
    });
    rerender({ run, stepKey });
    tick(1400);
    rerender({
      run: { ...run, lastPractice: { id: 1, heard: false } },
      stepKey,
    });
    expect(result.current.held).toBe(true);
    tick(10_000);
    expect(run.playNow).not.toHaveBeenCalled();
  });

  it('stops running itself as soon as something’s pressed by hand', () => {
    const run = makeRun();
    const { result } = setup(run);
    tick(400);
    act(() => result.current.run.playNow());
    expect(run.playNow).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('off');
    tick(10_000);
    expect(run.practise).not.toHaveBeenCalled();
  });

  it('doesn’t set off the demos of steps being passed through', () => {
    const run = makeRun();
    const { rerender } = setup(run);
    tick(200);
    rerender({ run, stepKey: 'b' });
    tick(200);
    rerender({ run, stepKey: 'c' });
    tick(200);
    expect(run.demo.play).not.toHaveBeenCalled();
    tick(200);
    expect(run.demo.play).toHaveBeenCalledTimes(1);
  });

  it('starts nothing with no step, or while something’s open', () => {
    const run = makeRun();
    const { rerender } = setup(run, null);
    tick(2000);
    expect(run.demo.play).not.toHaveBeenCalled();
    rerender({ run, stepKey: 'a', paused: true });
    tick(2000);
    expect(run.demo.play).not.toHaveBeenCalled();
    rerender({ run, stepKey: 'a', paused: false });
    tick(400);
    expect(run.demo.play).toHaveBeenCalledTimes(1);
  });

  it('tries again when a dialog that was in the way has gone', () => {
    const run = makeRun();
    const { rerender, result } = setup(run);
    tick(400);
    act(() => result.current.skip());
    tick(1400);
    expect(run.practise).toHaveBeenCalledTimes(1);
    rerender({ run, stepKey: 'a', paused: true });
    rerender({ run, stepKey: 'a', paused: false });
    expect(run.practise).toHaveBeenCalledTimes(2);
  });

  it('waits for a press when sound can’t start yet, and Demo begins it', () => {
    clicked(false);
    const run = makeRun();
    const { result } = setup(run);
    expect(result.current.needsStart).toBe(true);
    tick(2000);
    expect(run.demo.play).not.toHaveBeenCalled();
    act(() => result.current.run.demo.play());
    expect(run.demo.play).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('demo');
  });

  it('leaves everything by hand with the setting off', () => {
    setAutoFlow(false);
    const run = makeRun();
    const { result } = setup(run);
    tick(5000);
    expect(result.current.available).toBe(false);
    expect(result.current.run).toBe(run);
    expect(run.demo.play).not.toHaveBeenCalled();
  });

  it('leaves everything by hand where it can’t tell if sound’s allowed', () => {
    clicked(undefined);
    const run = makeRun();
    const { result } = setup(run);
    tick(5000);
    expect(result.current.available).toBe(false);
    expect(run.demo.play).not.toHaveBeenCalled();
  });

  describe('when a take passes', () => {
    interface PassProps {
      run: RunModel;
      paused?: boolean;
      pass: PassPlan;
    }
    const passed = (run: RunModel, id = 1): RunModel => ({
      ...run,
      lastTake: { id, passed: true, heard: true },
    });
    const start = (run: RunModel, pass: PassPlan) =>
      renderHook(
        (props: PassProps) => useStepFlow({ ...props, stepKey: 'a' }),
        { initialProps: { run, pass } as PassProps },
      );
    afterEach(() => resetLearnXpForTests());

    it('shows it, then presses Next by itself', () => {
      const advance = vi.fn();
      const run = makeRun();
      const pass = { advance, nextLabel: 'Descending', score: '92%' };
      const { result, rerender } = start(run, pass);
      rerender({ run: passed(run), pass });
      expect(result.current.status).toBe('passed');
      expect(result.current.pass).toMatchObject({
        nextLabel: 'Descending',
        score: '92%',
        earned: 0,
      });
      tick(2199);
      expect(advance).not.toHaveBeenCalled();
      tick(1);
      expect(advance).toHaveBeenCalledTimes(1);
      expect(result.current.pass).toBeNull();
      tick(10_000);
      expect(advance).toHaveBeenCalledTimes(1);
    });

    it('adds up what the server grants while it’s up, and nothing after', () => {
      const advance = vi.fn();
      const run = makeRun();
      const pass = { advance };
      const { result, rerender } = start(run, pass);
      act(() => announceXpGain(1));
      rerender({ run: passed(run), pass });
      expect(result.current.pass?.earned).toBe(0);
      act(() => {
        announceXpGain(3);
        announceXpGain(5);
      });
      expect(result.current.pass?.earned).toBe(8);
      tick(2200);
      act(() => announceXpGain(4));
      rerender({ run: passed(run, 2), pass });
      expect(result.current.pass?.earned).toBe(0);
    });

    it('moves on from a take that was started by hand', () => {
      const advance = vi.fn();
      const run = makeRun();
      const pass = { advance };
      const { result, rerender } = start(run, pass);
      act(() => result.current.run.playNow());
      expect(result.current.status).toBe('off');
      rerender({ run: passed(run), pass });
      tick(2200);
      expect(advance).toHaveBeenCalledTimes(1);
    });

    it('stays, if asked, and goes now, if asked', () => {
      const advance = vi.fn();
      const run = makeRun();
      const pass = { advance };
      const { result, rerender } = start(run, pass);
      rerender({ run: passed(run), pass });
      act(() => result.current.passStay());
      expect(result.current.status).toBe('off');
      tick(10_000);
      expect(advance).not.toHaveBeenCalled();
      rerender({ run: passed(run, 2), pass });
      act(() => result.current.passNext());
      expect(advance).toHaveBeenCalledTimes(1);
      tick(10_000);
      expect(advance).toHaveBeenCalledTimes(1);
    });

    it('waits while something’s open', () => {
      const advance = vi.fn();
      const run = makeRun();
      const pass = { advance };
      const { rerender } = start(run, pass);
      rerender({ run: passed(run), pass, paused: true });
      tick(10_000);
      expect(advance).not.toHaveBeenCalled();
      rerender({ run: passed(run), pass, paused: false });
      tick(2200);
      expect(advance).toHaveBeenCalledTimes(1);
    });

    it('leaves a miss on screen', () => {
      const advance = vi.fn();
      const run = makeRun();
      const pass = { advance };
      const { result, rerender } = start(run, pass);
      rerender({
        run: { ...run, lastTake: { id: 1, passed: false, heard: true } },
        pass,
      });
      expect(result.current.pass).toBeNull();
      tick(10_000);
      expect(advance).not.toHaveBeenCalled();
    });

    it('does nothing by itself with the setting off', () => {
      setAutoFlow(false);
      const advance = vi.fn();
      const run = makeRun();
      const pass = { advance };
      const { result, rerender } = start(run, pass);
      rerender({ run: passed(run), pass });
      expect(result.current.pass).toBeNull();
      tick(10_000);
      expect(advance).not.toHaveBeenCalled();
    });

    it('moves on from a step that waits to be started', () => {
      const advance = vi.fn();
      const run = makeRun();
      const pass = { advance };
      const { result, rerender } = renderHook(
        (props: PassProps) =>
          useStepFlow({
            ...props,
            stepKey: 'a',
            autoStart: false,
            xpScope: 'lesson',
          }),
        { initialProps: { run, pass } as PassProps },
      );
      tick(2000);
      expect(run.demo.play).not.toHaveBeenCalled();
      expect(result.current.status).toBe('off');
      rerender({ run: passed(run), pass });
      expect(result.current.status).toBe('passed');
      tick(2200);
      expect(advance).toHaveBeenCalledTimes(1);
    });
  });

  it('asks for XP for a demo heard out, but not for one that’s cut off', async () => {
    const award = vi.spyOn(experienceApi, 'awardAction').mockResolvedValue({});
    const run = makeRun();
    const { result, rerender } = renderHook(
      (props: { run: RunModel }) =>
        useStepFlow({ ...props, stepKey: 'a', xpScope: 'lesson' }),
      { initialProps: { run } },
    );
    const playing = { ...run, demo: { ...run.demo, playing: true } };
    rerender({ run: playing });
    act(() => result.current.run.demo.stop());
    rerender({ run });
    expect(award).not.toHaveBeenCalled();
    award.mockRestore();
  });
});
