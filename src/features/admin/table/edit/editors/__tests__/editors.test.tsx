// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CellValues, ScalarEditor } from '../../cellValues';
import { CellEditorHost } from '../CellEditorHost';
import type { EditorHandle } from '../types';

/**
 * The cell editors on their own, as the grid opens them: each type writes
 * on Enter, Shift+Enter, Tab and Shift+Tab with the way to move, leaves
 * the cell as it was on Esc, and keeps a draft that cannot be written —
 * `aria-invalid`, the reason named by `aria-describedby` — rather than
 * writing it. The grid reads the draft through `handle` when the edit ends
 * some other way.
 */

afterEach(cleanup);

const open = (
  editor: ScalarEditor,
  values: CellValues,
  { seed, name = 'Year' }: { seed?: string; name?: string } = {},
) => {
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  const onLeave = vi.fn();
  const handle: { current: EditorHandle | null } = { current: null };
  render(
    <CellEditorHost
      editor={editor}
      name={name}
      label={`${name}, Africa`}
      values={values}
      seed={seed}
      handle={handle}
      onCommit={onCommit}
      onCancel={onCancel}
      onLeave={onLeave}
    />,
  );
  return { onCommit, onCancel, onLeave, handle };
};

const type = (box: HTMLElement, text: string) =>
  fireEvent.change(box, { target: { value: text } });

/** The box's reason for refusing its draft, by `aria-describedby`. */
const why = (box: HTMLElement) =>
  document.getElementById(box.getAttribute('aria-describedby') ?? '')
    ?.textContent;

const YEAR: ScalarEditor = { type: 'year', path: 'year' };

describe('a text box', () => {
  it('opens on the value, selected, with focus', () => {
    open(YEAR, { year: 1982 });
    const box = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Year, Africa',
    });
    expect(box).toHaveFocus();
    expect(box).toHaveValue('1982');
    expect([box.selectionStart, box.selectionEnd]).toEqual([0, 4]);
  });

  it('opens on the key that started it, the caret after it', () => {
    open(YEAR, { year: 1982 }, { seed: '1' });
    const box = screen.getByRole<HTMLInputElement>('textbox');
    expect(box).toHaveValue('1');
    expect(box.selectionStart).toBe(1);
  });

  it.each([
    ['Enter', false, 'down'],
    ['Enter', true, 'up'],
    ['Tab', false, 'right'],
    ['Tab', true, 'left'],
  ] as const)('writes on %s (shift %s) and moves %s', (key, shiftKey, move) => {
    const { onCommit } = open(YEAR, { year: 1982 });
    const box = screen.getByRole('textbox');
    type(box, ' 1983 ');
    const pressed = fireEvent.keyDown(box, { key, shiftKey });
    // Taken from the browser: Tab must not leave the grid.
    expect(pressed).toBe(false);
    expect(onCommit).toHaveBeenCalledWith({ year: 1983 }, move);
  });

  it('leaves the cell as it was on Esc', () => {
    const { onCommit, onCancel } = open(YEAR, { year: 1982 });
    const box = screen.getByRole('textbox');
    type(box, '1999');
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('hands its draft to the grid, and says when focus leaves for the page', () => {
    const { handle, onLeave } = open(YEAR, { year: 1982 });
    const box = screen.getByRole('textbox');
    type(box, '1990');
    expect(handle.current?.read()).toEqual({
      type: 'commit',
      values: { year: 1990 },
    });
    type(box, 'nineteen');
    expect(handle.current?.read()).toMatchObject({ type: 'invalid' });
    const focused = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    fireEvent.blur(box);
    expect(onLeave).not.toHaveBeenCalled();
    focused.mockReturnValue(true);
    fireEvent.blur(box);
    expect(onLeave).toHaveBeenCalledTimes(1);
    focused.mockRestore();
  });
});

