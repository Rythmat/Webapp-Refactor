// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { noteNameInKey } from '../noteNames';
import { gradeNotePick, isBlackKey, pickerRange } from '../notePick';
import { NotePicker } from '../shell/NotePicker';

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];

describe('grading the notes chosen', () => {
  it('passes the scale, in any order', () => {
    expect(gradeNotePick([11, 9, 7, 5, 4, 2, 0], C_MAJOR)).toEqual({
      ok: true,
    });
  });

  it('names what doesn’t belong and what’s left to find', () => {
    expect(gradeNotePick([0, 2, 4, 6], C_MAJOR)).toEqual({
      ok: false,
      extra: [6],
      missing: [5, 7, 9, 11],
    });
  });
});

describe('the octave of keys', () => {
  it('runs from a white tonic up to it again', () => {
    const range = pickerRange(7);
    expect(range[0]).toBe(67);
    expect(range.at(-1)).toBe(79);
  });

  it('starts a black tonic from the white key under it', () => {
    const range = pickerRange(1);
    expect(isBlackKey(range[0])).toBe(false);
    expect(isBlackKey(range.at(-1) ?? 0)).toBe(false);
    expect(range).toContain(61);
    expect(range).toContain(73);
  });
});

describe('choosing with the mouse', () => {
  afterEach(cleanup);
  const props = {
    tonicPc: 0,
    nameOf: (pc: number) => noteNameInKey(pc + 60, 'C'),
    picked: new Set([0, 4]),
    wrong: new Set<number>(),
    settled: false,
    disabled: false,
    accent: '#D2404A',
    onToggle: vi.fn(),
  };

  it.each(['keys', 'names'] as const)('%s report the note pressed', (face) => {
    const onToggle = vi.fn();
    render(<NotePicker {...props} face={face} onToggle={onToggle} />);
    fireEvent.click(document.querySelector('[data-pick-note="7"]')!);
    expect(onToggle).toHaveBeenCalledWith(7);
  });

  it('holds still once it’s been checked', () => {
    const onToggle = vi.fn();
    render(<NotePicker {...props} face="keys" disabled onToggle={onToggle} />);
    fireEvent.click(document.querySelector('[data-pick-note="7"]')!);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('only names a key once it’s chosen: finding them is the exercise', () => {
    render(<NotePicker {...props} face="keys" />);
    const key = (pc: number) =>
      document.querySelector(`[data-pick-note="${pc}"]`)?.textContent;
    expect(key(4)).toBe('E');
    expect(key(7)).toBe('');
  });

  it('says which is the tonic, and which are chosen', () => {
    render(<NotePicker {...props} face="names" />);
    expect(screen.getByRole('checkbox', { name: 'C, the tonic' })).toBeTruthy();
    expect(
      screen.getByRole('checkbox', { name: 'E' }).getAttribute('aria-checked'),
    ).toBe('true');
  });
});
