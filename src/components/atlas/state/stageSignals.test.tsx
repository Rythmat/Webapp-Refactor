// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  StageSignalsProvider,
  createChannel,
  createStageSignals,
  useChannel,
  useStageSignals,
} from './stageSignals';

afterEach(cleanup);

describe('the stage’s signals', () => {
  it('tell their listeners only of a change', () => {
    const channel = createChannel(1);
    const heard = vi.fn();
    const stop = channel.subscribe(heard);
    channel.set(1);
    expect(heard).not.toHaveBeenCalled();
    channel.set(2);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(channel.get()).toBe(2);
    stop();
    channel.set(3);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('take the same years as no change', () => {
    const { yearFocus } = createStageSignals();
    const heard = vi.fn();
    yearFocus.subscribe(heard);
    yearFocus.set({ from: 1950, to: 1959 });
    yearFocus.set({ from: 1950, to: 1959 });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('re-render what reads them, one page’s at a time', () => {
    let page: ReturnType<typeof createStageSignals> | null = null;
    function Reader() {
      const signals = useStageSignals();
      page = signals;
      return <p>{useChannel(signals.linkFocus) ?? 'none'}</p>;
    }
    render(
      <StageSignalsProvider>
        <Reader />
      </StageSignalsProvider>,
    );
    expect(screen.getByText('none')).toBeTruthy();
    act(() => page!.linkFocus.set('a→b'));
    expect(screen.getByText('a→b')).toBeTruthy();
  });
});
