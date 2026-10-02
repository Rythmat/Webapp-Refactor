// @vitest-environment jsdom
/**
 * The loop status and practice notes, as the guitar action bar shows them:
 * the landing look's greys and 36px (phone 44px) pills, and the same names
 * and behaviour as before.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuitarLoopStatus, GuitarPracticeNotes } from '../GuitarLoopStatus';

afterEach(cleanup);

/** Only the three text greys the app allows (and no 10–11px text). */
function expectLandingText(root: HTMLElement) {
  for (const el of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    const classes = el.getAttribute('class') ?? '';
    expect(classes).not.toMatch(/text-white\/(?!55\b|45\b)\d+/);
    expect(classes).not.toMatch(/text-\[1[01]px\]/);
    expect(classes).not.toMatch(/font-(medium|semibold)/);
  }
}

describe('GuitarLoopStatus', () => {
  it('a loop: its bars and pass, the pad and a ✕ out of it, 36px targets', () => {
    const onPadChange = vi.fn();
    const onClear = vi.fn();
    const { container } = render(
      <GuitarLoopStatus
        loop={{ startBar: 0, endBar: 1 }}
        padBars={1}
        passCount={2}
        onPadChange={onPadChange}
        onClear={onClear}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loop bars 1–2 · pass 3',
    );
    const pad = screen.getByRole('button', { name: '✓ A bar either side' });
    expect(pad).toHaveAttribute('aria-pressed', 'true');
    const stop = screen.getByRole('button', { name: 'Stop looping' });
    expect(pad.className).toMatch(/\bh-9\b/);
    expect(pad.className).toMatch(/max-\[639px\]:h-11/);
    // A round ✕, named in words: the loop's row stays on one line.
    expect(stop).toHaveAttribute('title', 'Stop looping');
    expect(stop.textContent).toBe('');
    expect(stop.className).toMatch(/\bsize-9\b/);
    expect(stop.className).toMatch(/max-\[639px\]:size-11/);
    fireEvent.click(pad);
    expect(onPadChange).toHaveBeenCalledWith(0);
    fireEvent.click(stop);
    expect(onClear).toHaveBeenCalledTimes(1);
    expectLandingText(container.firstElementChild as HTMLElement);
  });

  it('no loop: how to make one', () => {
    render(
      <GuitarLoopStatus
        loop={null}
        padBars={0}
        passCount={0}
        onPadChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(
      screen.getByText('Tap a bar to loop it, or drag across bars.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('GuitarPracticeNotes', () => {
  it('says why the guide is quiet, in the secondary grey', () => {
    const { container } = render(
      <GuitarPracticeNotes handCareMs={0} guideMuted />,
    );
    const notes = container.querySelector<HTMLElement>(
      '[data-guitar-practice-notes]',
    )!;
    expect(notes).toHaveTextContent(/The guide is off/);
    expect(notes.className).toMatch(/text-white\/55/);
    expectLandingText(notes);
  });
});
