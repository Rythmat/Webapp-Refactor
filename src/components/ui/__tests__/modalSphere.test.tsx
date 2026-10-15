// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModalSphere from '../3d-orb';
import {
  alignDegrees,
  CENTER,
  cellCenterPos,
  cellLabel,
  LONGITUDES,
  moveCell,
  NOTE_TO_PC,
  OUTER_RADIUS,
  rootOf,
  scaleOf,
  SPIRALS,
  WEDGE_COUNT,
} from '../modalSphereModel';

describe('modalSphereModel', () => {
  it('spells every mode one letter per note, enharmonically exact', () => {
    expect(scaleOf(0, 1)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']); // C Ionian
    expect(scaleOf(6, 6)).toEqual(['E♯', 'F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯']); // E♯ Locrian
    expect(scaleOf(7, 0)).toEqual(['G♭', 'A♭', 'B♭', 'C', 'D♭', 'E♭', 'F']); // G♭ Lydian
    for (let w = 0; w < WEDGE_COUNT; w++)
      for (let m = 0; m < 7; m++) {
        const scale = scaleOf(w, m);
        expect(new Set(scale.map((n) => n[0])).size).toBe(7);
        expect(scale.join('')).not.toContain('?');
      }
  });

  it('holds the 7 modes of one key signature in each wedge', () => {
    // Every mode in a wedge uses the same 7 pitch classes as its Ionian.
    for (let w = 0; w < WEDGE_COUNT; w++) {
      const pcs = (m: number) =>
        new Set(
          scaleOf(w, m).map(
            (n) =>
              (NOTE_TO_PC[n[0]] +
                (n.includes('♯') ? 1 : 0) -
                (n.includes('♭') ? 1 : 0) +
                12) %
              12,
          ),
        );
      const ionian = [...pcs(1)].sort();
      for (let m = 0; m < 7; m++) expect([...pcs(m)].sort()).toEqual(ionian);
    }
  });

  it('runs each spiral through 7 different wedges, one flat more each ring', () => {
    for (const spiral of SPIRALS) {
      expect(spiral.wedges).toHaveLength(7);
      expect(spiral.wedges.every((w) => w >= 0)).toBe(true);
      for (let m = 1; m < 7; m++)
        expect((spiral.wedges[m] - spiral.wedges[m - 1] + 12) % 12).toBe(11);
    }
  });

  it('lines a spiral up in its Ionian wedge, every ring the short way', () => {
    const c = SPIRALS[0];
    expect(alignDegrees(c)).toEqual([-30, 0, 30, 60, 90, 120, 150]);
    for (const spiral of SPIRALS) {
      const turns = alignDegrees(spiral);
      expect(Math.max(...turns.map(Math.abs))).toBeLessThanOrEqual(180);
      const lined = spiral.wedges.map(
        (w, m) =>
          (w + Math.round(turns[m] / 30) + WEDGE_COUNT * 2) % WEDGE_COUNT,
      );
      expect(new Set(lined).size).toBe(1);
    }
  });

  it('keeps every cell inside the wheel', () => {
    for (let w = 0; w < WEDGE_COUNT; w++)
      for (let m = 0; m < 7; m++) {
        const { x, y } = cellCenterPos(m, w);
        expect(Math.hypot(x - CENTER, y - CENTER)).toBeLessThan(OUTER_RADIUS);
      }
  });

  it('moves round a ring and between rings with the arrow keys', () => {
    expect(moveCell({ w: 0, m: 1 }, 'ArrowRight')).toEqual({ w: 1, m: 1 });
    expect(moveCell({ w: 0, m: 1 }, 'ArrowLeft')).toEqual({ w: 11, m: 1 });
    expect(moveCell({ w: 0, m: 0 }, 'ArrowUp')).toEqual({ w: 0, m: 0 });
    expect(moveCell({ w: 0, m: 6 }, 'ArrowDown')).toEqual({ w: 0, m: 6 });
    expect(moveCell({ w: 0, m: 1 }, 'Tab')).toBeNull();
  });

  it('reads a cell aloud with its key signature', () => {
    expect(cellLabel({ w: 0, m: 1 })).toBe(
      'C Ionian, key signature no sharps or flats',
    );
    expect(rootOf(6, 6)).toBe('E#');
    expect(LONGITUDES[6].spoken).toBe('6 sharps');
  });
});

describe('ModalSphere', () => {
  beforeEach(() => {
    // Reduced motion: the rings jump, so a test reads the end state at once.
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const ring = (container: HTMLElement, m: number) =>
    container.querySelectorAll('svg > g')[m];

  it('selects the cell clicked, not a spiral through it', () => {
    render(<ModalSphere />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'C Ionian, key signature no sharps or flats',
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'C Ionian' }),
    ).toBeInTheDocument();
    expect(screen.getByText('C D E F G A B')).toBeInTheDocument();
  });

  it('turns the wheel to line up every mode on the root picked', () => {
    const { container } = render(<ModalSphere />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'C Ionian, key signature no sharps or flats',
      }),
    );
    // Lydian turns back one wedge, Locrian forward five: the short way.
    const turnsOf = () =>
      [0, 1, 2, 3, 4, 5, 6].map((m) =>
        ring(container, m).getAttribute('transform'),
      );
    expect(turnsOf()).toEqual(
      [-30, 0, 30, 60, 90, 120, 150].map(
        (deg) => `rotate(${deg} ${CENTER} ${CENTER})`,
      ),
    );
    // The panel lists C's 7 parallel modes, the picked one marked.
    const list = screen.getByRole('heading', { name: 'All modes on C' })
      .parentElement as HTMLElement;
    const names = [
      'C Lydian',
      'C Ionian',
      'C Mixolydian',
      'C Dorian',
      'C Aeolian',
      'C Phrygian',
      'C Locrian',
    ];
    for (const name of names)
      expect(
        within(list).getByRole('button', { name: new RegExp(`^${name}`) }),
      ).toBeInTheDocument();
    expect(
      within(list).getByRole('button', { name: /^C Ionian/ }),
    ).toHaveAttribute('aria-current', 'true');

    // Another mode on C moves the highlight; the wheel stays lined up.
    fireEvent.click(within(list).getByRole('button', { name: /^C Dorian/ }));
    expect(
      screen.getByRole('heading', { name: 'C Dorian' }),
    ).toBeInTheDocument();
    expect(turnsOf()[0]).toBe(`rotate(-30 ${CENTER} ${CENTER})`);

    // A note on another root turns the wheel to that root.
    fireEvent.click(
      screen.getByRole('button', {
        name: 'G Ionian, key signature 1 sharp',
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'All modes on G' }),
    ).toBeInTheDocument();
    expect(turnsOf()[1]).toBe(`rotate(0 ${CENTER} ${CENTER})`);

    // Picking the same note again clears and turns the wheel back.
    fireEvent.click(
      screen.getByRole('button', {
        name: 'G Ionian, key signature 1 sharp',
      }),
    );
    expect(turnsOf()[0]).toBe(`rotate(0 ${CENTER} ${CENTER})`);
  });

  it('selects a key signature from the rim and a mode from the column', () => {
    render(<ModalSphere />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Key signature 2 sharps, the modes of D major',
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'Key signature: 2 sharps' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dorian' }));
    expect(screen.getByRole('heading', { name: 'Dorian' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dorian' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('walks the cells with the arrow keys and clears with Escape', () => {
    render(<ModalSphere />);
    const start = screen.getByRole('button', {
      name: 'C Ionian, key signature no sharps or flats',
    });
    expect(start).toHaveAttribute('tabindex', '0');
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowRight' });
    const next = screen.getByRole('button', {
      name: 'G Ionian, key signature 1 sharp',
    });
    expect(next).toHaveAttribute('tabindex', '0');
    expect(start).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(next, { key: 'Enter' });
    expect(
      screen.getByRole('heading', { name: 'G Ionian' }),
    ).toBeInTheDocument();
    fireEvent.keyDown(next, { key: 'Escape' });
    expect(
      screen.getByRole('heading', { name: 'Modal Sphere' }),
    ).toBeInTheDocument();
  });

  it('labels all 84 cells for screen readers', () => {
    render(<ModalSphere />);
    expect(
      screen.getAllByRole('button', { name: /, key signature / }),
    ).toHaveLength(84);
  });
});
