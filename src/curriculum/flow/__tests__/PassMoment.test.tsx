// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PassMoment, SectionMoment, type SectionEnd } from '../PassMoment';
import type { StepFlow } from '../useStepFlow';

const flowWith = (over: Partial<StepFlow> = {}) =>
  ({
    available: true,
    blocked: false,
    status: 'off',
    pass: null,
    passNext: vi.fn(),
    passStay: vi.fn(),
    ...over,
  }) as unknown as StepFlow;

const passing = (over: Partial<NonNullable<StepFlow['pass']>> = {}) =>
  flowWith({
    status: 'passed',
    pass: { earned: 0, holdMs: 2200, ...over },
  });

const makeEnd = (over: Partial<SectionEnd> = {}): SectionEnd => ({
  heading: 'Melody complete!',
  blurb: 'Try it over a groove.',
  continueLabel: 'Continue to Chords',
  onContinue: vi.fn(),
  ...over,
});

describe('a pass', () => {
  afterEach(cleanup);

  it('says what the server granted, and only that', () => {
    const { rerender } = render(
      <PassMoment flow={passing({ score: '92%' })} accent="#f00" />,
    );
    expect(screen.getByText('Passed')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.queryByText(/XP/)).toBeNull();
    rerender(<PassMoment flow={passing({ earned: 8 })} accent="#f00" />);
    expect(screen.getByText('+8 XP')).toBeTruthy();
  });

  it('names what’s next, and can go now or stay', () => {
    const flow = passing({ nextLabel: 'Coming down' });
    render(<PassMoment flow={flow} accent="#f00" />);
    expect(screen.getByText('Next: Coming down')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(flow.passNext).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    expect(flow.passStay).toHaveBeenCalledTimes(1);
  });

  it('draws nothing otherwise', () => {
    const { container } = render(
      <PassMoment flow={flowWith()} accent="#f00" />,
    );
    expect(container.innerHTML).toBe('');
  });
});

describe('the end of a section', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  const tick = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  it('goes on by itself after a moment', () => {
    const end = makeEnd();
    render(<SectionMoment end={end} flow={flowWith()} accent="#f00" />);
    tick(5999);
    expect(end.onContinue).not.toHaveBeenCalled();
    tick(1);
    expect(end.onContinue).toHaveBeenCalledTimes(1);
  });

  it('stays, if asked', () => {
    const end = makeEnd();
    render(<SectionMoment end={end} flow={flowWith()} accent="#f00" />);
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    tick(20_000);
    expect(end.onContinue).not.toHaveBeenCalled();
  });

  it('keeps the Practice Track on offer', () => {
    const end = makeEnd({ enterPracticeTrack: vi.fn() });
    render(<SectionMoment end={end} flow={flowWith()} accent="#f00" />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Enter Practice Track' }),
    );
    expect(end.enterPracticeTrack).toHaveBeenCalledTimes(1);
  });

  it('waits for the pass that ended it, and for anything open', () => {
    const end = makeEnd();
    const { rerender } = render(
      <SectionMoment end={end} flow={passing()} accent="#f00" />,
    );
    expect(screen.queryByText('Melody complete!')).toBeNull();
    tick(20_000);
    expect(end.onContinue).not.toHaveBeenCalled();
    rerender(
      <SectionMoment
        end={end}
        flow={flowWith({ blocked: true })}
        accent="#f00"
      />,
    );
    tick(20_000);
    expect(end.onContinue).not.toHaveBeenCalled();
    rerender(<SectionMoment end={end} flow={flowWith()} accent="#f00" />);
    tick(6000);
    expect(end.onContinue).toHaveBeenCalledTimes(1);
  });

  it('does nothing with the setting off', () => {
    const end = makeEnd();
    const { container } = render(
      <SectionMoment
        end={end}
        flow={flowWith({ available: false })}
        accent="#f00"
      />,
    );
    expect(container.innerHTML).toBe('');
    tick(20_000);
    expect(end.onContinue).not.toHaveBeenCalled();
  });
});
