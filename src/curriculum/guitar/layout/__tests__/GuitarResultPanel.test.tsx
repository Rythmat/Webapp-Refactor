// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GuitarResultPanel, resultSummary } from '../GuitarResultPanel';
import type { ResultModel } from '../types';
import { makeAssessment, makeResult } from './fixtures';

afterEach(cleanup);

function setup(overrides: Partial<ResultModel> = {}, passMarkPct = 75) {
  const result = makeResult(overrides);
  const view = render(
    <GuitarResultPanel result={result} passMarkPct={passMarkPct} />,
  );
  return {
    ...view,
    result,
    extras: () =>
      view.container.querySelector<HTMLElement>('[data-guitar-result-extras]'),
  };
}

describe('GuitarResultPanel', () => {
  it('a pass: the score as the heading, "Passed", the feedback, the sub-scores', () => {
    const { extras } = setup();
    expect(
      screen.getByRole('heading', { level: 2, name: '100%' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Every note landed.')).toBeInTheDocument();
    expect(extras()!.textContent).toMatch(/Notes\s*100%/);
    expect(extras()!.textContent).toMatch(/Timing\s*90%/);
    expect(extras()!.textContent).not.toMatch(/Length/);
    expect(screen.getByRole('region', { name: '100%' })).toBeInTheDocument();
  });

  it('a miss says so in words, with the pass mark', () => {
    setup(
      {
        result: makeAssessment({
          passed: false,
          overallScore: 0.42,
          pitchAccuracy: 0.5,
          timingAccuracy: 0.3,
          durationAccuracy: 0.8,
          feedbackText: 'Keep going.',
        }),
        feedback: 'Keep going.',
      },
      60,
    );
    expect(screen.getByRole('heading', { name: '42%' })).toBeInTheDocument();
    expect(screen.getByText('Not yet · 60% passes')).toBeInTheDocument();
    expect(screen.queryByText('Passed')).toBeNull();
    const extras = document.querySelector('[data-guitar-result-extras]')!;
    expect(extras.textContent).toMatch(/Notes\s*50%/);
    expect(extras.textContent).toMatch(/Timing\s*30%/);
    expect(extras.textContent).toMatch(/Length\s*80%/);
  });

  it('pass and fail look the same but for the words: no colour at all', () => {
    const passed = setup();
    const passedStyles = [
      ...passed.container.querySelectorAll<HTMLElement>('*'),
    ].filter((el) => el.style.color || el.style.backgroundColor);
    expect(passedStyles).toEqual([]);
    cleanup();
    const failed = setup({ result: makeAssessment({ passed: false }) });
    const failedStyles = [
      ...failed.container.querySelectorAll<HTMLElement>('*'),
    ].filter((el) => el.style.color || el.style.backgroundColor);
    expect(failedStyles).toEqual([]);
    expect(failed.container.innerHTML).not.toMatch(/red-|green-|emerald|rose/);
  });

  it('chord steps score Chords, not Notes', () => {
    const { extras } = setup({ stepKind: 'chords' });
    expect(extras()!.textContent).toMatch(/Chords\s*100%/);
    expect(extras()!.textContent).not.toMatch(/Notes/);
  });

  it('offers the suggested loop as a pill', () => {
    const { result } = setup({
      result: makeAssessment({ passed: false, overallScore: 0 }),
      suggestion: {
        label: 'Loop bars 1–2 at 70%',
        loop: { startBar: 0, endBar: 1 },
        pct: 70,
      },
    });
    const pill = screen.getByRole('button', { name: /^Loop bars? 1/ });
    fireEvent.click(pill);
    expect(result.onSuggestion).toHaveBeenCalledTimes(1);
  });

  it('explains the marks on the TAB only when there are some', () => {
    const { container, rerender, result } = setup();
    expect(container.querySelector('[data-guitar-result-legend]')).toBeNull();
    rerender(
      <GuitarResultPanel
        result={{ ...result, hasMistakes: true }}
        passMarkPct={75}
      />,
    );
    const legend = container.querySelector('[data-guitar-result-legend]')!;
    expect(legend.textContent).toMatch(/✗ missed/);
    expect(legend.textContent).toMatch(/≠ wrong/);
    expect(legend.textContent).toMatch(/early or late/);
    // "Show mistakes" is gone: the marks are already on the TAB.
    expect(screen.queryByRole('button', { name: 'Show mistakes' })).toBeNull();
  });

  it('couldn’t hear it: the heading, then the things to try, with the setup', () => {
    const { result } = setup({
      result: makeAssessment({ passed: false, overallScore: 0, unclear: true }),
      headingOverride: "Couldn't hear that clearly",
    });
    expect(
      screen.getByRole('heading', { name: "Couldn't hear that clearly" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/passes|Passed/)).toBeNull();
    const list = screen.getByRole('list', { name: 'Things to try' });
    expect(list).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open tuner' }));
    expect(result.onOpenSetup).toHaveBeenCalledWith('tuner');
    expect(
      document.querySelector('[data-guitar-result-extras]'),
    ).not.toBeNull();
    expect(screen.queryByText(/Notes/)).toBeNull();
  });

  it('resultSummary: one line to announce, in words', () => {
    expect(resultSummary(makeResult(), 75)).toBe('100%. Passed.');
    expect(
      resultSummary(
        makeResult({
          result: makeAssessment({ passed: false, overallScore: 0.42 }),
        }),
        60,
      ),
    ).toBe('42%. Not yet: 60% passes.');
    expect(
      resultSummary(
        makeResult({
          result: makeAssessment({ passed: false, unclear: true }),
          headingOverride: "Couldn't hear that clearly",
        }),
        75,
      ),
    ).toBe("Couldn't hear that clearly.");
    expect(
      resultSummary(
        makeResult({
          result: makeAssessment({ selfReported: true }),
          headingOverride: '✓ Counted by you',
        }),
        75,
      ),
    ).toBe('Counted by you.');
  });

  it('counted by you: the hand, the heading the tests know, nothing scored', () => {
    const { container } = setup({
      result: makeAssessment({ passed: true, selfReported: true }),
      headingOverride: '✓ Counted by you',
      feedback: 'Counted by you.',
    });
    const heading = screen.getByRole('heading', { name: '✓ Counted by you' });
    expect(heading.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('[data-guitar-result-extras]')).toBeNull();
    expect(screen.queryByText('Passed')).toBeNull();
  });
});
