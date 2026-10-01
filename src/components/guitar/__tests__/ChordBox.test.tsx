// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GUITAR_ATLAS_BOOK_ONE } from '@/curriculum/data/guitar/bookOne';
import type { GuitarShapeDiagram } from '@/lib/guitar/types';
import { ChordBox } from '../ChordBox';

const C = GUITAR_ATLAS_BOOK_ONE.C;
const C_MAJOR = C.triads[0]; // X-3-2-0-1-0
const F_MAJOR = C.triads[3]; // X-X-3-2-1-1, barre at 1
const D_MINOR_7 = C.sevenths[1]; // X-5-7-5-6-X, box from fret 4
const E_MINOR = C.triads[2]; // 0-2-2-0-0-0
const D_MAJOR: GuitarShapeDiagram = {
  frets: 'X-X-0-2-3-2',
  diagramStartFret: 1,
  fingering: [
    { finger: 1, string: 3, fret: 2 },
    { finger: 3, string: 2, fret: 3 },
    { finger: 2, string: 1, fret: 2 },
  ],
};
const RED = '#D2404A';

function renderBox(props: Partial<Parameters<typeof ChordBox>[0]> = {}) {
  return render(
    <ChordBox
      shape={C_MAJOR}
      name="C major"
      hybridLabel="1 maj"
      rootPc={0}
      keyColor={RED}
      {...props}
    />,
  ).container;
}