describe('refusing what cannot be written', () => {
  /** Types `text`, presses Enter, and says what the box did. */
  const refuse = (
    editor: ScalarEditor,
    values: CellValues,
    text: string,
    name = 'Year',
  ) => {
    const { onCommit } = open(editor, values, { name });
    const box = screen.getByRole('textbox');
    type(box, text);
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    return { box, message: why(box) };
  };

  it('a year that is not one', () => {
    expect(refuse(YEAR, {}, '19x3').message).toBe('Year is a year, like 1983.');
    cleanup();
    expect(refuse(YEAR, {}, '1983.5').message).toBe(
      'Year is a year, like 1983.',
    );
  });

  it('a popularity outside 0–100, or not whole', () => {
    const popularity: ScalarEditor = {
      type: 'number',
      path: 'popularity',
      min: 0,
      max: 100,
    };
    expect(refuse(popularity, {}, '150', 'Popularity').message).toBe(
      'Popularity is a whole number from 0 to 100.',
    );
    cleanup();
    expect(refuse(popularity, {}, '-1', 'Popularity').message).toBe(
      'Popularity is a whole number from 0 to 100.',
    );
    cleanup();
    expect(refuse(popularity, {}, '7.5', 'Popularity').message).toBe(
      'Popularity is a whole number from 0 to 100.',
    );
  });

  it('a span that ends before it starts, or is no span', () => {
    const years: ScalarEditor = {
      type: 'range',
      path: 'activeFrom',
      to: 'activeTo',
    };
    expect(refuse(years, {}, '1984–1961', 'Years Active').message).toBe(
      'Years Active ends before it starts: 1984–1961.',
    );
    cleanup();
    expect(refuse(years, {}, 'the sixties', 'Years Active').message).toMatch(
      /^Years Active is a span of years/,
    );
  });

  it('coordinates out of range, half a pair, blank, or 0, 0', () => {
    const coords: ScalarEditor = { type: 'coords', path: 'coordinates' };
    const at = [42.33, -83.05];
    expect(
      refuse(coords, { coordinates: at }, '95, 10', 'Coordinates').message,
    ).toMatch(/^Needs both: latitude −90 to 90/);
    cleanup();
    expect(
      refuse(coords, { coordinates: at }, '42.33', 'Coordinates').message,
    ).toMatch(/^Needs both/);
    cleanup();
    expect(refuse(coords, { coordinates: at }, '', 'Coordinates').message).toBe(
      'Coordinates cannot be empty: a place needs its pin.',
    );
    cleanup();
    expect(
      refuse(coords, { coordinates: at }, '0, 0', 'Coordinates').message,
    ).toBe('0, 0 is not a place: set its coordinates.');
  });

  it('an emptied name, and a video that is not YouTube’s', () => {
    const title: ScalarEditor = { type: 'text', path: 'title', required: true };
    expect(refuse(title, { title: 'Africa' }, '   ', 'Title').message).toBe(
      'Title cannot be empty.',
    );
    cleanup();
    const video: ScalarEditor = {
      type: 'text',
      path: 'videoId',
      parse: 'youtube-id',
    };
    expect(refuse(video, {}, 'https://vimeo.com/123', 'Video').message).toBe(
      'Video takes a YouTube address or an 11-character video id.',
    );
  });

  it('lets go of the reason once the draft changes, and writes it when it reads', () => {
    const { box } = refuse(YEAR, {}, 'soon');
    type(box, '1983');
    expect(box).not.toHaveAttribute('aria-invalid');
    expect(box).not.toHaveAttribute('aria-describedby');
  });
});

