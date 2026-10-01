// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GUITAR_ATLAS_BOOK_ONE } from '@/curriculum/data/guitar/bookOne';
import { SameRootCompare } from '../SameRootCompare';

const RED = '#D2404A';
afterEach(cleanup);

const boxes = () =>
  [...document.querySelectorAll('[data-compare-quality]')].map((li) => ({
    quality: li.getAttribute('data-compare-quality'),
    caption: li.querySelector('[data-moved] [aria-hidden]')?.textContent ?? '',
    spoken: li.querySelector('[data-moved] .sr-only')?.textContent ?? '',
    shape: li.querySelector('[data-caption]')?.textContent,
  }));

describe('SameRootCompare', () => {
  it('builds the four kinds on the drop-2 root, naming the note that moved', () => {
    const onHearShape = vi.fn();
    render(
      <SameRootCompare
        chordShape={GUITAR_ATLAS_BOOK_ONE.C.sevenths[0]} // Cmaj7 X-3-5-4-5-X
        keyCenter="C"
        keyColor={RED}
        onHearShape={onHearShape}
      />,
    );
    const toggle = screen.getByRole('button', {
      name: 'Same root, four kinds',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(boxes()).toEqual([]);
    fireEvent.click(toggle);

    expect(
      screen.getByText('Shapes built on C for comparison.'),
    ).toBeInTheDocument();
    expect(boxes()).toEqual([
      { quality: 'maj7', caption: '', spoken: '', shape: 'X-3-5-4-5-X' },
      {
        quality: 'dom7',
        caption: '7 → ♭7 · string 3',
        spoken: '7 to flat 7, string 3',
        shape: 'X-3-5-3-5-X',
      },
      {
        quality: 'min7',
        caption: '3 → ♭3 · string 2',
        spoken: '3 to flat 3, string 2',
        shape: 'X-3-5-3-4-X',
      },
      {
        quality: 'min7b5',
        caption: '5 → ♭5 · string 4',
        spoken: '5 to flat 5, string 4',
        shape: 'X-3-4-3-4-X',
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Hear C dominant 7' }));
    expect(onHearShape).toHaveBeenCalledWith('X-3-5-3-5-X');
    expect(
      screen.getByRole('img', { name: /^C minor 7\(♭5\): x 3 4 3 4 x/ }),
    ).toBeInTheDocument();
  });

  it('uses the drop-3 grip for a root on string 6', () => {
    render(
      <SameRootCompare
        chordShape={GUITAR_ATLAS_BOOK_ONE.G.sevenths[0]} // Gmaj7 3-X-4-4-3-X
        keyCenter="G"
        keyColor={RED}
        defaultOpen
      />,
    );
    expect(
      screen.getByText('Shapes built on G for comparison.'),
    ).toBeInTheDocument();
    expect(boxes().map((b) => b.shape)).toEqual([
      '3-X-4-4-3-X',
      '3-X-3-4-3-X',
      '3-X-3-3-3-X',
      '3-X-3-3-2-X',
    ]);
    // Never graded, and nothing to play without a handler.
    expect(screen.queryByRole('button', { name: /^Hear/ })).toBeNull();
  });

  it('spells the root in the key', () => {
    const bb = GUITAR_ATLAS_BOOK_ONE.Bb;
    render(
      <SameRootCompare
        chordShape={bb.sevenths[0]}
        keyCenter="Bb"
        keyColor={RED}
        defaultOpen
      />,
    );
    expect(
      screen.getByText('Shapes built on B♭ for comparison.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /^B♭ dominant 7:/ }),
    ).toBeInTheDocument();
  });

  it('renders nothing for a root the ladder cannot build on', () => {
    // A Example 5, bar 4: Dmaj7 with its root on string 4.
    const dmaj7 = GUITAR_ATLAS_BOOK_ONE.A.musicMaps[4].bars[3];
    const { container } = render(
      <SameRootCompare
        chordShape={dmaj7}
        keyCenter="A"
        keyColor={RED}
        defaultOpen
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
