// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetSessionEntitiesForTests } from '../../entities/sessionEntities';
import { ReleaseFields } from '../ReleaseFields';
import {
  type Body,
  clearPicker,
  pick,
  renderEditor,
  seed,
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

const WHATS_GOING_ON: Body = {
  slug: 'marvin-gaye-whats-going-on',
  title: "What's Going On",
  artistIds: ['marvin-gaye'],
  format: 'album',
  year: 1971,
  labelId: 'tamla',
  catalogNumber: 'TS 310',
  externalIds: { discogs: '32486' },
};

describe('ReleaseFields', () => {
  it('renders a stored record without writing anything', () => {
    seed('label', 'tamla', 'Tamla');
    const { onChange } = renderEditor(ReleaseFields, WHATS_GOING_ON);
    expect(screen.getByLabelText('Title')).toHaveProperty(
      'value',
      "What's Going On",
    );
    expect(
      within(screen.getByRole('group', { name: 'Artists' })).getByText(
        'Marvin Gaye',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Format')).toHaveProperty('value', 'album');
    expect(screen.getByRole('button', { name: 'Label' }).textContent).toBe(
      'Tamla',
    );
    // The stored outside id is kept but has no field (owner decision of 30
    // September 2026).
    expect(screen.queryByText('External ids')).toBeNull();
    expect(screen.queryByRole('link', { name: /Open/ })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('patches only the edited field', () => {
    const { last, onChange } = renderEditor(ReleaseFields, WHATS_GOING_ON);
    type(screen.getByLabelText('Year'), '1972');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(last()).toStrictEqual({ ...WHATS_GOING_ON, year: 1972 });
    fireEvent.change(screen.getByLabelText('Format'), {
      target: { value: 'live' },
    });
    expect(last()).toStrictEqual({
      ...WHATS_GOING_ON,
      year: 1972,
      format: 'live',
    });
  });

  it('removes cleared optional fields', async () => {
    const { last } = renderEditor(ReleaseFields, WHATS_GOING_ON);
    type(screen.getByLabelText('Catalogue number'), '   ');
    expect(last()).toStrictEqual(without(WHATS_GOING_ON, 'catalogNumber'));
    type(screen.getByLabelText('Year'), '');
    expect(last()).toStrictEqual(
      without(WHATS_GOING_ON, 'catalogNumber', 'year'),
    );
    seed('label', 'tamla', 'Tamla');
    await clearPicker(screen.getByRole('button', { name: 'Label' }));
    expect(last()).toStrictEqual(
      without(WHATS_GOING_ON, 'catalogNumber', 'year', 'labelId'),
    );
  });

  it('keeps the required artist list, even empty', () => {
    const { last } = renderEditor(ReleaseFields, WHATS_GOING_ON);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Marvin Gaye' }));
    expect(last()).toStrictEqual({ ...WHATS_GOING_ON, artistIds: [] });
    expect(screen.getByText('Needs at least one artist.')).toBeTruthy();
  });

  it('writes bare slugs from the pickers, artists in billing order', async () => {
    seed('label', 'motown', 'Motown');
    const { last } = renderEditor(ReleaseFields, WHATS_GOING_ON);
    await pick(
      within(screen.getByRole('group', { name: 'Artists' })).getByRole(
        'button',
        { name: 'Add artist' },
      ),
      'Stevie Wonder',
      /Stevie Wonder/,
    );
    expect(last()).toStrictEqual({
      ...WHATS_GOING_ON,
      artistIds: ['marvin-gaye', 'stevie-wonder'],
    });

    await pick(
      screen.getByRole('button', { name: 'Label' }),
      'Motown',
      /Motown/,
    );
    expect(last()).toStrictEqual({
      ...WHATS_GOING_ON,
      artistIds: ['marvin-gaye', 'stevie-wonder'],
      labelId: 'motown',
    });
  });

  it('offers a choice rather than inventing a format', () => {
    const body: Body = { slug: 'x', title: 'X', artistIds: [] };
    const { onChange, last } = renderEditor(ReleaseFields, body);
    expect(screen.getByLabelText('Format')).toHaveProperty('value', '');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Format'), {
      target: { value: 'ep' },
    });
    expect(last()).toStrictEqual({ ...body, format: 'ep' });
  });
});