describe('what each type writes', () => {
  const write = (editor: ScalarEditor, values: CellValues, text: string) => {
    const { onCommit } = open(editor, values);
    const box = screen.getByRole('textbox');
    type(box, text);
    fireEvent.keyDown(box, { key: 'Enter' });
    return onCommit.mock.calls[0]?.[0];
  };

  it('a span, open or closed, from its draft', () => {
    const years: ScalarEditor = {
      type: 'range',
      path: 'activeFrom',
      to: 'activeTo',
    };
    open(years, { activeFrom: 1961, activeTo: 1984 });
    expect(screen.getByRole('textbox')).toHaveValue('1961–1984');
    cleanup();
    expect(write(years, {}, '1961-')).toEqual({
      activeFrom: 1961,
      activeTo: undefined,
    });
    cleanup();
    expect(write(years, {}, '–1984')).toEqual({
      activeFrom: undefined,
      activeTo: 1984,
    });
    cleanup();
    expect(write(years, {}, '1961 to 1984')).toEqual({
      activeFrom: 1961,
      activeTo: 1984,
    });
    cleanup();
    expect(write(years, { activeFrom: 1961 }, '')).toEqual({
      activeFrom: undefined,
      activeTo: undefined,
    });
  });

  it('coordinates as a pair, and a YouTube address as its id', () => {
    const coords: ScalarEditor = { type: 'coords', path: 'coordinates' };
    open(coords, { coordinates: [42.33, -83.05] });
    expect(screen.getByRole('textbox')).toHaveValue('42.33, -83.05');
    cleanup();
    expect(write(coords, {}, '40.7128 -74.006')).toEqual({
      coordinates: [40.7128, -74.006],
    });
    cleanup();
    const video: ScalarEditor = {
      type: 'text',
      path: 'videoId',
      parse: 'youtube-id',
    };
    expect(
      write(video, {}, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'),
    ).toEqual({ videoId: 'dQw4w9WgXcQ' });
  });

  it('a blank optional field as taken away, and text trimmed', () => {
    expect(write(YEAR, { year: 1982 }, '  ')).toEqual({ year: undefined });
    cleanup();
    const catalog: ScalarEditor = { type: 'text', path: 'catalogNumber' };
    expect(write(catalog, {}, '  TAM 123 ')).toEqual({
      catalogNumber: 'TAM 123',
    });
  });
});

describe('a choice', () => {
  const FORMAT: ScalarEditor = {
    type: 'choice',
    path: 'format',
    options: [
      { value: 'album', label: 'Album' },
      { value: 'single', label: 'Single' },
      { value: 'ep', label: 'EP' },
      { value: 'live', label: 'Live' },
    ],
  };
  const options = () =>
    within(screen.getByRole('listbox')).getAllByRole('option');

  it('opens on the current value, and ↑ ↓ and Enter pick one', () => {
    const { onCommit } = open(FORMAT, { format: 'single' }, { name: 'Format' });
    const box = screen.getByRole('combobox', { name: 'Format, Africa' });
    expect(box).toHaveFocus();
    expect(box).toHaveAttribute('aria-expanded', 'true');
    const highlighted = () =>
      document.getElementById(box.getAttribute('aria-activedescendant')!);
    expect(highlighted()).toHaveTextContent('Single');
    expect(options()[1]).toHaveTextContent('Single, current');
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    expect(highlighted()).toHaveTextContent('EP');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith({ format: 'ep' }, 'down');
  });

  it('searches from a typed key, and Tab takes the top match', () => {
    const { onCommit } = open(
      FORMAT,
      { format: 'album' },
      { seed: 'l', name: 'Format' },
    );
    expect(options().map((o) => o.textContent)).toEqual([
      'Live',
      'Album, current',
      'Single',
    ]);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Tab' });
    expect(onCommit).toHaveBeenCalledWith({ format: 'live' }, 'right');
  });

  it('writes a clicked choice and stays; Esc and leaving pick nothing', () => {
    const { onCommit, onCancel, handle } = open(
      FORMAT,
      { format: 'album' },
      { name: 'Format' },
    );
    expect(handle.current?.read()).toEqual({ type: 'cancel' });
    fireEvent.click(options()[3]);
    expect(onCommit).toHaveBeenCalledWith({ format: 'live' }, 'none');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('says so when nothing matches, and writes nothing', () => {
    const { onCommit } = open(FORMAT, {}, { name: 'Format' });
    const box = screen.getByRole('combobox');
    type(box, 'cassette');
    expect(screen.getByText('Nothing matches.')).toBeInTheDocument();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(why(box)).toBe('No format matches “cassette”.');
  });
});
