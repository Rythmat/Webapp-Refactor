// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetSessionEntitiesForTests } from '../../entities/sessionEntities';
import { ProgressionFields } from '../ProgressionFields';
import { type Body, pick, renderEditor, seed } from './harness';

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: null }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    isServed: () => false,
    isAuthoritative: () => false,
    feature: () => false,
    identityOf: () => 'slug',
  }),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  resetSessionEntitiesForTests();
});

const DREAMS: Body = {
  id: 212,
  progression: '6 minor - 5 major',
  chords: ['6 minor', '5 major'],
  chordCount: 2,
  startingChord: '6 minor',
  startingDegree: '6',
  complexity: 'triad',
  vibes: ['dreamy'],
  styles: ['pop', 'rock'],
  artist: 'Fleetwood Mac',
  song: 'Dreams- Fleetwood Mac',
};

describe('ProgressionFields', () => {
  it('shows the chords as chips and the sheet’s text, writing nothing', () => {
    const { onChange } = renderEditor(ProgressionFields, DREAMS);
    const chips = within(screen.getByRole('list', { name: 'Chords' }));
    expect(
      chips
        .getAllByRole('button', { name: /chord \d of 2/ })
        .map((b) => b.textContent),
    ).toEqual(['6 min', '5 maj']);
    expect(screen.getByText(/2 chords, starting on 6 minor/)).toBeTruthy();
    expect(
      screen.getByText(/“Dreams- Fleetwood Mac” · Fleetwood Mac/).textContent,
    ).toMatch(/not linked to a song yet/);
    expect(screen.getByLabelText('pop')).toHaveProperty('checked', true);
    expect(screen.getByLabelText('Complexity')).toHaveProperty(
      'value',
      'triad',
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('links a song by its bare id, and drops the key with the last one', async () => {
    seed('song', 'dreams', 'Dreams');
    const { last } = renderEditor(ProgressionFields, DREAMS);
    await pick(
      within(screen.getByRole('group', { name: 'Songs' })).getByRole('button', {
        name: 'Add song',
      }),
      'Dreams',
      /Dreams/,
    );
    expect(last()).toStrictEqual({ ...DREAMS, songIds: ['dreams'] });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Dreams' }));
    expect(last()).toStrictEqual(DREAMS);
  });

  it('toggles styles and vibes, keeping the required lists', () => {
    const { last, onChange } = renderEditor(ProgressionFields, DREAMS);
    fireEvent.click(screen.getByLabelText('gospel'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(last()).toStrictEqual({
      ...DREAMS,
      styles: ['pop', 'rock', 'gospel'],
    });
    fireEvent.click(screen.getByLabelText('dreamy'));
    expect(last()).toStrictEqual({
      ...DREAMS,
      styles: ['pop', 'rock', 'gospel'],
      vibes: [],
    });
  });

  it('notes where each style is filed: gospel at its subgenre, african nowhere', () => {
    renderEditor(ProgressionFields, DREAMS);
    const note = (style: string) =>
      screen.getByLabelText(style).closest('label')?.getAttribute('title');
    expect(note('r&b')).toBe('Filed under R&B');
    expect(note('gospel')).toBe('Filed under Funk › Gospel');
    expect(note('african')).toBe('Deliberately mapped to no genre');
  });

  it('sets the complexity', () => {
    const { last } = renderEditor(ProgressionFields, DREAMS);
    fireEvent.change(screen.getByLabelText('Complexity'), {
      target: { value: '7th' },
    });
    expect(last()).toStrictEqual({ ...DREAMS, complexity: '7th' });
  });

  it('writes the chords with the fields that follow them in one edit', () => {
    const { last, onChange } = renderEditor(ProgressionFields, DREAMS);
    fireEvent.click(screen.getByRole('button', { name: 'Add chord' }));
    const box = screen.getByRole('combobox', { name: 'Add a chord' });
    fireEvent.change(box, { target: { value: '4 major7' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(last()).toStrictEqual({
      ...DREAMS,
      chords: ['6 minor', '5 major', '4 major7'],
      progression: '6 minor - 5 major - 4 major7',
      chordCount: 3,
    });
    // A new first chord moves the starting chord and degree with it.
    fireEvent.keyDown(
      screen.getByRole('button', { name: /^4 maj7, chord 3 of 3/ }),
      { key: 'Home' },
    );
    fireEvent.keyDown(
      screen.getByRole('button', { name: /^4 maj7, chord 3 of 3/ }),
      { key: 'ArrowLeft', altKey: true },
    );
    fireEvent.keyDown(
      screen.getByRole('button', { name: /^4 maj7, chord 2 of 3/ }),
      { key: 'ArrowLeft', altKey: true },
    );
    expect(last()).toMatchObject({
      chords: ['4 major7', '6 minor', '5 major'],
      progression: '4 major7 - 6 minor - 5 major',
      startingChord: '4 major7',
      startingDegree: '4',
    });
  });

  it('suggests a complexity from the chords, and sets it on a click', () => {
    const { last } = renderEditor(ProgressionFields, {
      ...DREAMS,
      chords: ['6 minor7', '5 dominant7'],
      progression: '6 minor7 - 5 dominant7',
      startingChord: '6 minor7',
    });
    expect(screen.getByText(/Its chords suggest 7th/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use 7th' }));
    expect(last()).toMatchObject({ complexity: '7th' });
    expect(screen.queryByText(/Its chords suggest/)).toBeNull();
  });

  it('says what is wrong with chords the library would refuse', () => {
    renderEditor(ProgressionFields, {
      ...DREAMS,
      chords: ['6 minor'],
      progression: '6 minor',
      chordCount: 1,
    });
    expect(
      screen.getByText(/A progression has 2 to 7 chords; this one has 1/),
    ).toBeTruthy();
    expect(
      screen.getByRole('list', { name: 'Chords' }).getAttribute('aria-invalid'),
    ).toBe('true');
  });
});
