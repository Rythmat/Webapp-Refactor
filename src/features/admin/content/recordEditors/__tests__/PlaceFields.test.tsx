// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PlaceFields } from '../PlaceFields';
import { type Body, renderEditor, type, without } from './harness';

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
afterEach(cleanup);

const DETROIT: Body = {
  id: 'detroit',
  name: 'Detroit',
  country: 'US',
  subdivision: 'Michigan',
  region: 'north-america',
  coordinates: [42.3314, -83.0458],
  genres: ['Motown', 'Techno', 'Garage Rock'],
  description: 'Home of Motown Records and birthplace of Detroit techno.',
  activeDecades: [1960, 1970, 1980, 1990],
};

describe('PlaceFields', () => {
  it('renders a stored place without writing anything', () => {
    const { onChange } = renderEditor(PlaceFields, DETROIT);
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Detroit');
    expect(screen.getByLabelText('Region')).toHaveProperty(
      'value',
      'north-america',
    );
    expect(screen.getByLabelText('Latitude')).toHaveProperty(
      'value',
      '42.3314',
    );
    expect(screen.getByLabelText('Show it as a pin')).toHaveProperty(
      'checked',
      true,
    );
    const genres = within(screen.getByRole('group', { name: 'Scene genres' }));
    expect(genres.getByText('Techno')).toBeTruthy();
    expect(screen.getByLabelText('1970s')).toHaveProperty('checked', true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('patches only the edited field', () => {
    const { last, onChange } = renderEditor(PlaceFields, DETROIT);
    type(screen.getByLabelText('Country'), 'United States');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(last()).toStrictEqual({ ...DETROIT, country: 'United States' });
    fireEvent.change(screen.getByLabelText('Region'), {
      target: { value: 'central-america' },
    });
    expect(last()).toStrictEqual({
      ...DETROIT,
      country: 'United States',
      region: 'central-america',
    });
  });

  it('writes pin: false to hide the pin, and removes it to show it again', () => {
    const { last } = renderEditor(PlaceFields, DETROIT);
    const pin = screen.getByLabelText('Show it as a pin');
    fireEvent.click(pin);
    expect(last()).toStrictEqual({ ...DETROIT, pin: false });
    fireEvent.click(pin);
    expect(last()).toStrictEqual(DETROIT);
  });

  it('keeps the globe’s required fields when they are cleared', () => {
    const { last } = renderEditor(PlaceFields, DETROIT);
    type(screen.getByLabelText('State or province'), '');
    expect(last()).toStrictEqual({ ...DETROIT, subdivision: '' });
    for (const genre of ['Motown', 'Techno', 'Garage Rock']) {
      fireEvent.click(screen.getByRole('button', { name: `Remove ${genre}` }));
    }
    expect(last()).toStrictEqual({ ...DETROIT, subdivision: '', genres: [] });
  });

  it('removes aliases with the last one', () => {
    const body = { ...DETROIT, aliases: ['Motor City'] };
    const { last } = renderEditor(PlaceFields, body);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Motor City' }));
    expect(last()).toStrictEqual(without(body, 'aliases'));
  });

  it('toggles decades in order, and adds an earlier one by its year', () => {
    const { last } = renderEditor(PlaceFields, DETROIT);
    fireEvent.click(screen.getByLabelText('1950s'));
    expect(last()?.activeDecades).toStrictEqual([1950, 1960, 1970, 1980, 1990]);
    fireEvent.click(screen.getByLabelText('1980s'));
    expect(last()?.activeDecades).toStrictEqual([1950, 1960, 1970, 1990]);
    const earlier = screen.getByLabelText('Add an earlier decade');
    type(earlier, '1848');
    fireEvent.keyDown(earlier, { key: 'Enter' });
    expect(last()?.activeDecades).toStrictEqual([1840, 1950, 1960, 1970, 1990]);
  });

  it('adds a decade where it belongs, moving nothing else', () => {
    // Stored out of order: only the new decade is placed.
    const body = { ...DETROIT, activeDecades: [1970, 1960, 1990] };
    const { last } = renderEditor(PlaceFields, body);
    fireEvent.click(screen.getByLabelText('1980s'));
    expect(last()?.activeDecades).toStrictEqual([1970, 1960, 1980, 1990]);
  });

  it('takes only an earlier year in the earlier-decade box', () => {
    const { onChange } = renderEditor(PlaceFields, DETROIT);
    const earlier = screen.getByLabelText('Add an earlier decade');
    for (const year of ['2035', '5', '1955']) {
      type(earlier, year);
      fireEvent.keyDown(earlier, { key: 'Enter' });
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText(/An earlier decade is a year from 100/),
    ).toBeTruthy();
  });

  it('keeps required coordinates when both are blanked, and says so', () => {
    const { onChange } = renderEditor(PlaceFields, DETROIT);
    type(screen.getByLabelText('Latitude'), '');
    type(screen.getByLabelText('Longitude'), '');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Needs both/)).toBeTruthy();
  });

  it('does not report coordinates typed out to the same numbers', () => {
    const { onChange } = renderEditor(PlaceFields, DETROIT);
    type(screen.getByLabelText('Latitude'), '42.33140');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Latitude')).toHaveProperty(
      'value',
      '42.33140',
    );
  });

  it('flags 0, 0, a new place’s placeholder', () => {
    renderEditor(PlaceFields, { ...DETROIT, coordinates: [0, 0] });
    expect(
      screen.getByText('0, 0 is not a place — set its coordinates.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Latitude').getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('says which scene genres the graph cannot place, not only on hover', () => {
    renderEditor(PlaceFields, {
      ...DETROIT,
      genres: ['Techno', 'Not A Real Sound'],
    });
    const unplaced = screen.getByText('Not A Real Sound');
    expect(unplaced.getAttribute('title')).toMatch(/Not in the genre table/);
    expect(unplaced.textContent).toMatch(/· unlinked/);
    expect(unplaced.textContent).toMatch(/connected to nothing/);
    const techno = screen.getByText('Techno');
    expect(techno.getAttribute('title')).toMatch(/^Filed under/);
    expect(techno.textContent).not.toMatch(/unlinked/);
    expect(techno.textContent).toMatch(/Filed under/);
  });
});