/** The x of a translated group, which is where geometry puts it. */
function xOf(el: Element | null): number {
  const match = /translate\(([-\d.]+)/.exec(
    el?.getAttribute('transform') ?? '',
  );
  if (!match) throw new Error('element has no translate');
  return Number(match[1]);
}

const dotAt = (host: Element, string: number, fret: number) =>
  host.querySelector(
    `[data-dot][data-string="${string}"][data-fret="${fret}"]`,
  );

describe('ChordBox', () => {
  afterEach(cleanup);

  it('draws open C the way the book does', () => {
    const host = renderBox();
    const muted = [...host.querySelectorAll('[data-marker="muted"]')];
    const open = [...host.querySelectorAll('[data-marker="open"]')];
    expect(muted.map((m) => m.getAttribute('data-string'))).toEqual(['6']);
    expect(open.map((m) => m.getAttribute('data-string'))).toEqual(['3', '1']);

    const dots = [...host.querySelectorAll('[data-dot]')].map((d) => [
      Number(d.getAttribute('data-string')),
      Number(d.getAttribute('data-fret')),
      d.textContent,
    ]);
    expect(dots).toEqual([
      [5, 3, '3'],
      [4, 2, '2'],
      [2, 1, '1'],
    ]);
    expect(host.querySelector('[data-nut]')).not.toBeNull();
    expect(host.querySelector('[data-caption]')?.textContent).toBe(
      'X-3-2-0-1-0',
    );
    expect(host.querySelector('[data-title]')?.textContent).toBe('C major');
    expect(screen.getByText('1 maj')).toBeInTheDocument();
  });

  it('draws one barre for F major', () => {
    const host = renderBox({ shape: F_MAJOR, name: 'F major', rootPc: 5 });
    const barres = host.querySelectorAll('[data-barre]');
    expect(barres).toHaveLength(1);
    expect(barres[0].getAttribute('data-fret')).toBe('1');
    expect(barres[0].getAttribute('data-string')).toBe('2-1');
    expect(
      [...host.querySelectorAll('[data-marker="muted"]')].map((m) =>
        m.getAttribute('data-string'),
      ),
    ).toEqual(['6', '5']);
  });

  it('numbers every row from the box start, with no nut above fret 1', () => {
    const host = renderBox({
      shape: D_MINOR_7,
      name: 'D minor 7',
      rootPc: 2,
    });
    const labels = [...host.querySelectorAll('[data-fret-label]')].map(
      (t) => t.textContent,
    );
    expect(labels).toEqual(['4', '5', '6', '7', '8']);
    expect(host.querySelector('[data-nut]')).toBeNull();
  });

  it('tints the frame, header and barre with the key colour but never a dot', () => {
    const host = renderBox({ shape: F_MAJOR, name: 'F major', rootPc: 5 });
    expect(host.querySelector('[data-frame]')?.getAttribute('stroke')).toBe(
      RED,
    );
    expect(host.querySelector('[data-barre]')?.getAttribute('fill')).toBe(RED);
    expect(
      (host.querySelector('[data-title]') as HTMLElement).style.color,
    ).toBe('rgb(210, 64, 74)');
    const dots = host.querySelectorAll('[data-dot]');
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) {
      expect(dot.outerHTML.toLowerCase()).not.toContain(RED.toLowerCase());
    }
  });

  it('marks the root by shape on the root strings, open ones included', () => {
    const host = renderBox();
    const roots = [...host.querySelectorAll('[data-dot][data-root]')].map((d) =>
      d.getAttribute('data-string'),
    );
    expect(roots).toEqual(['5', '2']);
    expect(dotAt(host, 5, 3)?.querySelector('polygon')).not.toBeNull();
    expect(dotAt(host, 4, 2)?.querySelector('polygon')).toBeNull();

    const em = renderBox({ shape: E_MINOR, name: 'E minor', rootPc: 4 });
    const openRoots = [
      ...em.querySelectorAll('[data-marker="open"][data-root]'),
    ].map((m) => m.getAttribute('data-string'));
    expect(openRoots).toEqual(['6', '1']);
  });

  it('rings the dots carrying a missing tone and badges the extras', () => {
    const host = renderBox({
      diagnostics: { missingPcs: [4], extraPcs: [5, 10] },
    });
    // E is on string 4 fret 2 and the open first string.
    const missingDot = dotAt(host, 4, 2);
    expect(missingDot?.getAttribute('data-state')).toBe('missing');
    expect(
      missingDot?.querySelector('circle[stroke-dasharray]'),
    ).not.toBeNull();
    expect(
      host
        .querySelector('[data-marker="open"][data-string="1"]')
        ?.getAttribute('data-state'),
    ).toBe('missing');
    expect(dotAt(host, 5, 3)?.getAttribute('data-state')).toBe('idle');
    expect(host.querySelector('[data-extra-badge]')?.textContent).toBe(
      'extra: F, B♭',
    );
    // A Book One shape is described as aria.chordbox, then the details.
    expect(
      screen.getByRole('img', {
        name: 'C major: x 3 2 0 1 0. Low to high: root, 3, 5, root, 3. Open chord. Fingers 3 2 1, missing E, extra F B♭',
      }),
    ).toBeInTheDocument();
  });

  it('spells diagnostics from the root as the name spells it', () => {
    // Pitch class 8's key row is A♭'s and 6's is F♯'s: spelled by those, G♯
    // minor would miss an E♭ and G♭ major an A♯.
    renderBox({
      shape: GUITAR_ATLAS_BOOK_ONE['F#'].triads[1], // 4-6-6-4-X-X
      name: 'G♯ minor',
      rootPc: 8,
      diagnostics: { missingPcs: [3], extraPcs: [10] },
    });
    expect(
      screen.getByRole('img', { name: /missing D♯, extra A♯$/ }),
    ).toBeInTheDocument();
    cleanup();
    const host = renderBox({
      shape: GUITAR_ATLAS_BOOK_ONE.Db.triads[3], // 2-4-4-3-X-X
      name: 'G♭ major',
      rootPc: 6,
      diagnostics: { missingPcs: [10], extraPcs: [11] },
    });
    expect(
      screen.getByRole('img', { name: /missing B♭, extra C♭$/ }),
    ).toBeInTheDocument();
    expect(host.querySelector('[data-extra-badge]')?.textContent).toBe(
      'extra: C♭',
    );
  });

  it('describes the voicing in its accessible name', () => {
    // A shape with no quality keeps the plain description.
    renderBox({ shape: D_MAJOR, name: 'D major', rootPc: 2 });
    expect(
      screen.getByRole('img', { name: 'D major: x x 0 2 3 2, fingers 1 3 2' }),
    ).toBeInTheDocument();
    renderBox({ shape: F_MAJOR, name: 'F major', rootPc: 5 });
    expect(
      screen.getByRole('img', {
        name: 'F major: x x 3 2 1 1. Low to high: root, 3, 5, root. Root on string 4. Fingers 3 2 1 1, barre at fret 1',
      }),
    ).toBeInTheDocument();
  });

  it('plays the voicing from its Hear it button, and has none without one', () => {
    const onHear = vi.fn();
    renderBox({ shape: D_MAJOR, name: 'D major', rootPc: 2, onHear });
    fireEvent.click(screen.getByRole('button', { name: 'Hear D major' }));
    expect(onHear).toHaveBeenCalledTimes(1);
    cleanup();
    renderBox();
    expect(screen.queryByRole('button', { name: /^Hear/ })).toBeNull();
  });

  it('leaves the dots empty when fingers are hidden', () => {
    const host = renderBox({ showFingers: false });
    for (const dot of host.querySelectorAll('[data-dot]')) {
      expect(dot.querySelector('text')).toBeNull();
    }
  });

  it('mirrors the geometry for left-handers but not the text', () => {
    const right = renderBox();
    const rightDot = xOf(dotAt(right, 5, 3));
    const rightMute = xOf(right.querySelector('[data-marker="muted"]'));
    const rightLabel = right.querySelector('[data-fret-label="1"]');
    const left = renderBox({ mirrored: true });
    const leftDot = xOf(dotAt(left, 5, 3));
    const leftMute = xOf(left.querySelector('[data-marker="muted"]'));
    const leftLabel = left.querySelector('[data-fret-label="1"]');

    // String 6 swaps sides; string 5 moves to the mirror position.
    expect(leftMute).toBeGreaterThan(rightMute);
    expect(rightDot + leftDot).toBe(rightMute + leftMute);
    // Fret numbers move to the other side but still read left to right.
    expect(Number(leftLabel?.getAttribute('x'))).toBeGreaterThan(
      Number(rightLabel?.getAttribute('x')),
    );
    expect(leftLabel?.getAttribute('text-anchor')).toBe('start');
    expect(dotAt(left, 5, 3)?.textContent).toBe('3');
    for (const el of left.querySelectorAll('[transform]')) {
      expect(el.getAttribute('transform')).toMatch(/^translate\([^)]*\)$/);
    }
  });
});
