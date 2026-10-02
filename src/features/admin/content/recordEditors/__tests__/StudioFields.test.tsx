// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetSessionEntitiesForTests } from '../../entities/sessionEntities';
import { StudioFields } from '../StudioFields';
import {
  type Body,
  clearPicker,
  pick,
  renderEditor,
  type,
  without,
} from './harness';

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

const HITSVILLE: Body = {
  slug: 'hitsville-usa',
  name: 'Hitsville U.S.A.',
  aliases: ['Studio A'],
  placeId: 'detroit',
  openedYear: 1959,
  closedYear: 1972,
};

describe('StudioFields', () => {
  it('renders a stored studio without writing anything', () => {
    const { onChange } = renderEditor(StudioFields, HITSVILLE);
    expect(screen.getByLabelText('Name')).toHaveProperty(
      'value',
      'Hitsville U.S.A.',
    );
    expect(screen.getByText('Studio A')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'City' }).textContent).toBe(
      'Detroit',
    );
    expect(screen.getByLabelText('Opened')).toHaveProperty('value', '1959');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('patches only the edited field', () => {
    const { last, onChange } = renderEditor(StudioFields, HITSVILLE);
    type(screen.getByLabelText('Description'), 'Motown’s first studio.');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(last()).toStrictEqual({
      ...HITSVILLE,
      description: 'Motown’s first studio.',
    });
  });

  it('adds an alias, and removes the key with the last one', () => {
    const { last } = renderEditor(StudioFields, HITSVILLE);
    const input = screen.getByLabelText('Add alias');
    type(input, 'Motown Studio A');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(last()).toStrictEqual({
      ...HITSVILLE,
      aliases: ['Studio A', 'Motown Studio A'],
    });
    // The same spelling again is not added twice.
    type(input, 'studio a');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(last()?.aliases).toStrictEqual(['Studio A', 'Motown Studio A']);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Studio A' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Motown Studio A' }),
    );
    expect(last()).toStrictEqual(without(HITSVILLE, 'aliases'));
  });

  it('takes one alias per Backspace, never a held key’s repeats', () => {
    const body = { ...HITSVILLE, aliases: ['Studio A', 'Snakepit'] };
    const { last, onChange } = renderEditor(StudioFields, body);
    const input = screen.getByLabelText('Add alias');
    // Clearing a typo with the key held: the repeats stop at the empty box.
    type(input, 'x');
    fireEvent.keyDown(input, { key: 'Backspace' });
    type(input, '');
    fireEvent.keyDown(input, { key: 'Backspace', repeat: true });
    fireEvent.keyDown(input, { key: 'Backspace', repeat: true });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(last()).toStrictEqual({ ...HITSVILLE, aliases: ['Studio A'] });
  });

  it('writes coordinates only as a pair, and removes them when blanked', () => {
    const { last, onChange } = renderEditor(StudioFields, HITSVILLE);
    type(screen.getByLabelText('Latitude'), '42.364');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Needs both/)).toBeTruthy();
    type(screen.getByLabelText('Longitude'), '-83.088');
    expect(last()).toStrictEqual({
      ...HITSVILLE,
      coordinates: [42.364, -83.088],
    });

    type(screen.getByLabelText('Latitude'), '');
    type(screen.getByLabelText('Longitude'), '');
    expect(last()).toStrictEqual(HITSVILLE);
  });

  it('removes a cleared year and a cleared town', async () => {
    const { last } = renderEditor(StudioFields, HITSVILLE);
    type(screen.getByLabelText('Closed'), '');
    expect(last()).toStrictEqual(without(HITSVILLE, 'closedYear'));
    await clearPicker(screen.getByRole('button', { name: 'City' }));
    expect(last()).toStrictEqual(without(HITSVILLE, 'closedYear', 'placeId'));
    expect(screen.getByText('Needs the city it is in.')).toBeTruthy();
  });

  it('writes the town as a bare place slug', async () => {
    const { last } = renderEditor(StudioFields, HITSVILLE);
    await pick(
      screen.getByRole('button', { name: 'City' }),
      'Los Angeles',
      /Los Angeles/,
    );
    expect(last()).toStrictEqual({ ...HITSVILLE, placeId: 'los-angeles' });
  });

  it('flags a studio that closed before it opened', () => {
    renderEditor(StudioFields, HITSVILLE);
    type(screen.getByLabelText('Closed'), '1950');
    expect(screen.getByText('Closed before it opened.')).toBeTruthy();
  });
});
