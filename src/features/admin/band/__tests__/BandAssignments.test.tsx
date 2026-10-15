// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Band } from '@/curriculum/engine/band/band';
import type { LessonPairing } from '@/curriculum/engine/lessonPairings/registry';
import { BandAssignments, parseSteps, stepsLabel } from '../BandAssignments';

/**
 * A band is given to a lesson style once — every step in the style — with an
 * exception only where a section or some steps differ.
 */

const saved: LessonPairing[] = [];
let pairings: LessonPairing[] = [];

vi.mock('../bandFiles', () => ({
  CAN_WRITE_FILES: true,
  savePairing: vi.fn(async (p: LessonPairing) => {
    saved.push(p);
  }),
}));

vi.mock('../bandSession', () => ({
  usePairingList: () => pairings,
  useBandList: () => [band, other],
}));

const band: Band = {
  id: 'cumbia-band',
  name: 'Cumbia Band',
  status: 'live',
  timeSignature: [4, 4],
  tempo: 96,
  layers: [],
};
const other: Band = { ...band, id: 'cumbia-break', name: 'Cumbia Break' };

afterEach(() => {
  cleanup();
  saved.length = 0;
  pairings = [];
});

describe('steps written for an exception', () => {
  it('reads single steps and ranges, in order, each once', () => {
    expect(parseSteps('7–9, 3 4,4')).toEqual([3, 4, 7, 8, 9]);
    expect(parseSteps('')).toEqual([]);
    expect(stepsLabel([3, 4, 7, 8, 9])).toBe('3–4, 7–9');
  });
});

describe('assigning a band to lesson styles', () => {
  it('replaces drums, bass and comping set one by one with the band', () => {
    pairings = [
      {
        id: 'latin-l1-cumbia',
        drums: 'groove-latin-1',
        bass: 'cumbia-1',
        comping: 'cumbia-offbeats',
      },
    ];
    render(<BandAssignments band={band} dirty={false} />);
    expect(
      screen.getByText('Drums, bass, comping set on its own'),
    ).toBeInTheDocument();
    const row = screen.getByText('Cumbia').closest('div.rounded-md')!;
    fireEvent.click(row.querySelector('button') as HTMLButtonElement);
    expect(saved).toEqual([
      { id: 'latin-l1-cumbia', band: 'cumbia-band', overrides: undefined },
    ]);
  });

  it('keeps a style’s exceptions when it changes band, and says whose it is', () => {
    pairings = [
      {
        id: 'latin-l1-cumbia',
        band: 'cumbia-break',
        overrides: [{ section: 'D', band: 'cumbia-break' }],
      },
    ];
    render(<BandAssignments band={band} dirty={false} />);
    expect(screen.getByText('Plays Cumbia Break')).toBeInTheDocument();
    expect(screen.getByText('section D')).toBeInTheDocument();
    const row = screen.getByText('Cumbia').closest('div.rounded-md')!;
    fireEvent.click(
      [...row.querySelectorAll('button')].find(
        (b) => b.textContent === 'Use this band',
      )!,
    );
    expect(saved[0]).toEqual({
      id: 'latin-l1-cumbia',
      band: 'cumbia-band',
      overrides: [{ section: 'D', band: 'cumbia-break' }],
    });
  });

  it('adds an exception for a run of steps', () => {
    pairings = [{ id: 'latin-l1-cumbia', band: 'cumbia-band' }];
    render(<BandAssignments band={band} dirty={false} />);
    fireEvent.click(
      screen.getAllByRole('button', {
        name: /Exception for a section or steps/,
      })[0],
    );
    fireEvent.change(screen.getByLabelText('Section'), {
      target: { value: 'D' },
    });
    fireEvent.change(screen.getByLabelText('Steps'), {
      target: { value: '3-4' },
    });
    fireEvent.change(screen.getByLabelText('Band'), {
      target: { value: 'cumbia-break' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(saved[0]).toEqual({
      id: 'latin-l1-cumbia',
      band: 'cumbia-band',
      overrides: [{ section: 'D', steps: [3, 4], band: 'cumbia-break' }],
    });
  });
});
